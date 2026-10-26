# Saving, backups and transfer

## Desktop database

Save after changes using the disk control or Ctrl+S / Cmd+S. Applying an edit form
does not mean it has been written to disk. Complete pending reading edits first.

The desktop application stores openhau.sqlite in its application data directory,
shown in settings. Before saving a nonempty database, SQLite Backup API creates
a consistent copy in backups. The first save cannot back up a nonexistent database.
Copies are not automatically pruned.

A backup on the same disk does not protect against disk failure. Keep independent
exports elsewhere. The application does not encrypt SQLite or JSON; secure the
device and backup storage.

## Full JSON export

Export JSON from settings. The *.openhau.json file contains the organisation,
accounts, services, tariffs, readings, payments, adjustments, closed charge
snapshots and settings, including logos and configurations. The size limit is
20 MB.

The UTF-8 format can be edited in a text editor or processed by other tools.
Money and quantities are decimal strings such as "125.50". Preserve identifiers
and references. A technical schema and fictional example are published in the
repository.

Do not send actual resident records to external AI or other services without
appropriate permission and data handling arrangements. A fictional or anonymized
example is usually enough for troubleshooting.

## Import and computer-to-computer transfer

1. Apply pending input, save and export full JSON on the source computer.
2. Save and separately export any existing project on the destination.
3. Select the validated JSON import action and the file.
4. Check warnings, record counts and complete JSON before confirming. Equal counts do not mean equal contents.
5. Apply the import, save, reopen and verify accounts, balances and receipts.

Import replaces the entire project; it does not merge databases. CSV is only a
summary. Neither CSV, PDF nor HTML can restore the complete project.

## Restoring a SQLite backup

Close OpenHaU completely. Preserve the current database and backups separately
before replacing anything. Restore a selected SQLite copy only while the
application is closed. If WAL/SHM files are present or the failure is unclear,
request help first rather than mixing database files.

## Version compatibility

New application versions must support older database formats through explicit
validated migrations. A backup is required before upgrading the format.
Older applications may reject newer formats; they must not silently overwrite
them. The current exchange format is schema version 1.

## Browser preview

The development browser preview uses localStorage, not the desktop SQLite
database. Clearing browser data can remove that preview project. Use the desktop
application and independent backups for accounting.

[User guide](Home)
