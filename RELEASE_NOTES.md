# OpenHaU 26.1 First Preview

An early offline billing workspace for small housing associations, with Russian
and Romanian interfaces and configurable receipts.

## Included

- Accounts, services, dated tariffs, meter/manual quantities, payments and adjustments.
- Closed charge snapshots and decimal arithmetic.
- System, light and dark appearance.
- Studio, Compact and Classic receipts with colours, logos and saved configurations.
- SQLite storage, backups before saving an existing database, full JSON exchange,
  monthly CSV summaries and printable HTML.

## Downloads

- Windows x64 installer or standalone EXE; Microsoft Edge WebView2 is required.
- Universal Intel/Apple Silicon DMG targeting macOS Monterey 12.6 or later.
- SHA-256 checksums are attached to the release.

The Mac preview is unsigned and not notarized. A download quarantine flag can
block first launch. Monterey launch and a superficial check were reported
successful after app-specific quarantine removal; full acceptance is pending.
See the user guide for diagnostics instead of disabling system protection.

## Limitations

This is a preview for evaluation and parallel reconciliation, not certified
accounting software. There is no general legacy importer, automatic common-area
allocation, regulated reporting, turnover/balance report suite, custom layout
editor or automatic updater. PDF uses the system print dialog.

The Mac icon currently appears oversized. The Windows PDF download-panel fix
still requires a complete post-save regression check.

[User guide](https://github.com/OldschoolNetwork/open-hau/blob/main/docs/guide/index.md)
and [known limitations](https://github.com/OldschoolNetwork/open-hau/blob/main/docs/guide/troubleshooting.md).
