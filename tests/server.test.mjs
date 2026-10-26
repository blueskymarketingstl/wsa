import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.js';
import {createContact,createMailer} from '../lib/contact.js';
const config={SITE_URL:'https://weldonspringautoandtire.com',NOINDEX:'false'};
async function server(t,options={}){
 const app=createApp({env:config,...options});const instance=app.listen(0,'127.0.0.1');await once(instance,'listening');t.after(()=>new Promise(resolve=>instance.close(resolve)));return `http://127.0.0.1:${instance.address().port}`;
}
async function form(base){const r=await fetch(base+'/contact/');const html=await r.text();return {csrf:html.match(/name="csrf" value="([^"]+)"/)[1],cookie:r.headers.get('set-cookie').split(';')[0],headers:r.headers};}
async function submit(base,formData,body={}){return fetch(base+'/api/inquiries',{method:'POST',headers:{cookie:formData.cookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:formData.csrf,name:'Test Customer',email:'test@example.com',phone:'5550100',vehicle:'Test car',message:'A local test about grinding brakes.',consent:'1',...body}),redirect:'manual'});}
test('Production-facing routes, SEO, search ranking, and real 404s',async t=>{
 const base=await server(t);
 assert.equal((await fetch(base+'/health')).status,200);
 const result=await (await fetch(base+'/api/search?q=grinding')).json();assert.equal(result[0].url,'/auto-repair/brake-repair/');
 assert.equal((await fetch(base+'/api/search?q='+ 'a'.repeat(101))).status,400);
 const sitemap=await(await fetch(base+'/sitemap.xml')).text();assert.equal((sitemap.match(/<loc>/g)||[]).length,24);assert.match(sitemap,/auto-repair\/brake-repair/);
 assert.equal((await fetch(base+'/missing/')).status,404);assert.equal((await fetch(base+'/assets/missing.png')).status,404);
 assert.equal((await fetch(base+'/auto-repair',{redirect:'manual'})).status,308);
 const search=await(await fetch(base+'/?s=%3Cscript%3Eevil%3C%2Fscript%3E')).text();assert.ok(!search.includes('<script>evil</script>'));
 assert.match(await(await fetch(base+'/robots.txt')).text(),/Sitemap: https:\/\/weldonspringautoandtire.com\/sitemap.xml/);
});
test('Mail not configured is visible and does not pretend to submit',async t=>{
 const base=await server(t);const f=await form(base);const html=await(await fetch(base+'/contact/')).text();assert.match(html,/Online messaging will be available soon/);assert.match(html,/<fieldset disabled/);assert.match(f.headers.get('cache-control'),/no-store/);
 const fresh=await form(base);const r=await submit(base,fresh);assert.match(r.headers.get('location'),/inquiry=unavailable/);
 assert.equal(createMailer({}).configured,false);
});
test('Valid inquiry, recipient, CSRF protection, validation, and cooldown',async t=>{
 const deliveries=[];const mailer={configured:true,send:async data=>deliveries.push(data)};
 const base=await server(t,{mailer});const f=await form(base);
 let r=await submit(base,f,{csrf:'é'.repeat(f.csrf.length)});assert.match(r.headers.get('location'),/inquiry=expired/);
 r=await submit(base,f,{csrf:'tampered'});assert.match(r.headers.get('location'),/inquiry=expired/);
 r=await submit(base,f,{email:'invalid'});assert.match(r.headers.get('location'),/inquiry=invalid/);
 r=await submit(base,f,{website:'spam.example'});assert.match(r.headers.get('location'),/inquiry=invalid/);
 r=await submit(base,f);assert.equal(r.status,303);assert.match(r.headers.get('location'),/inquiry=sent/);assert.equal(deliveries.length,1);assert.equal(deliveries[0].email,'test@example.com');
 r=await submit(base,f);assert.match(r.headers.get('location'),/inquiry=limited/);
});
test('Mail failure is reported; expiry and cross-origin submissions are rejected',async t=>{
 const mailer={configured:true,send:async()=>{throw new Error('Simulated delivery failure');}};
 const base=await server(t,{mailer});const f=await form(base);const r=await submit(base,f);assert.match(r.headers.get('location'),/inquiry=failed/);
 const origin=await fetch(base+'/api/inquiries',{method:'POST',headers:{origin:'https://attacker.example',cookie:f.cookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:f.csrf}),redirect:'manual'});assert.match(origin.headers.get('location'),/inquiry=expired/);
 let clock=1000000;const contact=createContact({env:{},mailer,now:()=>clock});const token=contact.token();assert.ok(contact.valid(token,token));clock+=31*60*1000;assert.equal(contact.valid(token,token),false);
});
test('SMTP configuration uses a valid sender and does not expose secrets',()=>{
 assert.throws(()=>createMailer({SMTP_HOST:'smtp.example.com',SMTP_USER:'test',SMTP_PASS:'test',MAIL_FROM:'invalid'}),/MAIL_FROM/);
 assert.throws(()=>createMailer({INQUIRY_EMAIL:'invalid'}),/INQUIRY_EMAIL/);
 const mailer=createMailer({SMTP_HOST:'smtp.example.com',SMTP_USER:'test',SMTP_PASS:'test',MAIL_FROM:'service@example.com'});assert.equal(mailer.recipient,'michael@blueskymarketingstl.com');assert.equal(mailer.configured,true);
});

test('SMTP handoff keeps recipient, sender, and reply-to separate and requires TLS',async()=>{
 let options,mail;
 const mailer=createMailer({SMTP_HOST:'smtp.example.com',SMTP_PORT:'587',SMTP_USER:'test',SMTP_PASS:'test-only',MAIL_FROM:'service@example.com'}, value=>{options=value;return {sendMail:async value=>{mail=value;return {accepted:['michael@blueskymarketingstl.com']};}};});
 await mailer.send({name:'Local Test',email:'visitor@example.com',phone:'',vehicle:'Test vehicle',message:'Test brake inspection inquiry.'});
 assert.equal(options.requireTLS,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(mail.to,'michael@blueskymarketingstl.com');assert.equal(mail.from,'service@example.com');assert.equal(mail.replyTo,'visitor@example.com');assert.match(mail.text,/Test brake inspection/);
});
