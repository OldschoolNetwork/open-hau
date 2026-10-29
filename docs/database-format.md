# OpenHaU database files

New portable databases use the `.odb` extension. The contents remain a UTF-8 JSON document with `format: "openhau"` and a numeric `schema_version`; renaming a file does not change its data or schema version. The extension is not an encryption mechanism.

Use **File → Save database as** to create an `.odb` copy of an existing database. The original file is retained. Existing `.openhau.json` and `.json` databases remain supported, and saving an existing database keeps its selected path. JSON export remains available for other tools.

The application validates the contents before opening a file. OpenHaU `.odb` files are different from LibreOffice Base documents, which also use `.odb`. LibreOffice Base documents cannot be opened or converted by changing the extension.

The Windows installer declares OpenHaU as an available handler for `.odb` with the application icon. A portable executable does not register file associations on its own. A file path can also be passed as the executable's first argument. Existing default application choices remain controlled by the operating system.

Files can be inspected with a text editor or the database CLI. Close the database in the application before modifying it externally, keep a backup, and validate the complete document before saving. A newer application can migrate supported older schemas; older applications must reject unsupported newer schemas without rewriting them.
