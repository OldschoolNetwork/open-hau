# macOS Monterey 12.6 test checklist

Launch and a superficial functional check have been reported successful on
Monterey. The initial unsigned application was blocked by a Telegram quarantine
attribute; launch succeeded after removing the app-specific flag.
Detailed functional acceptance remains pending. Minimum-version metadata and
a successful build alone do not establish compatibility.

## Checks

1. Record the Mac model, processor architecture and exact macOS version.
2. Open the DMG, verify the application and Applications link, then drag the app into Applications.
3. Launch the installed copy. Verify the two fictional demonstration accounts and readable text.
4. Test light, dark and system appearance, Russian/Romanian switching, and Romanian ă â î ș ț.
5. Change the fictional organisation name and theme, save, quit and reopen. Both should persist.
6. Enter a fictional October payment of 10.00 MDL for the first sample account. Its balance should decrease from 1047.44 to 1037.44 MDL.
7. Preview Studio, Compact and Classic receipts in Russian, Romanian and bilingual modes. Check totals, labels and overlapping content.
8. Upload an SVG or PNG logo, change colour, save a configuration and select it again. Save and verify it after reopening.
9. Save a PDF through the Mac print dialog. Check A4, page breaks, copied Romanian text and monochrome output. Test exported HTML in Safari if embedded printing fails.
10. Export full JSON and import it again after inspecting the preview. Verify records, settings and totals.
11. Close with unsaved changes. Verify the save prompt, cancel path and successful saved exit. Unapplied readings must not silently disappear.

Use a demonstration database for destructive tests. Keep real accounting records
and an independent export safe.

## Reporting results

For each failure, provide the step number, exact action, expected and actual
behaviour, and a redacted screenshot or error text. Record individual checks as
passed only after completing them; a general successful launch is not a substitute
for persistence and printing checks.

Known visual issue: the Mac icon currently appears larger than adjacent Launchpad
icons. A platform-specific margin adjustment remains pending.
