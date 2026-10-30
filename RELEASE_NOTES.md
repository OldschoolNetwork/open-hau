# OpenHaU 26.2

Windows x64 utility accounting with an account-oriented desktop workspace,
document journals and configurable receipts.

## Changes

- Account opening and closing documents, residents, service connections and
  dated changes.
- Individual/shared meter histories, monthly allocation exceptions and
  resident-based waste charges.
- Group payments, service allocations, tariff changes and dated administration
  documents.
- Account/service turnover reports and payment reports with filters, preview,
  XLSX/CSV/HTML export and separate Windows PDF/print actions.
- Nine receipt designs, an editable receipt canvas, saved logos, SVG tinting,
  date formats and previous/current meter readings with dates and consumption.
- File-based ODB saving, schema 1–3 migration to schema 4, password encryption
  and a bundled local JSON-RPC API companion.
- Saved receipt-content choices: optional sections, services, meter types,
  individual rows and columns. Empty readings sections disappear automatically;
  service-based labels avoid repeating the payer name.
- Faster validation of long payment histories, a single validation pass when
  opening a database, and no file rewrite when saving an unchanged project.
- Fixed unnecessary save prompts when returning to the database catalog or
  switching databases; unchanged open forms do not count as edits.
- English language selection, editable translations, refreshed settings,
  desktop widgets, menu positioning and notifications.

## Downloads

Choose the Windows installer or the standalone executable. The installer includes
a multilingual Quick Start Guide and an optional API companion. WebView2 is
required; Node.js is needed only for the API companion.

Windows installation is per user and does not require administrator privileges.
The installer has an updater package signature. This is separate from a Windows
Authenticode certificate.

## Compatibility and limits

Saved databases use schema 4. Older versions that do not support this schema
cannot reopen them. Keep a pre-upgrade copy. Earlier backups may remain
unencrypted after enabling a password. Password recovery and biometric unlocking
are not included.

Some legacy labels still need translation. Long/custom receipts and physical
printers require layout review. macOS 26.2 and direct macOS PDF export are not
part of this Windows package. The prior 26.1 Mac preview remains available in
its existing release.

Automated checks cover 125 tests, frontend diagnostics and native compilation.
They do not establish full accounting or target-device acceptance. The Windows
signed update feed is published separately; end-to-end installation of a later
update has not yet been verified.
