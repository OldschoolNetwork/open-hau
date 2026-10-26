# Exchange formats

The published 26.1 preview uses version 1. The 26.2 development branch uses
version 2 and accepts validated version 1 files through an explicit migration.
Migration preserves existing accounting sections and adds empty `meters` and
`meter_values` arrays; it does not invent physical readings from billed quantities.
Loading does not rewrite the source exchange file. Native saving backs up an
existing working database before storing the migrated project.

Version 2 adds individual/shared meter identities, serial numbers, installation
and retirement dates, initial values, and dated initial/regular/final readings.
Shared-meter allocation is not implemented yet. Several individual meters may
contribute to one service; incomplete or decreasing readings produce a warning.
An explicit billed-quantity override remains separate from physical consumption.
Meter units must match the service unit before automatic billing. Common cubic
metre spellings are equivalent; different quantities such as kWh and cubic metres
are never added or converted implicitly. A meter retired during the billing month
still requires its final reading so replacement does not omit its consumption.

The descriptions below document the common version 1 sections. The fictional
`examples/demo.openhau.json` remains a version 1 compatibility fixture.

`*.openhau.json` is indented UTF-8 JSON. The machine-readable schema is
`openhau.schema.json` for version 1 and `openhau-v2.schema.json` for version 2;
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

Tariffs start on a month's first day. Common-consumption allocation is manual
in the preview. Closed snapshots retain historical values rather than silently
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

An arbitrary SDF cannot be imported merely by renaming it. SQL Server Compact
describes a storage format, not a common accounting schema. A converter must
identify tables, references, date semantics, movements and unsupported entities;
then validate the target and reconcile balances. Keep unmapped original records
in a separate private archive. Never treat inferred field mappings as confirmed.
