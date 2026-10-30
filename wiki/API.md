# Local API

The optional OpenHaU API package provides command-line and JSON-RPC access to
database documentation, sections, queries, translations, reports and validated
edits. It requires Node.js 24.7 or later.

## Inspect a database

```sh
node OpenHaU-API.mjs database.inspect '{"path":"example.odb"}'
```

For Windows PowerShell, use the JSON-RPC stdio mode to avoid shell quoting issues.
Close the database in the graphical application before writing through the API.

## JSON-RPC

```sh
node OpenHaU-API.mjs stdio
```

Send one JSON request per line:

```json
{"jsonrpc":"2.0","id":1,"method":"database.sections","params":{"path":"example.odb"}}
{"jsonrpc":"2.0","id":2,"method":"database.query","params":{"path":"example.odb","pointer":"/accounts","sort":[{"field":"number","direction":"asc"}],"limit":100}}
```

Omit sort or pass an empty array for the stored order. Multiple sort fields
are applied in the supplied priority order before pagination.

## Writes

Read the current revision before a patch. Writes validate the complete database,
reject a changed revision and retain a backup. Passwords are accepted through
stdio rather than command-line arguments. Keep real resident records and
credentials out of public examples and logs.

[Complete API reference](https://github.com/OldschoolNetwork/open-hau/blob/main/docs/database-api.md)

[User guide](Home)
