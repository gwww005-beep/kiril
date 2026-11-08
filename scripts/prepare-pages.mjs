import {cp, mkdir, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '_site');
const base = '/kiril';
const origin = 'https://gwww005-beep.github.io';
await rm(output, {recursive: true, force: true});
await cp(path.join(root, 'dist'), output, {recursive: true});
for (const name of ['lifebatt-source.zip', 'prototype-guide.html', '_headers']) {
  await rm(path.join(output, name), {force: true});
}
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else if (entry.isFile()) files.push(file);
  }
}
await collect(output);
let pages = 0;
for (const file of files) {
  if (file.endsWith('.html')) {
    let html = await readFile(file, 'utf8');
    html = html.replace(/\b(href|src)="(\/(?!\/)[^"]*)"/g, (_, attribute, url) => `${attribute}="${base}${url}"`);
    html = html.replace(/(<meta property="og:image" content=")https:\/\/lifebatt\.ru\/images\//g, `$1${origin}${base}/images/`);
    await writeFile(file, html);
    if (path.basename(file) === 'index.html') pages++;
  } else if (file.endsWith('.css')) {
    const css = await readFile(file, 'utf8');
    await writeFile(file, css.replace(/url\((['"]?)(\/(?!\/))/g, (_, quote) => `url(${quote}${base}/`));
  }
}
const routes = JSON.parse(await readFile(path.join(root, 'docs/routes.json'), 'utf8'));
await writeFile(path.join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + routes.map(route => `<url><loc>${origin}${base}${route.path}</loc></url>`).join('') + '</urlset>');
await writeFile(path.join(output, '.nojekyll'), '');
// This is a separate public demo, so retain noindex and the original site's canonical URLs.
await writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
let checkedResources = 0;
const errors = [];
async function verifyUrl(url, file) {
  if (!url.startsWith('/') || url.startsWith('//')) return;
  if (!url.startsWith(base + '/')) {
    errors.push(`${path.relative(output, file)}: missing deployment prefix: ${url}`);
    return;
  }
  const parsed = new URL(url, origin);
  let target = path.join(output, decodeURIComponent(parsed.pathname.slice(base.length)));
  try {
    if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
    if (!(await stat(target)).isFile()) throw new Error('not a file');
    checkedResources++;
  } catch {
    errors.push(`${path.relative(output, file)}: missing ${url}`);
  }
}
for (const file of files.filter(file => /\.(html|css)$/.test(file) && path.basename(file) !== 'prototype-guide.html')) {
  const text = await readFile(file, 'utf8');
  if (file.endsWith('.html')) {
    for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) await verifyUrl(match[1], file);
    if (!text.includes('noindex,nofollow')) errors.push(`${path.relative(output, file)}: missing noindex`);
  } else {
    for (const match of text.matchAll(/url\(['"]?([^'"\)]+)/g)) await verifyUrl(match[1], file);
  }
}
if (pages !== 34) errors.push(`Expected 34 pages, found ${pages}`);
const report = {pages, checkedResources, basePath: base, url: origin + base + '/', errors};
await mkdir(path.join(root, 'checks'), {recursive: true});
await writeFile(path.join(root, 'checks/github-pages-report.json'), JSON.stringify(report, null, 2));
if (errors.length) throw new Error(errors.join('\n'));
console.log(`GitHub Pages: ${pages} pages, ${checkedResources} internal resource checks passed. Output: _site/`);
