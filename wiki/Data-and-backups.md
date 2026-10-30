# Database files, protection and backups

## Save to the selected file

The current portable format is ODB, based on JSON. An ODB database contains
organisation details, accounts, records and settings. Open an existing file
through Add existing; Save writes back to that selected file.

Use Save as for a separate working copy. Removing an entry from the welcome
screen removes it from the list and does not delete the file on disk.

## Backups

The application retains safety backups before replacing an existing database.
Optional backup copies can be configured to a chosen location. Keep an
independent copy on another device or storage location as well.

## Password protection

Set a database password in Settings → Database protection. Locking a protected
database requires unlocking it before use. The password belongs to that database,
not to every database listed in the application. Keep the password safe: access to a protected database requires it.

## Versions and transfer

Save and close the application before moving the ODB file. Open it on the other
computer with a compatible application version. Newer versions migrate older
supported formats; older versions can refuse newer schemas.

PDF, HTML and CSV are document exports and cannot restore the full database.
The local API supports inspection and validated edits to the full database.

## External databases

Legacy conversions require a format-specific mapping and reconciliation of
recorded readings, balances and payments. Preserve the source and compare the
converted records before using the result. Do not assume any arbitrary SDF
file shares the same structure as a supported conversion profile.

[Local API](API)
