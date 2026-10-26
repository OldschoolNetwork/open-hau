// Documentation/site generation only. Does not build or change the desktop app.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ['index', 'Home', 'User guide'],
  ['installation', 'Installation', 'Installation'],
  ['setup', 'Setup', 'Organisation and accounts'],
  ['monthly-work', 'Monthly-work', 'Monthly workflow'],
  ['receipts', 'Receipts', 'Receipts and PDF'],
  ['data-and-backups', 'Data-and-backups', 'Data and backups'],
  ['troubleshooting', 'Troubleshooting', 'Troubleshooting'],
];
const web = path.join(root, 'website/openhau');
const wiki = path.join(root, 'wiki');
await fs.mkdir(path.join(web, 'wiki'), {recursive:true});
await fs.mkdir(path.join(web, 'assets'), {recursive:true});
await fs.mkdir(wiki, {recursive:true});
function escape(value) {return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function inline(value) {
  return escape(value).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    if (!/^(https:\/\/|[a-z0-9-]+\.md(?:#.*)?$)/i.test(href)) throw Error(`Unsupported guide link: ${href}`);
    return `<a href="${href.replace(/\.md(?=#|$)/,'.html')}">${label}</a>`;
  });
}
function markdown(source) {
  const result=[]; let paragraph=[], list='', code=null;
  const flush=()=>{if(paragraph.length){result.push(`<p>${inline(paragraph.join(' '))}</p>`);paragraph=[];}};
  const closeList=()=>{if(list){result.push(`</${list}>`);list='';}};
  for (const line of source.split(/\r?\n/)) {
    if(line.startsWith('```')) {flush();closeList();if(code){result.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);code=null;}else code=[];continue;}
    if(code){code.push(line);continue;}
    if(!line.trim()){flush();closeList();continue;}
    const heading=/^(#{1,3}) (.+)$/.exec(line);
    if(heading){flush();closeList();result.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);continue;}
    const item=/^(?:- |\d+\. )(.+)$/.exec(line);
    if(item){flush();const kind=line.startsWith('- ')?'ul':'ol';if(list!==kind){closeList();list=kind;result.push(`<${kind}>`);}result.push(`<li>${inline(item[1])}</li>`);continue;}
    closeList();paragraph.push(line.trim());
  }
  flush();closeList();if(code)throw Error('Unclosed guide code fence');return result.join('\n');
}
for (const [slug, wikiSlug] of pages) {
  const source=await fs.readFile(path.join(root,`docs/guide/${slug}.md`),'utf8');
  const title=source.match(/^# (.+)/)[1];
  const nav=pages.map(([s,,label])=>`<a href="${s}.html"${s===slug?' aria-current="page"':''}>${label}</a>`).join('\n');
  const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(title)} — OpenHaU documentation 26.1 Preview"><title>${escape(title)} · OpenHaU Wiki</title><link rel="icon" type="image/png" href="../assets/icon.png"><link rel="stylesheet" href="../openhau.css?v=build-0013"><link rel="stylesheet" href="../../mobile-navigation.css?v=20261019-1"><link rel="stylesheet" href="../../site-common.css?v=build-0007"><link rel="stylesheet" href="../../site-mode.css?v=server-build-0002"><script src="../../site-mode.js?v=server-build-0002"></script></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="navbar"><a class="on-brand" href="../../index.html"><img src="../../img/on-logo.png" width="152" height="40" alt="Oldschool Network"></a><nav class="nav-links" aria-label="Navigation"><a href="../index.html">OpenHaU</a><a href="index.html">Wiki</a><a href="../index.html#downloads">Download</a><a href="https://github.com/OldschoolNetwork/open-hau">GitHub ↗</a></nav></header>
<main id="main" class="wiki-shell"><aside class="wiki-nav"><h2>OpenHaU Wiki</h2><nav aria-label="Guide sections">${nav}</nav><p><a href="https://github.com/OldschoolNetwork/open-hau/blob/main/docs/data-format.md">Data format ↗</a></p></aside><article class="wiki-article"><p class="doc-meta">26.1 Preview · User guide · English</p>${markdown(source)}<p class="doc-meta">Source: docs/guide/${slug}.md.</p></article></main>
<footer><p>Oldschool Network · <a href="https://t.me/OldschoolNetwork">Telegram</a> · <a href="https://github.com/OldschoolNetwork/open-hau">GitHub</a></p></footer><details class="on-display-settings on-display-fallback"><summary>Display settings</summary><iframe id="onDisplayControls" title="Display mode: Full, Lite, Super Lite" src="../../display-controls.php?page=openhau/wiki/${slug}.html" width="100%" height="84" frameborder="0" scrolling="no"><a href="../../display.php?page=openhau/wiki/${slug}.html">Full / Lite / Super Lite</a></iframe></details><script src="../../mobile-navigation.js?v=20261019-1"></script><script src="../../site-common.js?v=build-0007"></script></body></html>\n`;
  await fs.writeFile(path.join(web,`wiki/${slug}.html`),html);
  const wikiMarkdown=source.replace(/\]\(([a-z-]+)\.md(#[^)]+)?\)/g,(_,s,fragment='')=>{
    const target=pages.find(([p])=>p===s);if(!target)throw Error(`Missing wiki page ${s}`);return `](${target[1]}${fragment})`;
  });
  await fs.writeFile(path.join(wiki,`${wikiSlug}.md`),wikiMarkdown);
}
await fs.writeFile(path.join(wiki,'_Sidebar.md'),'## OpenHaU Wiki\n\n'+pages.map(([,s,label])=>`- [${label}](${s})`).join('\n')+'\n');
await fs.writeFile(path.join(wiki,'_Footer.md'),'OpenHaU 26.1 Preview · [Source](https://github.com/OldschoolNetwork/open-hau) · [Releases](https://github.com/OldschoolNetwork/open-hau/releases)\n');
for (const name of ['icon.png','logo-full.svg','logo-short.svg']) await fs.copyFile(path.join(root,'public/brand',name),path.join(web,'assets',name));
for (const name of ['overview-light.jpg','settings-dark.jpg','receipt-studio.jpg']) await fs.copyFile(path.join(root,'docs/screenshots',name),path.join(web,'assets',name));
console.log('Built 7 web wiki pages + GitHub Wiki Markdown from docs/guide; copied only published branding/demo screenshots.');
