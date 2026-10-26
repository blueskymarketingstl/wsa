import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root,pages,renderPage} from '../lib/site.js';
const out=path.join(root,'dist');
// Clear only generated deployment files; preserve review screenshots from browser tests.
for(const name of ['server.js','app.js','lib','views','content','public','build.json'])fs.rmSync(path.join(out,name),{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const name of ['server.js','app.js','lib','views','content','public'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
const hash=createHash('sha256');
function digest(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())digest(file);else{hash.update(path.relative(root,file));hash.update(fs.readFileSync(file));}}}
for(const name of ['lib','views','content','public'])digest(path.join(root,name));
for(const name of ['app.js','server.js'])hash.update(fs.readFileSync(path.join(root,name)));
const version=hash.digest('hex').slice(0,12);
fs.writeFileSync(path.join(out,'build.json'),JSON.stringify({version,node:'22',pages:pages.length})+'\n');
for(const page of pages){const html=await renderPage(page);if(html.includes('<?php')||!html.includes('<h1>'))throw new Error(`Invalid render: ${page.path}`);}
// Do not ship the obsolete WordPress ZIP with the new deployment output.
fs.rmSync(path.join(out,'weldon-spring-theme.zip'),{force:true});
console.log(`Built Node.js app ${version}; validated ${pages.length} server-rendered pages. Start with npm start.`);
