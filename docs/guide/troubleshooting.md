# Troubleshooting

## A receipt is marked as a draft

Check the selected month’s readings, tariffs, shared allocations and historical
opening data. A previous month can be complete while the current month is not.
Missing values are not automatically converted to zero.

## A recent-database card has an old name

Current versions read the organisation name from an available database. A locked
or unavailable file can retain its cached name until it can be read. Check that
the listed file path is the database you intended to open.

## Save conflicts

Do not write the same file from the application and API at the same time.
If the file changed elsewhere, reopen it and review the latest data before
saving again. An unsaved-changes prompt offers save, discard or cancel.

## macOS first launch

Copy the application to Applications before starting it. For a package downloaded
from the official release, use macOS’s application-specific approval if requested.
The local signature does not replace Apple notarization. Report the exact error
and macOS version if approval does not resolve the launch problem.

## Reports and printing

Generate the report first. Use Save PDF for a PDF file or Print for printer output.
For receipts, check the selected paper layout and orientation. Verify the printer’s
colour and scaling settings when paper output differs from the preview.

## Requesting help

Include the application version, operating system, steps and exact error.
Remove private resident and financial information from screenshots and files.

[Project issues](https://github.com/OldschoolNetwork/open-hau/issues)

[User guide](index.md)
