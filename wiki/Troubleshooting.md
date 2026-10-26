# Troubleshooting and questions

## Mac cannot open the application

26.1 Preview has no Apple Developer ID signature or notarization.
One Monterey launch was initially blocked: signature verification reported an
unsigned Intel component and extended attributes showed a Telegram quarantine
flag. Launch and a superficial check succeeded after removing the app-specific
flag. This does not establish full workflow acceptance.

Install in Applications and try Finder's contextual Open action or specific-app
approval in Security & Privacy when offered. Do not disable Gatekeeper globally
or run the accounting application with sudo.

If the window gives no useful reason, run the following separately in Terminal.
The first tries to launch; the others inspect the signature and attributes
without changing them:

```sh
"/Applications/OpenHaU.app/Contents/MacOS/openhau"
codesign --verify --deep --strict --verbose=2 "/Applications/OpenHaU.app"
xattr -lr "/Applications/OpenHaU.app"
```

Operation not permitted is a denial, not proof of one specific cause.
Bad CPU type points to architecture; a dyld message about a missing library or
symbol requires a build investigation.

For this trusted preview obtained from the official release, if quarantine is
confirmed and contextual opening does not work, removing that application's
attribute may permit testing. Verify the source and compare the release checksum.
This does not sign or notarize the application:

```sh
xattr -dr com.apple.quarantine "/Applications/OpenHaU.app"
```

Then launch normally. If this fails, report the exact output instead of changing
permissions across Applications.

[Apple's guidance on opening apps safely](https://support.apple.com/102445)

## Mac icon appears oversized

The current icon's visible artwork is larger than neighbouring Launchpad icons.
A Mac-specific transparent-margin adjustment is pending; the selected artwork
itself is unchanged.

## Readings do not save

Apply the edited readings before saving and verify the selected month.
If saving fails, record the error and protect input with an export when possible
before closing.

## A month cannot close

Check missing readings, manual quantities, tariffs and historical gaps.
The second sample account deliberately lacks meter data. Do not enter artificial
zeros simply to make closing succeed.

## Edge downloads appears after saving a PDF

This was reported in Windows WebView2 printing. A download handler was added to
the latest preview, but the complete post-save scenario has not been reverified.
Include the WebView2 version, selected PDF printer and a privacy-safe screenshot.
HTML export and external browser printing are an alternative.

## A grammar error appears in the print window

Some print-dialog wording belongs to WebView2 rather than OpenHaU's receipt
translation. The affected system string is not directly corrected by 26.1.

## Reports, updates and legacy imports

Turnover/balance statements, regulated reporting, a general legacy importer and
automatic updates are not available. CSV is a monthly summary. A privately
prepared one-time migration does not mean any arbitrary SDF can be imported
directly by the application.

## Reporting a problem

Include version, OS, architecture, reproducible steps and expected/actual results.
Remove resident data and private identifiers. Do not publish working databases,
credentials or unredacted financial records.

[Report an issue](https://github.com/OldschoolNetwork/open-hau/issues) · [User guide](Home)
