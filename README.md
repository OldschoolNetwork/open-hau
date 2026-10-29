<p align="center"><img src="public/brand/icon.png" width="100" alt="OpenHaU"></p>

<h1 align="center">OpenHaU</h1>
<p align="center">House &amp; Utilities</p>

Offline utility accounting for housing associations. Manage personal accounts,
services, dated tariffs, individual and shared meters, payments, receipts and
reports without a mandatory account or cloud connection.

## Download

[OpenHaU 26.2 for Windows x64](https://github.com/OldschoolNetwork/open-hau/releases/tag/v26.2.0)
is available as an installer or a standalone executable. Microsoft WebView2 is
required; the installer can obtain it when missing. Installation is per user,
under the user's application directory, without administrator privileges.

The standalone executable still keeps a local database catalog; it is not a
portable-data mode. Use **Add existing** to open an ODB file directly.

The [26.1 macOS preview](https://github.com/OldschoolNetwork/open-hau/releases/tag/v26.1.0-preview.1)
remains available for Intel and Apple Silicon, targeting Monterey 12.6 or later.
A macOS 26.2 package is not included in the Windows release.

## Features

- Personal-account opening and closing documents, residents, service connections
  and dated changes.
- Individual and shared meters, dated readings and equal allocation of shared
  differences across eligible accounts, with monthly exceptions.
- Per-person waste charges, dated tariffs, monthly overrides and adjustments.
- Group payments, service allocations and preserved monthly charge snapshots.
- Account and service turnover reports, payment reports, filters, preview,
  XLSX/CSV/HTML export, and separate Windows PDF and print actions.
- Nine receipt designs, including a traditional layout, editable canvas layers,
  logo libraries, SVG tinting, date formats and saved appearance presets.
- Previous and current meter readings, dates and consumption printed on receipts.
- System, light and dark appearance, with Russian, Romanian and English language
  selections and editable translations. Some legacy labels still need translation.
- File-based ODB databases, optional password encryption, backups and a local API.

## Databases and privacy

ODB files contain the complete project, including organization details and
settings. Saving a linked database updates that file. New versions read schemas
1–3 and save schema 4; older versions that do not support schema 4 cannot reopen
the upgraded file. Keep an independent copy before upgrading.

Unprotected ODB files contain readable UTF-8 JSON. Password-protected files use
Argon2id and AES-256-GCM. Earlier backups, including the safety copy created
before setting a password, can remain unencrypted. Password recovery and
biometric unlocking are not available.

The application does not upload accounting records to a server. Shared data,
receipts and exports can contain personal information and belong outside public
repositories. All included examples are fictional.

## Documentation and API

[Quick Start — English, Romanian and Russian](resources/OpenHaU-Quick-Start.html) ·
[Personal accounts](docs/personal-accounts.md) ·
[Group payments](docs/group-payments.md) ·
[Benefits and recalculation](docs/administration.md) ·
[Data format](docs/data-format.md) ·
[API reference](docs/database-api.md) ·
[Updates](docs/updates.md)

The optional API companion exposes validated JSON-RPC commands over standard
input/output. It requires Node.js 24.7 or newer; the desktop application itself
does not require Node.js. Close the desktop database before API writes.

```sh
node OpenHaU-API.mjs stdio
```

The source includes landing-page and web-wiki files under `website/openhau`.
Their presence does not establish deployment to the public website.

## Build from source

Requires Node.js 24 and Rust, plus MSVC C++/Windows SDK on Windows or Xcode tools
on macOS.

```sh
npm ci
npm test
npm run tauri dev
# Local Windows installer without updater signing artifacts
npm run tauri build -- --config src-tauri/tauri.ci.conf.json
```

For a universal Mac build, run on a Mac:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri build -- --target universal-apple-darwin --config src-tauri/tauri.macos.conf.json --config src-tauri/tauri.ci.conf.json
```

Release builds use a private updater signing key supplied through the environment.
The repository contains only its public verification key. Updating the application
does not replace database backups or accounting reconciliation. Full target-device
and printer acceptance remains separate from automated tests.

## Oldschool Network

[Website](https://oldschoolnetwork.online/) ·
[Bluesky](https://bsky.app/profile/oldnet.bsky.social) ·
[YouTube](https://www.youtube.com/@oldschoolnetwork) ·
[X](https://x.com/oldschool_net) ·
[Telegram](https://t.me/OldschoolNetwork)
