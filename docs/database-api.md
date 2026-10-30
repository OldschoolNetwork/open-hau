# Local database API

The optional API companion provides a local JSON-RPC 2.0 interface over standard
input/output. It does not start a network service. The desktop application does
not require Node.js; the separate API companion requires Node.js 24.7 or newer.

## Start

In the API package directory, run:

```sh
node OpenHaU-API.mjs stdio
```

From a source checkout, run:

```sh
node --import tsx tools/database-api.ts stdio
```

Each request and response occupies one JSON line. Responses preserve the request
ID. Use the direct Node command for protocol clients; npm can print a startup
banner that is not a JSON-RPC response.

## Discover commands and sections

- `help`: methods and writing rules.
- `docs.list`: available bundled documents.
- `docs.read`, `name`: read a listed document.
- `menu.list`, optional `language`: menu identifiers, labels and UI action names.
- `database.schema`: normalized project JSON Schema. Cross-record validation also
  runs on every write.
- `database.inspect`, `path`, optional `password`: revision and record counts.
- `database.sections`, `path`: stored section names, kinds and counts.
- `database.query`, `path`, `pointer`, optional `where`, `offset`, `limit`:
  read one value or a page of a collection. Equality conditions use row fields;
  this is not an executable query language. The maximum page size is 1000.
- `database.read`, `path`: the complete validated project and revision. It can
  contain private information.
- `database.validate`, `path`: complete project validation.

Examples:

```json
{"jsonrpc":"2.0","id":1,"method":"database.inspect","params":{"path":"D:/Accounting/example.odb"}}
{"jsonrpc":"2.0","id":2,"method":"database.query","params":{"path":"D:/Accounting/example.odb","pointer":"/meters","where":{"scope":"individual"},"limit":100}}
{"jsonrpc":"2.0","id":3,"method":"menu.list","params":{"language":"en"}}
```

| UI area | Database section |
| --- | --- |
| Organization and preferences | `/organization`, `/settings` |
| Personal accounts | `/accounts`, `/account_documents`, `/account_history` |
| Service definitions and tariffs | `/services`, `/tariffs`, `/tariff_documents` |
| Individual and shared meters | `/meters`, `/meter_values`, `/meter_documents` |
| Shared allocation and exceptions | `/shared_groups` |
| Monthly waste resident counts | `/monthly_occupancy` |
| Payments and batch documents | `/payments`, `/payment_batches`, `/service_accounting` |
| Benefits, charges and recalculation | `/administration` |
| Reference catalogs | `/reference_catalogs` |
| Receipt layouts, logos and designer | `/settings/receipt_canvas`, `/settings/organization_logos` |
| Payment due dates | `/payment_deadlines` |
| Cash, bank accounts and funds | `/treasury` |

## Write validated fields

Close the GUI database before writing. Read the current SHA-256 revision with
inspect/read, then send `database.patch` with `path`, `revision` and `operations`.
A stale revision is rejected. Every successful write retains the previous file
as a backup and validates the entire project before replacement.

```json
{"jsonrpc":"2.0","id":4,"method":"database.patch","params":{"path":"D:/Accounting/example.odb","revision":"CURRENT_SHA256","operations":[{"op":"replace","path":"/organization/name","value":"Example Housing Association"}]}}
```

Patch operations are JSON Pointer add/replace/remove operations. Preserve string
identifiers and decimal-string monetary values. Use domain documents for posting
accounting changes rather than constructing snapshots or allocations manually.

## Apply documents

`document.new` returns an administration document draft for `kind`. With
`collection: "accounts"`, it returns an account document and accepts an optional
`accountId`. Complete and review the draft before posting.

`database.apply` accepts `path`, `revision` and an `actions` array. Supported types:

- `administration.save`: `document`, `post`; includes benefits, termination,
  building services, citizen changes, charges, penalties and recalculation.
- `administration.unpost`: `id`.
- `account.save`: `document`, `post`; `account.unpost`: `id`.
- `meter.save`: `document`, `post`.
- `payment.save`: `document`, `post`; `payment.unpost`: `id`.
- `tariff.save`: `document`, `post`.
- `period.close`, `period.reopen`, `period.rollback`: `period`.

The complete action batch is prepared in memory, validated and committed once.
A failed later action leaves the original file unchanged. GUI and API posting use
the same domain functions and closed-period/dependency restrictions.

## Reports

`report.generate` accepts `path`, `kind` and date parameters. Supported kinds are
`receipts` with `period` and optional `accountIds`, `account-balance`,
`account-ledger`, `beneficiaries`, `beneficiary-register` and `residential-list`.
The latter reports use `from` and `to`. The result contains standalone HTML, or
writes it to a new `output` file when provided. Existing outputs are not replaced.
Desktop PDF and printer rendering are separate from this console HTML export.

## Password-protected databases

The API uses the same Argon2id/AES-256-GCM envelope as the desktop application.
Supply `password` through a stdio request for each protected-file operation.
Passwords in command-line arguments are rejected, and no password cache is kept.
Do not save password-bearing requests to shell history or share them as logs.

`database.password` requires `path`, `revision`, optional current `password`, and
`newPassword`. An empty new password removes encryption. Its backup retains the
previous file format: a copy made before protection can still be unencrypted.
Password recovery and biometric unlocking are not implemented.

## Legacy import

`database.mergeHistory` accepts `path`, `source` and a new `output` file. Existing
base records win conflicts; a report lists conflicts. It preserves the base
financial sections and settings.

`database.importLegacyJournals` accepts `path`, `rawDirectory` and a new `output`.
It reads previously exported legacy tables and adds read-only journal entries,
without replaying transactions. It does not directly open SDF files. Legacy
merge/import currently require an unencrypted working copy.

Both operations reject an existing output and check that the input did not change.
Import reports may contain private data. Keep them outside public repositories.

## Extending the API

`translations.list` accepts `path`, `locale` and optional `content` (default
`true`). It returns the file revision and data translation rows. Set `content`
to `false` to list the interface dictionary.

`translations.set` requires `path`, `revision`, `locale` and an `entries` object
mapping translation keys to text. Content keys have the form
`services/<id>/name`, `references/<catalog>/<id>/name`,
`references/<catalog>/<id>/notes`, `settings/receipt_title` or
`settings/receipt_footer`. With `content: false`, keys are interface source
phrases. Empty optional translations fall back to the original text. Required
Russian and Romanian source names are preserved when an empty value is supplied.
Translation writes use the same validation, revision check and backup as other
database writes. Amounts, identifiers and posted accounting history are unchanged.

New database fields are exposed through schema, query and validated patch.
New accounting operations must also be registered in database.apply, documented
here and covered by an atomic-write or domain regression test.

## Receipt content through the API

Use `database.patch` with the current file revision to update
`/settings/receipt_content`. For example, replace that object with
`{"services":["water","electricity"],"labels":"service","dates":false}`
for a database whose service IDs are `water` and `electricity`. Missing flags
receive normal defaults. Use the IDs from `database.query`, not translated names.
`types` selects meter-type IDs; `excluded_meters` excludes individual rows.
Setting `services` to `[]` removes the readings table. Optional columns and
sections are documented in the data-format reference. Receipt generation through
`report.generate` uses the same stored choices as desktop preview, PDF and print.
These settings never remove charge lines or alter accounting totals.
