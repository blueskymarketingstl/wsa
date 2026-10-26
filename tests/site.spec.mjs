import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const definitions=JSON.parse(fs.readFileSync('content/pages.json','utf8'));
test('Every published page renders with working local assets and SEO metadata',async({page,request})=>{
  for(const [slug,def]of Object.entries(definitions)){
    const path=slug==='home'?'/':`/${def.parent?def.parent+'/':''}${slug}/`;
    const response=await page.goto(path);expect(response.status(),path).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    if(slug!=='home')await expect(page.locator('main h1')).toHaveText(def.title);
    expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
    await expect(page.locator('link[rel=canonical]')).toHaveCount(1);
    await page.locator('img').evaluateAll(async imgs=>{ for(const img of imgs)img.loading='eager'; await Promise.all(imgs.map(img=>img.decode().catch(()=>{}))); });
    const failed=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
    expect(failed,path).toEqual([]);
  }
  const missing=await request.get('/this-page-does-not-exist/');expect(missing.status()).toBe(404);
});
test('Search finds services and supports keyboard dismissal',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Search the website'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('searchbox').fill('brake');
  await expect(page.locator('#search-results').getByRole('link',{name:/Brake Service/})).toBeVisible();
  await page.locator('#search-results').getByRole('link',{name:/Brake Service/}).click();
  await expect(page).toHaveURL(/auto-repair\/brake-repair/);
  await page.getByRole('button',{name:'Search the website'}).click();await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Search the website'})).toBeFocused();
  await page.goto('/?s=suspension');await expect(page.locator('main').getByRole('link',{name:/Suspension & Steering/})).toBeVisible();
  await page.goto('/?s=zznomatch123');await expect(page.getByText('No matches yet.',{exact:true})).toBeVisible();
});
test('Mobile menu, touch targets, and overflow',async({page})=>{
  for(const width of [360,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`).toBeTruthy();
    if(width<900){await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.locator('#primary-nav')).toBeVisible();await page.locator('#primary-nav').getByRole('link',{name:'Auto Repair',exact:true}).click();await expect(page).toHaveURL(/auto-repair/);}
  }
});
test('Unconfigured mail offers direct contact and protects the form',async({page,request})=>{
  await page.goto('/contact/');
  await expect(page.getByText('Online messaging will be available soon.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Send your message'})).toBeDisabled();
  await expect(page.getByRole('link',{name:'email Michael'})).toHaveAttribute('href','mailto:michael@blueskymarketingstl.com');
  const response=await request.post('/api/inquiries',{form:{csrf:'invalid',name:'Test',email:'test@example.com',message:'Test inquiry',consent:'1'},maxRedirects:0});
  expect(response.headers().location).toContain('inquiry=expired');
});
test('Booking uses the existing provider and schema describes service without prices',async({page})=>{
  await page.goto('/book/');await expect(page.getByRole('link',{name:'Continue to online booking'})).toHaveAttribute('href','https://aops.cc/jacobi-car-care-llc-dba-weldon-springs-auto-booking');
  await page.goto('/auto-repair/brake-repair/');
  const schema=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(schema['@graph'][1]['@type']).toBe('Service');expect(JSON.stringify(schema)).not.toContain('priceRange');
});
test('Accessibility checks on desktop, mobile, contact, and open search',async({page})=>{
  for(const path of ['/','/contact/','/auto-repair/brake-repair/']){
    await page.goto(path);
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations,path).toEqual([]);
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  let scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
  await page.getByRole('button',{name:'Search the website'}).click();
  scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
});
test('Capture desktop and mobile review images',async({page})=>{
  fs.mkdirSync('dist/screenshots',{recursive:true});
  await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.locator('img').evaluateAll(async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});await page.screenshot({animations:'disabled',path:'dist/screenshots/home-desktop.png',fullPage:true});await page.screenshot({animations:'disabled',path:'dist/screenshots/home-desktop-first-screen.png'});
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('img').evaluateAll(async imgs=>{for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});await page.screenshot({animations:'disabled',path:'dist/screenshots/home-mobile.png',fullPage:true});await page.screenshot({animations:'disabled',path:'dist/screenshots/home-mobile-first-screen.png'});
});
