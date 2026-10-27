# Balance and payment reports

Service balances open as a summary with one row per service. Select grouping by
service, service type, or service type and service. Enable account detail to show
individual account rows; addresses are optional in that view. Service types and
providers come from service records. Missing types remain explicitly unclassified.

Account, service and service-type filters offer equality, inequality, inclusion
and exclusion. The ellipsis opens a searchable selection window. List conditions
allow multiple selections. Settings also provide supplier filtering and ordered
sorting rules. Summary totals reflect the selected records, including signed
credits. Unallocated historical amounts remain visible as their own category.

Generate creates the preview. Changing report options invalidates that preview;
generate again before printing. Print opens the system print dialog. Save PDF is
a separate action using direct PDF generation in the Windows desktop build.
Direct PDF generation on macOS is not implemented in this development stage.

XLSX is a native OOXML workbook, with padded content-based column widths, bold
shaded headers, frozen headings and numeric money cells. Account identifiers stay
text, preserving leading zeroes. CSV is a plain data interchange format and cannot
store column widths or styling. HTML remains available as a separate format.
Legacy automatic XML exports remain SpreadsheetML, not XLSX.

Reports with incomplete readings or allocation history are marked preliminary.
Grouping changes presentation only; it does not recalculate or overwrite archived
ledger entries. The current balance range is month-based. The complete legacy
property and property-type filter set is not yet available.
