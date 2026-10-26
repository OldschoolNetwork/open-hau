# OpenHaU landing page and wiki

Static source for the existing Oldschool Network site's /openhau/ and
/openhau/wiki/ sections. No database, account, analytics or external JavaScript
dependency is added. Source files being present does not establish deployment.

## Maintenance

Edit user documentation in docs/guide/*.md, then run:

```sh
node scripts/build-documentation.mjs
```

This builds website/openhau/wiki/ HTML and wiki/ Markdown and copies published
branding and fictional demonstration screenshots. Edit the landing page and
styles in website/openhau/index.html and openhau.css.

The small renderer supports the authored Markdown subset: headings, paragraphs,
lists, ordinary links and fenced code. Raw HTML is escaped.

## Design

Full mode follows the ON charcoal/cyan palette, metal gradients, system font
stack, ON wordmark and project branding. Existing ON assets provide the responsive
header behaviour, footer, social links and display controls.

Lite is the distinct silver Web 2.0 presentation, not merely a light theme.
Super Lite uses the existing basic viewer or simplified styling.
Core content and release download links remain available without JavaScript.

## Deployment

Copy openhau/ into the existing ON main webroot and add its entry to the existing
Services panel. Required shared ON CSS/JS, display endpoints and branding must
already be installed. Do not deploy the entire desktop repository, private
databases, migration archives or development tools.

The prepared server overlay contains only this task's changed files and deployment
instructions. Hosting deployment is a separate operation.

## Wiki publishing

The web wiki is independent from GitHub Wiki. The wiki/ directory contains the same
guide as Markdown with Home, sidebar and footer files for a separate Wiki
repository. These sources do not publish themselves; verify the destination
before advertising a hosted GitHub Wiki.

## Validation

Check relative links, download assets, mobile widths, menu opening/closing,
Services navigation and Full/Lite/Super Lite. Validate server-package checksums
separately from installer checksums. Screenshots must show only fictional demo
records without desktop overlays or cursor decorations.
