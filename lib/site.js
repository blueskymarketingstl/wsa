import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ejs from 'ejs';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const definitions = JSON.parse(fs.readFileSync(path.join(root,'content/pages.json'),'utf8'));
const icons=JSON.parse(fs.readFileSync(path.join(root,'content/icons.json'),'utf8'));
const sizes=JSON.parse(fs.readFileSync(path.join(root,'content/images.json'),'utf8'));
export const siteName='Weldon Spring Automotive & Tire';
export const directions='https://www.google.com/maps/search/?api=1&query=818+OFallon+Rd+St+Charles+MO+63304';
export const bookingFallback='https://aops.cc/jacobi-car-care-llc-dba-weldon-springs-auto-booking';
export const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const url=(p='')=>'/' + p.replace(/^\/+/, '');
export const strip=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export const pages=Object.entries(definitions).map(([slug,page])=>({...page,slug,path:slug==='home'?'/':`/${page.parent?page.parent+'/':''}${slug}/`}));
export const routes=new Map(pages.map(page=>[page.path,page]));
export const services=pages.filter(page=>page.parent==='auto-repair');
export const icon=name=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]??icons.tool}</svg>`;
export function image(name,alt='',className='',eager=false){
  const size=sizes[name];
  return `<img src="/assets/${escape(name)}" alt="${escape(alt)}" class="${escape(className)}" ${size?`width="${size.width}" height="${size.height}"`:''} ${eager?'fetchpriority="high"':'loading="lazy" decoding="async"'}>`;
}
export const button=(label='Schedule a visit',target='book/',className='')=>`<a class="button ${escape(className)}" href="${escape(url(target))}">${escape(label)}${icon('arrow')}</a>`;
export function serviceGrid(limit=0){
  const order=['brake-repair','oil-changes','suspension-steering','engine-diagnostics','heating-ac-repair','wheel-alignment'];
  const selected=limit ? order.slice(0,limit).map(slug=>services.find(s=>s.slug===slug)) : services;
  return '<div class="service-grid">'+selected.map((service,i)=>`<a class="service-card" href="${service.path}"><div class="service-image">${image(service.image)}<span class="service-number">${String(i+1).padStart(2,'0')}</span></div><div class="service-info"><h3>${escape(service.title)}</h3><p>${escape(strip(service.content).split(' ').slice(0,19).join(' '))}…</p><span class="text-link">Explore service ${icon('arrow')}</span></div></a>`).join('')+'</div>';
}
export function search(query){
  const terms=query.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N} /-]/gu,' ').split(/\s+/).filter(Boolean).slice(0,10);
  if(!terms.length)return [];
  return pages.map(page=>{
    const title=page.title.toLowerCase(),keywords=(page.keywords??'').toLowerCase(),body=strip(page.content).toLowerCase();
    const score=terms.reduce((sum,term)=>sum+(title.includes(term)?8:0)+(keywords.includes(term)?6:0)+(body.includes(term)?1:0),0);
    return {...page,score,excerpt:strip(page.content).split(' ').slice(0,22).join(' ')+'…'};
  }).filter(p=>p.score>0).sort((a,b)=>b.score-a.score);
}
export function settings(env=process.env){
  const siteUrl=new URL(env.SITE_URL || 'https://weldonspringautoandtire.com');
  if(!['http:','https:'].includes(siteUrl.protocol) || siteUrl.username || siteUrl.password)throw new Error('SITE_URL must be an HTTP(S) origin without credentials.');
  const bookingUrl=new URL(env.BOOKING_URL || bookingFallback);
  if(bookingUrl.protocol!=='https:')throw new Error('BOOKING_URL must use HTTPS.');
  return {siteUrl:siteUrl.origin,bookingUrl:bookingUrl.href,noindex:env.NOINDEX==='true'};
}
export function schemaFor(page,base){
  const shop={'@context':'https://schema.org','@type':'AutoRepair','@id':base+'/#shop',name:siteName,url:base+'/',image:base+'/assets/Weldon-Spring-Auto-and-Tire-Logo.png',telephone:'+1-636-498-6600',address:{'@type':'PostalAddress',streetAddress:'818 O’Fallon Road',addressLocality:'St. Charles',addressRegion:'MO',postalCode:'63304',addressCountry:'US'},areaServed:['Weldon Spring','St. Charles','St. Peters','O’Fallon'],openingHoursSpecification:{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:'08:00',closes:'17:00'},amenityFeature:{'@type':'LocationFeatureSpecification',name:'Free guest Wi-Fi',value:true}};
  return page.parent?{'@context':'https://schema.org','@graph':[shop,{'@type':'Service',name:page.title,serviceType:page.title,provider:{'@id':base+'/#shop'},areaServed:shop.areaServed,url:base+page.path}]}:shop;
}
export async function renderPage(page, options={}){
  const config=options.config || settings();
  let version='dev';try{version=JSON.parse(fs.readFileSync(path.join(root,'build.json'),'utf8')).version;}catch{}
  const isSearch=options.template==='search';
  const title=page.slug==='home'?`Auto Repair & Tires in Weldon Spring & St. Charles, MO | ${siteName}`:`${page.title} | ${siteName}`;
  const data={...options,page,services,pages,directions,url,image,icon,button,serviceGrid,strip,currentPath:page.path,title,description:page.description,canonical:config.siteUrl+page.path,socialImage:config.siteUrl+'/assets/'+(page.image||'hero.webp'),noindex:config.noindex||isSearch||options.status===404,schema:JSON.stringify(schemaFor(page,config.siteUrl)).replace(/</g,'\\u003c'),version,bookingUrl:config.bookingUrl,bookingEmbed:options.bookingEmbed||'',csrfToken:options.csrfToken||'',mailConfigured:options.mailConfigured??false,results:options.results||[],query:options.query||'',inquiry:options.inquiry||'',template:options.template||(page.slug==='home'?'home':'page'),navigation:{'auto-repair/':'Auto Repair','tires/':'Tires','about/':'Our Shop','tips-advice/':'Car Care Tips','contact/':'Contact'},tireBrands:{'michelin.webp':'Michelin','bf-goodrich.webp':'BFGoodrich','goodyear.webp':'Goodyear','bridgestone.webp':'Bridgestone','firestone.webp':'Firestone','yokohama.webp':'Yokohama'}};
  return ejs.renderFile(path.join(root,'views/layout.ejs'),data,{cache:process.env.NODE_ENV==='production'});
}
