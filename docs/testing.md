# Preview verification

Run the automated checks:

```sh
npm test
npm run check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --release
```

## Demonstration control values

The first October 2026 account has charges of 1047.44 MDL: water 309.90,
electricity 566.04, waste 17.50, maintenance 150.00 and bank service 4.00.
The second deliberately lacks readings and must remain incomplete.

## Recorded results

- Nine JavaScript tests and two Rust storage tests passed.
- Svelte/TypeScript checking reported no errors or warnings; production dependency audit reported zero vulnerabilities at the time of checking.
- Windows native launch, saved test-database reload, SQLite backup, light/dark appearance and cancellation of unsaved exit were checked.
- A PDF produced during Windows testing contained two pages, the expected first-account total and Romanian ă â î ș ț. Its first page was rendered and visually inspected.
- The latest Windows download-handler change builds, but suppression of the Edge downloads panel after PDF saving still needs full end-to-end verification.
- GitHub run 40236320310 completed verification and both desktop builds successfully.
- The final DMG passed archive integrity checks. Both Intel and arm64 Mach-O slices and Info.plist target 12.6. The executable permission and Applications link are present.
- DMG size: 6,718,935 bytes. SHA-256: b20ac73bbc72a7d82784c73be84d8a48384b78a25b8127bbe1600c19233ef846.
- Monterey launch and a superficial check were reported successful after removal of an app-specific download quarantine flag. Full target-system acceptance remains pending.
- Mac icon artwork currently appears oversized relative to neighbouring Launchpad icons.

## Before production use

Verify saving, reopening, backup recovery, system-theme changes, long names,
multiple apartments, zero readings, advances, closing/reopening, and all receipt
designs on each target OS. Check vector/raster logos and monochrome output.
Confirm calculation and rounding rules with the accountant.

Automated tests do not establish compliance with local reporting requirements
or replace reconciliation with the established accounting system.

[Preview release](https://github.com/OldschoolNetwork/open-hau/releases/tag/v26.1.0-preview.1)
