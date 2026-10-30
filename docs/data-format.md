# Exchange formats

The published 26.1 preview uses schema version 1. Current 26.2 development
uses schema version 4 and validates and migrates version 1, 2 and 3 files in memory.
Version 1 migration adds empty `meters` and `meter_values` arrays; version 3
adds an empty administration journal. Existing accounting records are preserved.
Loading does not rewrite the source file. Native saving backs up an existing
working database before storing the migrated project. Older applications that do
not support version 4 must reject it instead of rewriting it.

New database files use `.odb`. Unprotected files contain indented UTF-8 JSON with
`format: "openhau"`. Existing `.json` and `.openhau.json` files are supported.
The extension does not imply encryption or compatibility with LibreOffice Base.
Protected files use the encrypted envelope described below.

Version 4 adds receipt page size, orientation and cutting guides, a reusable logo
library with optional SVG tinting, editable receipt canvas layers and element
styles, and custom language packs. These settings travel with the database.
Migration preserves financial records, meter history and existing settings.

## Password protection

Protected files contain a JSON envelope with `format: "openhau-encrypted"`,
`version: 1`, `cipher: "aes-256-gcm"` and
`kdf: "argon2id-v19-m65536-t3-p1"`. The salt (16 bytes), nonce (12 bytes) and
authenticated ciphertext are Base64-encoded. The key is derived with Argon2id
using 64 MiB of memory, three iterations and one lane. The authenticated data is
the UTF-8 string `OpenHaU encrypted database v1`. The decrypted payload uses the
normal project schema; envelope version and project schema version are distinct.

The application keeps an unlocked key only for the session. Locking the database
forgets cached keys. Encryption does not alter earlier backups. The safety copy
created when a password is first installed retains the original unencrypted
format. Keep such copies in a protected location. Password recovery and biometric
unlocking are not implemented.

Version 2 adds individual/shared meter identities, serial numbers, installation
and retirement dates, initial values, and dated initial/regular/final readings.
Shared-meter allocation supports equal shares across eligible accounts, with dated connections and monthly exceptions. Several individual meters may
contribute to one service; incomplete or decreasing readings produce a warning.
An explicit billed-quantity override remains separate from physical consumption.
Meter units must match the service unit before automatic billing. Common cubic
metre spellings are equivalent; different quantities such as kWh and cubic metres
are never added or converted implicitly. A meter retired during the billing month
still requires its final reading so replacement does not omit its consumption.

The descriptions below document the common version 1 sections. The fictional
`examples/demo.openhau.json` remains a version 1 compatibility fixture.

Version 2 development also includes optional-at-import `monthly_occupancy`,
`shared_groups` and `payment_deadlines` arrays, normalized to empty arrays for
older projects. They record dated resident counts, shared meter connections and
monthly exceptions, and due-date overrides. Receipt settings include additional
designs, custom appearance controls and English labels. English names are optional.
The version 4 machine-readable schema describes current normalized exports.

`tariff_documents` defaults to an empty array when absent. It stores document
numbers, dates, comments, draft/applied state and service-rate rows. Applied rows
reference entries in `tariffs`; relational validation checks that they match.
`shared_groups[].difference_service_id` is optional and selects an independent
billing service for allocated differences; an omitted or empty value retains
base-service billing.

`treasury` defaults to empty wallet, fund and transaction arrays with no ledger
lock. It stores confirmed cash/bank opening balances, earmarked funds and dated
income/expense/transfers. Resident-payment links are explicit and their exact sum
is validated; the same payment cannot belong to two income entries. Treasury
records do not replace or automatically change resident financial records.

`*.openhau.json` is indented UTF-8 JSON. The machine-readable schema is
`openhau.schema.json` for version 1, `openhau-v2.schema.json` for version 2 and
`openhau-v3.schema.json` for version 3 and `openhau-v4.schema.json` for version 4;
additional relational checks are implemented in
`src/model.ts`. `examples/demo.openhau.json` contains only fictional records.

## Sections

- `format: "openhau"`, `schema_version: 1`, `currency: "MDL"`, and `demo`.
- `organization`: association identity and bank details.
- `settings`: languages, appearance, receipt controls, embedded logo and configurations.
- `accounts`: identifiers, apartments, area, opening balances and connected services.
- `services`, `tariffs`: service definitions and dated tariffs.
- `meter_readings`: previous/current values for an account, service and month.
- `quantities`: explicit monthly quantity overrides.
- `payments`: amount, payment date and separate entry date.
- `adjustments`: signed monthly adjustments.
- `closed_periods`, `snapshots`: closed months and preserved charge lines.
- `template_manifest`: reserved; must be empty in this preview.

IDs use ASCII letters, digits, hyphens and underscores. Dates are `YYYY-MM-DD`;
periods are `YYYY-MM`. Account numbers and bank identifiers remain strings.
Money, area, tariffs and readings are decimal strings using a dot, without
exponents, with at most 16 digits on either side of the decimal point.
Saved monetary totals have exactly two decimal places.

Logos are embedded image data URLs for SVG/PNG/JPEG/WebP. The full JSON includes
receipt configurations and does not depend on an external logo file. Uploaded
SVG is sanitized before use.

## Calculations

A service line is quantity × tariff, rounded to two decimal places.
Charges sum rounded lines and adjustments. Half up is the default; half even
can be selected.

Opening balance equals the account's initial balance plus prior closed charge
snapshots minus earlier payments after the opening date. Closing balance adds
current charges and subtracts current payments. Missing history or readings
produce warnings and prevent closing.

Tariffs start on a month's first day. Shared consumption differences are distributed equally among eligible accounts; monthly exclusions change the eligible count. Closed snapshots retain historical values rather than silently
recalculating them.

## Validation and import

Import replaces the project, not individual records. Review counts and full JSON
before applying. The validator checks dates, decimals, duplicate identifiers,
references and snapshot sums. The current project is saved before replacement;
native saving uses a transaction and a consistent backup of a nonempty database.

Unknown top-level fields and schema versions are rejected. Extra account
metadata can be stored in `accounts[].custom_fields` as string values.
The entire indented export, including images and configurations, is limited to
20 MB.

New application versions must read older schemas through explicit migrations.
Older applications are not required to understand newer schemas and must refuse
unsafe writes. Preserve an independent backup before migration.

## SQLite and CSV

The working SQLite database uses `project_sections` for JSON sections and
`save_log` for saves. It is standard SQLite, but not a normalized table-per-entity
accounting database. Do not edit it while OpenHaU is running; use validated JSON
exchange for supported manual edits.

CSV is a monthly summary using semicolons and UTF-8 BOM. Potential spreadsheet
formulas are escaped. Import account numbers as text to preserve leading zeros.
CSV is not a full backup.

## Legacy conversion

Version 2 also supports `service_accounting`: `opening` rows identify an account,
service and signed amount; `payments` rows identify a payment, service and signed
amount; `adjustments` rows identify an account, month, service and signed amount.
Missing sections default to empty arrays. Unclassified remainders stay visible.
Payment shares are unique per payment/service; their net cannot exceed the receipt
or be negative. The payment editor requires an exact total for newly saved payments.
Optional payment fields `allocation_basis`, `allocation_balancing_service_id` and
`allocation_manual_amount` retain the basis of newly calculated splits. The optional
setting `payment_balancing_service_id` remembers the chosen maintenance service.
See [service accounting](service-accounting.md) for calculation and export behavior.

An arbitrary SDF cannot be imported merely by renaming it. SQL Server Compact
describes a storage format, not a common accounting schema. A converter must
identify tables, references, date semantics, movements and unsupported entities;
then validate the target and reconcile balances. Keep unmapped original records
in a separate private archive. Never treat inferred field mappings as confirmed.


## Version 3 administration documents

`administration.documents` stores draft and applied building-service, citizen,
benefit, charge, recalculation, correction and penalty documents. New applied
documents retain before/after audit states. Changes are prepared atomically and
validated before application; undo rejects changed data, dependent documents and
closed periods. Partial account calculations do not close the entire month.

`administration.benefit_allocations` records the calculated benefit amount by
account, service and month, separately from manual adjustments. It prevents
recalculation and month closing from allocating the same benefit twice.
See [benefits and recalculation](administration.md) for the supported rules.

Imported legacy journal entries are explicitly `imported: true`. Most legacy journals remain read-only; group payment documents support guarded unposting and editing in open periods. Their optional `source_snapshot` retains the original document as JSON.
They preserve source document identity and status without reposting transactions.
Importing journal headers does not recreate missing source calculation rules or
replace preserved historical financial sections.

## Receipt content selection

`settings.receipt_content` stores optional section flags (`logo`, `address`,
`bank`, `deadline`, `footer`, `stub`) and meter table options (`readings`,
`serial`, `dates`, `previous`, `current`, `consumption`, `note`). Flags default
to true. `labels` is `service` (default), `meter` or `none`.

`services` and `types` are nullable ID arrays. Null includes all; an empty array
includes none. A type ID of an empty string represents untyped/legacy readings.
`excluded_meters` contains physical meter IDs or stable legacy row keys of the
form `legacy:<account-id>:<service-id>`. Exclusions change display only.
No selected rows or no selected columns means no readings table or heading.
Organization, payer, account number, billing period, charge lines and totals
remain part of the receipt. Saved appearance presets can include `content`.
Older projects receive defaults without changing their accounting records.
