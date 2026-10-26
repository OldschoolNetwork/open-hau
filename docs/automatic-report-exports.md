# Automatic report exports in 26.2 development

The installed application can export the current month's account balance report
to a chosen folder. Enable it in Settings, select the formats and trigger, then
apply the settings. The default is disabled. Folder preferences belong to the
current computer and are not included in project JSON.

Available formats are CSV, SpreadsheetML XML and self-contained printable HTML.
XML is an `.xml` workbook, not XLSX. PDF uses the print dialog; automatic creation
of PDF files without a dialog is not implemented. XLSX and ODS remain planned.

Choose either successful month closing or each successful database save. The
save trigger also includes closing a month. Export now runs the same report
manually after pending database changes have been saved. Timed schedules and
exports while the application is closed are not implemented.

Exports use the project language, current accounting month and preserved closed
history. Incomplete data is marked in the report. A generated report is not a
complete database backup.

Each changed batch receives a new folder. Files are written with a `.partial`
suffix, read back for comparison, and renamed on success. A `complete.json`
marker identifies a completed batch. Existing report revisions are retained.
If the latest batch for that destination and period exactly matches the newly
generated contents, it is reused instead of duplicated. Removing an exported
file causes a new batch to be generated on the next applicable trigger.

A failed export produces a visible warning separately from the successful
database save. The destination is not silently recreated when unavailable.
Reconnect it and use Export now. Keep these files private: reports contain
account and financial details.
