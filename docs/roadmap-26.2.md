# 26.2 roadmap

This is planned work, not a list of available 26.1 features.
The first two version digits identify the year: 26 means 2026.

## Platform-appropriate interfaces

- Windows: a Windows 10 / Metro-inspired layout, clear grid, flat surfaces and restrained rounding.
- macOS: macOS-oriented controls, spacing, navigation and platform conventions rather than a Metro skin.
- Shared functionality and database format, with system/light/dark appearance on both.
- Neutral professional wording throughout the product.

## Receipts

Add visually distinct decorative compositions, patterns and background shapes.
Preserve colour/logo configurations, monochrome legibility and an economical
no-background mode. A custom layout editor is a separate milestone.

Include previous and latest physical meter readings, reading dates and calculated
consumption on receipts. Show separate identified meter rows when an account has
several meters; do not label a billed quantity as a cumulative meter reading.

## Reports

Plan account and service turnover/balance statements, payment reports and account
ledgers with opening balances, charges, adjustments, payments and closing balances.
Include period filters, totals, printing and spreadsheet export.
Validate column definitions and calculations against controlled examples before
claiming any reporting compliance.

Add distinct income/expense, bank-fee and reserve-fund workflows. Keep resident
receivables separate from association cash/bank balances. Historical payroll and
statutory forms need separate validation before becoming current templates.

Plan opt-in automatic report exports with a selected folder, format and schedule
or close-period trigger. Include CSV, XLSX/ODS and printable HTML/PDF as distinct
formats; do not present reports as complete backups. Implementation status is
tracked in [the capability matrix](capabilities-26.2.md).

## Legacy functional coverage

Build a tested capability matrix for legacy billing workflows rather than assuming
that matching screens is sufficient. Areas identified for analysis include:

- Organisations, buildings, apartments, payers, residents and dated status changes.
- Multiple physical meters, replacements, initial/current readings and shared meters.
- Tariff histories, calculation bases, norms and common-consumption allocation.
- Opening balances, payments, refunds, service allocations and adjustments.
- Historical charge preservation, reconciliation, closing and correction workflows.
- Receipt configuration and the required reporting suite.

Account-card coverage includes settlement, street, building, apartment, floor,
total and living area, account opening/closure dates, and payer history.
Resident records need registration type, residence status, relationship to the
payer, benefit category, and dated changes. Meter connections need dated active
and disconnected states, individual/shared classification, readings, consumption,
and replacement history. Displaying an archived latest reading must not treat it
as current-period consumption.

Some areas may require a richer versioned data model. Preserve original values and
clearly identify unsupported or inferred mappings.

## Import framework

Support explicit source profiles, including SQL Server Compact SDF and structured
exports from other systems. A file extension is not a schema. Inspect read-only
copies, preview mappings, preserve unmapped records and reconcile financial
control totals before applying. General-purpose import is not available in 26.1.

## Backups and compatibility

Add optional automatic copies to a user-selected location, with scheduling,
dated filenames, result verification and visible failures. A copy must be
consistent, not a raw copy of a live database mid-write. Keep retention
user-controlled and avoid silently deleting backups.

New application versions must read supported older formats through explicit
backup-protected migrations. Older applications may refuse newer formats.
Test restoration and rollback as well as successful migration.

## Platform verification

Complete persistence/printing checks on Monterey, adapt the Mac icon's transparent
margins, and finish the Windows PDF download-panel regression check. Keep system
print-dialog text separate from the application's own translations.
