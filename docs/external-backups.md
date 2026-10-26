# External backups in 26.2 development

In the installed application, open Settings and choose an existing destination
folder in the backup panel. This enables a separate full database copy after
each successful save. Use the disable button to stop future copies; existing
copies are retained. Nothing is deleted automatically.

The destination is a setting for the current device. It is not included in the
portable project JSON and does not change a different computer's backup folder.
The browser preview does not offer filesystem backup controls.

Each attempt owns a new dated folder, using a UTC timestamp. A consistent SQLite
backup is first written with a `.partial` suffix, checked for database integrity,
and compared against the saved project sections. Only then is it named
`openhau.sqlite`. Existing backup folders and files are never replaced.

Manual copying includes the saved database. Save pending edits first. If a chosen
external drive or network folder is unavailable, the application does not recreate
it elsewhere. A visible warning reports that the external copy failed while the
working database save remains successful. Reconnect the destination and create a
new copy. An unsuccessful attempt may leave a `.partial` file; do not use it as
a verified backup.

SQLite copies include the full saved project, unlike CSV or printed reports.
Keep copies private. A folder on the same disk does not protect against loss of
that disk; choose an appropriate independent destination for that purpose.

Restoration is covered by an isolated storage regression test. A guided restore
interface and native platform acceptance checks remain development work. Do not
replace a working database while the application is open.
