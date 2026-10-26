# Releases and updates

## 26.1 Preview

Updates are installed manually. The application does not poll GitHub in the
background. Its releases link opens the release page in the system browser.

Manual dispatch of `.github/workflows/build.yml` builds Windows and universal
macOS artifacts. Artifact generation is separate from publishing a checked
release. Mac distribution still needs complete target-system testing and Apple
Developer ID signing/notarization.

## Planned updater design

1. Use this repository's GitHub Releases and a signed update manifest.
2. Keep stable and preview channels distinct. Product versions begin with the two-digit year; technical package versions use compatible three-part version strings.
3. Verify update package signatures with a public key shipped in the app. Keep private signing material out of source and application binaries.
4. Make checks and installation user-controlled. Offline work must remain usable without the update service.
5. Save changes and create a consistent database backup before installation or migration.
6. Run explicit versioned schema migrations in transactions. Reject unsupported newer schemas without writing.
7. Keep application installation separate from database storage.

A Tauri updater signing key and an Apple Developer ID certificate have different
purposes. The preview does not simulate a secure updater by downloading arbitrary
unsigned executables.

## Database compatibility

A newer release must retain a tested path from supported older databases.
An older application may reject a newer schema; it must not overwrite it.
Restoring the older application after migration requires restoring the matching
pre-migration backup, not simply replacing the executable.

[Tauri updater documentation](https://v2.tauri.app/plugin/updater/)
