# Releases and updates

## Windows 26.2

Update settings provide a manual check, an optional startup check and a prompt
when a newer version is available. Downloads are verified against the public
updater key embedded in the application. Installing an update requires saving
or discarding current edits first. Offline accounting remains available when
the update service cannot be reached.

The release feed is the `latest.json` asset on the latest GitHub Release. It
contains the version, release date and platform-specific installer URL and
signature. A signature authenticates the installer; it does not establish
accounting correctness or replace a Windows Authenticode certificate.
End-to-end installation of a later update still requires target-device testing.

## Building and signing

Normal release builds generate updater artifacts. Supply
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` through the
environment. Never commit private keys or passwords. Only the public verification
key belongs in the application configuration.

For local/CI builds without updater signing artifacts, add
`--config src-tauri/tauri.ci.conf.json`. Manual GitHub Actions builds use this
configuration; generating an artifact is separate from publishing a release.

## macOS and older versions

26.1 Preview updates are installed manually. Its releases link opens the browser;
that version does not poll the update feed. Its existing universal Mac preview
targets Monterey 12.6 or later and is unsigned and not notarized.

The Windows 26.2 release does not include a macOS 26.2 installer. A Tauri updater
key and an Apple Developer ID certificate have different purposes. macOS release
verification, signing and notarization remain separate steps.

## Database compatibility

A newer release retains a migration path from supported older databases.
An older application may reject a newer schema and must not overwrite it.
Restoring an older application after migration requires the matching
pre-migration database backup. Application updates do not replace database backups.

[Tauri updater documentation](https://v2.tauri.app/plugin/updater/)
