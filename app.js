import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {root,pages,routes,search,settings,renderPage,escape} from './lib/site.js';
import {createContact} from './lib/contact.js';
export function createApp({env=process.env,mailer,now}={}){
  const app=express();const config=settings(env);const contact=createContact({env,mailer,now});
  app.disable('x-powered-by');app.set('trust proxy',1);
  app.use((req,res,next)=>{
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"base-uri 'self'; object-src 'none'"});next();
  });
  app.get('/health',(_req,res)=>{let build='development';try{build=JSON.parse(fs.readFileSync(path.join(root,'build.json'),'utf8')).version;}catch{}res.set('Cache-Control','no-store').json({status:'ok',version:'2.0.0',build,mailConfigured:contact.mailer.configured});});
  app.use(express.static(path.join(root,'public'),{dotfiles:'deny',maxAge:'1h',fallthrough:true,redirect:false}));
  app.use(express.urlencoded({extended:false,limit:'24kb',parameterLimit:20}));
  app.post('/api/inquiries',contact.handle);
  app.get('/api/search',(req,res)=>{
    if(typeof req.query.q!=='string'||req.query.q.length>100)return res.status(400).json({error:'Enter a search term of up to 100 characters.'});
    const results=req.query.q.trim().length<2?[]:search(req.query.q).slice(0,8).map(p=>({title:p.title,url:p.path,excerpt:p.excerpt}));
    res.set('Cache-Control','public, max-age=60').json(results);
  });
  app.get(['/sitemap.xml','/wp-sitemap.xml'],(_req,res)=>{
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>${escape(config.siteUrl+p.path)}</loc></url>`).join('')}</urlset>`);
  });
  app.get('/robots.txt',(_req,res)=>res.type('text/plain').send(config.noindex?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${config.siteUrl}/sitemap.xml\n`));
  // Only a trusted repository file is allowed to contain STEER's script/iframe markup.
  const embedPath=path.join(root,'content/steer-embed.html');
  const bookingEmbed=fs.existsSync(embedPath)?fs.readFileSync(embedPath,'utf8'):'';
  app.get(/.*/,async(req,res)=>{
    if(req.path.length>500)return res.status(414).type('text').send('URL too long');
    const normalized=req.path==='/'?'/':req.path.replace(/\/+$/,'')+'/';
    if(routes.has(normalized)&&req.path!==normalized)return res.redirect(308,normalized+(req.url.includes('?')?req.url.slice(req.url.indexOf('?')):''));
    if(req.path==='/'&&req.query.s!==undefined){
      const q=typeof req.query.s==='string'?req.query.s.trim().slice(0,100):'';
      return res.send(await renderPage({title:'Search our services',description:'Search auto services, vehicle symptoms, and car care advice.',path:'/',slug:'search'},{config,template:'search',query:q,results:search(q),mailConfigured:contact.mailer.configured}));
    }
    const page=routes.get(req.path);
    if(!page){
      // Unknown asset and API paths get real 404s, never the homepage.
      if(req.path.startsWith('/assets/')||req.path.startsWith('/api/'))return res.status(404).type('text').send('Not found');
      return res.status(404).send(await renderPage({title:'Page not found',description:'Find your way back to Weldon Spring Automotive & Tire.',path:req.path,slug:'404'},{config,template:'not-found',status:404}));
    }
    let csrfToken='';
    if(page.slug==='contact'){
      csrfToken=contact.token();res.set('Cache-Control','no-store, private');
      res.cookie('wsa_csrf',csrfToken,{httpOnly:true,sameSite:'lax',secure:req.secure,path:'/',maxAge:30*60*1000});
    }else{res.set('Cache-Control','public, max-age=60');}
    res.send(await renderPage(page,{config,csrfToken,bookingEmbed,mailConfigured:contact.mailer.configured,inquiry:typeof req.query.inquiry==='string'?req.query.inquiry:''}));
  });
  app.use((error,_req,res,_next)=>{
    const status=error.status===413?413:error.status===400?400:500;
    if(status===500)console.error('Request failed:',error.name);
    res.status(status).type('text').send(status===413?'Request too large.':status===400?'Invalid request.':'Something went wrong. Please call (636) 498-6600.');
  });
  return app;
}
