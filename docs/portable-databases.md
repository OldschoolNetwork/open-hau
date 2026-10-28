# Portable database files

A desktop database can be a standalone UTF-8 `.openhau.json` file. It contains
the organization, accounts, settings, reference catalogs and accounting history.
The database remains editable with standard JSON tools.

Choose **Add existing** or **File > Open database** to open a file directly.
**Save** writes changes to that same file. The recent database list stores its
location; it does not contain a separate copy of its contents. Moving the file
requires opening its new location again.

**Save database as** creates a new file and switches to it. This also makes an
existing internal preview database portable. Choose a new filename: this command
does not replace an existing file. **Import a JSON copy** remains a separate
operation that creates an independent internal database.

Before moving to another computer, apply changes in document editors, save, and
close the application. Copy the database file and open it on the other computer.
The executable and the recent database list are not required to carry the data.
Opening a database with an older application is supported only when that
application understands its schema. Preserve a backup before upgrading.

Saving stages the new contents, preserves the previous file as a timestamped
backup, and replaces the original. Unchanged saves do not create duplicate
backups. External backup destinations are optional. If another application has
changed the file since it was opened, saving is refused to prevent overwriting
those changes. Export the unsaved working state separately before reopening.

Windows uses a small adjacent `.openhau-lock` sidecar to serialize saves. It
contains no database records and does not need to be copied to another computer.
Keep independent backups; a portable file is not a multi-user synchronization
service.

The current file size limit is 64 MiB. Native file save dialogs and the portable
save path are separate from the browser preview's local storage.

Use the trash icon in the database welcome screen to remove an entry from the recent list. This does not delete or modify the database file or an internal preview database. Automatic opening is cleared when its entry is removed. A linked file can be added again from its existing location. The compact welcome window has a fixed size; its list scrolls vertically.

