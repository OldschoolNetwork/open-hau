# Installation and first launch

## macOS

1. Download OpenHaU_26.1.0_universal.dmg from the official GitHub release.
2. Open the image and drag OpenHaU to Applications.
3. Launch the installed copy from Applications, not from the mounted image.
4. Eject the image after copying. No development tools or separate SQLite installation are needed.

The target is Monterey 12.6 or later. Both Intel x86_64 and Apple Silicon arm64 are
present in the binary. Static packaging checks do not establish compatibility
with every supported Mac.

The preview is unsigned and not notarized. A Monterey test initially encountered
a download quarantine block; launch succeeded after removing the app-specific
attribute. Use Finder's contextual Open action or the specific-app approval in
Security & Privacy when offered. Do not disable system protection globally or run
the accounting application as root. See troubleshooting for diagnostic commands.

## Windows

1. Download OpenHaU_26.1.0_x64-setup.exe.
2. Run the installer and launch OpenHaU.
3. Microsoft Edge WebView2 Runtime is required. The installer may download the runtime if it is absent.

A standalone EXE is also available. It still requires WebView2 and stores records
in the application data directory; it is not a portable-data edition.

## First launch

When no saved project exists, the application displays fictional examples.
Otherwise it reads the existing desktop database. Settings show the actual data
directory.

Choose Russian or Romanian and system, light or dark appearance, then save.
Receipt language is configured independently from interface language.

## Updates

Automatic updates are not enabled. Before replacing the application, save and
export a complete JSON copy to an independent location. Keep the application data
directory. Evaluate previews separately and verify calculations before replacing
an established working system.

[User guide](Home)
