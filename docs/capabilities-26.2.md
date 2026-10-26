# 26.2 development capabilities

This is an implementation tracker, not a release announcement. A development
implementation is not evidence of acceptance on Windows or macOS Monterey.
The published 26.1 preview is unchanged.

| Workflow | Current development status | Remaining work |
| --- | --- | --- |
| Account, service and tariff editing | Existing preview implementation | Dated resident/status changes and richer property relationships |
| Physical meter identities and readings | Format 2 model, meter/reading editor, history and calculation/receipt functions | Replacement workflow, imported history and broader usability checks |
| Previous/current readings on receipts | Individual meters printed separately, dates retained; legacy aggregate fallback | Full meter-entry workflow and print acceptance on both platforms |
| Shared meters | Dated meter groups, equal per-account allocation, month-specific exemptions, rounding conservation and preview | Broader native acceptance and imported meter-network mapping |
| Monthly waste counts | Whole-account or per-apartment direct/cumulative monthly entry and missing-data checks | Broader native acceptance and spreadsheet mapping |
| Closed financial history | Preserved snapshots and decimal calculations | Extended correction workflows and service-level reconciliation |
| Account turnover/balance report | Period filters, totals, inactive accounts, missing-history warnings | Accounting review, service statements and account ledgers |
| Report exports | CSV, SpreadsheetML XML and printable HTML | XLSX/ODS, dedicated export settings, destination and scheduling |
| Automatic backup to another location | Opt-in folder, verified standalone SQLite copy after saving, manual copy, disable control, restore regression test and Windows demo verification | Monterey acceptance and a restore interface |
| Automatic report exports | Current-month balance report in selected CSV/XML/HTML formats, save/close triggers, manual export, deduplication and Windows demo verification | Monterey acceptance, additional reports, XLSX/ODS and timed schedules |
| Income and expenses | Planned | Separate cash/bank journal, categories, supporting documents and monthly summary |
| Reserve funds | Planned | Opening balances, contributions, spending and fund reconciliation |
| Bank fees and reconciliation | Planned | Bank-statement mapping and matching without changing resident charges |
| Payroll and statutory forms | Analysis only | Separate scope, validated jurisdiction/date-specific rules and approved templates |
| Legacy database import | Source-profile design; a one-off migration is not a general importer | Read-only source inspection, mapping preview, provenance, archives and control totals |
| Spreadsheet import | Analysis only | Explicit column mapping, dates/units, duplicates, organisation boundaries and cached-value checks |
| Windows/macOS interface | Separate Windows 10 22H2-inspired and macOS-oriented presentation; translated calculation/validation messages | Native visual acceptance and remaining wording review |
| Receipt designs and languages | Seven designs, custom appearance presets, logos, English receipt labels and monthly payment dates | Native print acceptance and broader long-bill checks |

## Export contracts

CSV is UTF-8 with BOM and semicolon separators; formula-like text is escaped.
SpreadsheetML export is a genuine XML workbook with the `.xml` extension, not an
XLS/XLSX file. Account identifiers remain text, monetary columns are numeric,
and cell contents never become executable spreadsheet formulas. Verify opening
in the intended spreadsheet application before routine use.

HTML reports are self-contained and printable; PDF is produced through the
system print dialog. Reports identify incomplete calculations. These exports
are reports, not full database backups.

## Import and accounting boundaries

Do not combine different organisations or assume that a filename containing
"copy" identifies a duplicate. Use content hashes and source provenance.
Historical workbook periods must not overwrite newer operational data.
Resident debts, cash/bank balances and restricted reserve funds are different
ledgers. Imported formulas and cached spreadsheet results require reconciliation;
macros, external links and executable attachments must not be run during import.

Automatic exports should be opt-in and independent from full backups. A failed
export must be visible and must not roll back an otherwise successful database
save or silently overwrite an unrelated file.
