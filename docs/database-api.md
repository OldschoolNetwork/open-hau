# Local database API

The local API runs from the source checkout with Node.js 24 and the project's
installed dependencies. It does not start a web server or send database records
over the network. A standalone executable API is not yet included in the desktop
preview.

Run `npm run database-api -- help` for methods. For an AI tool, use
`node --import tsx tools/database-api.ts stdio` as the command. Each stdin line is
a JSON-RPC 2.0 request with an id, method and params; each stdout line is a response.
Do not parse npm's startup banner as a protocol response: use the direct Node
command for stdio clients.

Methods:

- `docs.list`, `docs.read` with `name`: read the bundled API, account or group
  payment documentation.
- `database.inspect` with `path`: return record counts and a SHA-256 revision.
- `database.read` with `path`: return the validated full project and revision.
- `database.validate` with `path`: validate the complete project.
- `database.patch` with `path`, `revision`, `operations`: apply JSON Pointer
  add/replace/remove operations to editable sections. A revision conflict fails
  without changing the database. A backup is created before replacement.
- `database.mergeHistory` with `path`, `source`, `output`: add missing account,
  resident, meter and group-payment history and reference records into a new
  file. Existing base records win conflicts, which are listed in a separate
  report. Financial sections, organization details and settings remain those of
  the base file. Conflicting imported payment relationships fail full validation.

Example request:

```json
{"jsonrpc":"2.0","id":1,"method":"database.inspect","params":{"path":"D:/Accounting/example.openhau.json"}}
```

Example patch params, using the actual revision from inspect/read:

```json
{"path":"D:/Accounting/example.openhau.json","revision":"<current SHA-256>","operations":[{"op":"replace","path":"/organization/name","value":"Example Association"}]}
```

Close the GUI database before writing from the API. Reopen it afterwards. API
writes share the native file-save lock and use their own writer lock, validated
staging and a retained backup. Operations validate stored data; a schema-valid
patch is not an independent accounting audit. Use document workflows for posting
business operations rather than manually inventing payment allocations.

Full reads and merge reports may contain private data. Keep them local and grant
an AI access only to the intended files. Encrypted databases are not supported by
this API version. No password or recovery interface is claimed here.
