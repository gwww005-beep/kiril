import {mkdir,writeFile,readFile,cp,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pages,renderPage,render404} from '../src/render.ts';
import {packageSource} from './package.mjs';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(path.join(root,'public'),out,{recursive:true});
await cp(path.join(root,'src/styles.css'),path.join(out,'styles.css'));
await cp(path.join(root,'src/app.js'),path.join(out,'app.js'));
for(const page of pages){const folder=path.join(out,page.path==='/'?'':page.path.slice(1));await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'index.html'),renderPage(page));}
await writeFile(path.join(out,'404.html'),render404());
const imageReferences=new Set([...pages.map(renderPage).join('').matchAll(/\/images\/([^\"<> ]+)/g)].map(m=>m[1]));
for(const name of await readdir(path.join(out,'images')))if(!imageReferences.has(name))await rm(path.join(out,'images',name));
const production=process.env.SITE_MODE==='production';
if(production)await rm(path.join(out,'prototype-guide.html'),{force:true});
await writeFile(path.join(out,'robots.txt'),production?'User-agent: *\nAllow: /\nSitemap: https://lifebatt.ru/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
await writeFile(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.map(x=>'<url><loc>https://lifebatt.ru'+(x.path==='/'?'':x.path)+'</loc></url>').join('')+'</urlset>');
await writeFile(path.join(out,'_headers'),production?'':'/*\n  X-Robots-Tag: noindex, nofollow\n');
await writeFile(path.join(root,'docs/routes.json'),JSON.stringify(pages.map(({path,title})=>({path,title})),null,2));
console.log(`Built ${pages.length} static pages + 404 in dist. Mode: ${production?'production':'local / noindex'}.`);
// Optional file:// preview, so the prototype can be opened without a web server.
const preview=path.join(root,'preview');await rm(preview,{recursive:true,force:true});await cp(out,preview,{recursive:true});
const htmlFiles=pages.map(page=>path.join(preview,page.path==='/'?'':page.path.slice(1),'index.html'));
htmlFiles.push(path.join(preview,'404.html'));
if(!production)htmlFiles.push(path.join(preview,'prototype-guide.html'));
for(const source of htmlFiles){
  const folder=path.dirname(source);
  let html=await readFile(source,'utf8');
  html=html.replace(/(href|src)="(\/[^\"]*)"/g,(match,attr,url)=>{
    const parsed=new URL(url,'https://preview.local');
    const pathname=parsed.pathname.replace(/\/$/,'')||'/';
    const target=pages.some(p=>p.path===pathname)
      ?path.join(preview,pathname==='/'?'':pathname.slice(1),'index.html')
      :path.join(preview,pathname.slice(1));
    const relative=path.relative(folder,target).split(path.sep).join('/');
    return `${attr}="${relative}${parsed.search}${parsed.hash}"`;
  });
  await writeFile(source,html);
}
await writeFile(path.join(preview,'styles.css'),(await readFile(path.join(preview,'styles.css'),'utf8')).replaceAll("url('/fonts/","url('fonts/"));
console.log('Server-free preview: preview/index.html');
if(!production)await packageSource(root);
