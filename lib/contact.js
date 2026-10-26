import {randomBytes,createHmac,timingSafeEqual,createHash} from 'node:crypto';
import nodemailer from 'nodemailer';
export const emailValid=value=>typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export function createMailer(env=process.env, transportFactory=nodemailer.createTransport){
  const recipient=env.INQUIRY_EMAIL || 'michael@blueskymarketingstl.com';
  if(!emailValid(recipient))throw new Error('INQUIRY_EMAIL must be a valid email address.');
  const required=['SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM'];
  const configured=required.every(name=>Boolean(env[name]));
  if(!configured)return {configured:false,recipient,send:async()=>{throw new Error('Mail is not configured');}};
  const port=Number(env.SMTP_PORT || 465);
  if(!Number.isInteger(port)||port<1||port>65535||!emailValid(env.MAIL_FROM))throw new Error('SMTP_PORT or MAIL_FROM is invalid.');
  const transport=transportFactory({host:env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,tls:{rejectUnauthorized:true}});
  return {configured:true,recipient,send:async data=>{
    const result=await transport.sendMail({from:env.MAIL_FROM,to:recipient,replyTo:data.email,subject:'Weldon Spring website inquiry',text:`Website inquiry\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nVehicle: ${data.vehicle}\n\n${data.message}\n\nThis is an inquiry, not a confirmed appointment.`,disableFileAccess:true,disableUrlAccess:true});
    if(!result.accepted?.length)throw new Error('Recipient was not accepted');
  }};
}
export function createContact({env=process.env,mailer=createMailer(env),now=Date.now}={}){
  const secret=env.CSRF_SECRET || randomBytes(32).toString('hex');
  const sign=value=>createHmac('sha256',secret).update(value).digest('base64url');
  const secureEqual=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};
  const token=()=>{const value=`${now()}.${randomBytes(24).toString('base64url')}`;return value+'.'+sign(value);};
  const valid=(value,cookie)=>{
    if(typeof value!=='string'||value.length>160||!secureEqual(value,cookie))return false;
    const [stamp,nonce,signature,...extra]=value.split('.');
    return !extra.length&&nonce?.length===32&&Number(stamp)<=now()&&now()-Number(stamp)<30*60*1000&&secureEqual(signature,sign(`${stamp}.${nonce}`));
  };
  const buckets=new Map();
  const getBucket=req=>{
    const key=createHash('sha256').update(req.ip||req.socket.remoteAddress||'unknown').digest('hex');
    for(const [id,value]of buckets)if(value.expires<=now())buckets.delete(id);
    if(!buckets.has(key)){
      if(buckets.size>=10000)return null;
      buckets.set(key,{expires:now()+15*60*1000,attempts:0,lastSuccess:0});
    }
    return buckets.get(key);
  };
  return {mailer,token,valid,handle:async(req,res)=>{
    res.set('Cache-Control','no-store');
    const redirect=status=>res.redirect(303,`/contact/?inquiry=${status}#inquiry-result`);
    const bucket=getBucket(req);
    if(!bucket||++bucket.attempts>10||(bucket.lastSuccess&&now()-bucket.lastSuccess<60000))return redirect('limited');
    const origin=req.get('origin');
    if(origin&&origin!==`${req.protocol}://${req.get('host')}`)return redirect('expired');
    const cookies=String(req.get('cookie')||'').split(';').map(s=>s.trim());
    const cookie=cookies.find(c=>c.startsWith('wsa_csrf='))?.slice('wsa_csrf='.length);
    const body=req.body||{};
    if(!valid(body.csrf,cookie))return redirect('expired');
    const fields=['name','email','phone','vehicle','message','consent','website'];
    if(fields.some(field=>body[field]!==undefined&&typeof body[field]!=='string'))return redirect('invalid');
    const data=Object.fromEntries(fields.map(field=>[field,(body[field]||'').trim()]));
    if(data.website||!data.name||data.name.length>120||/[\r\n]/.test(data.name)||!emailValid(data.email)||data.phone.length>40||data.vehicle.length>160||data.message.length<10||data.message.length>5000||data.consent!=='1')return redirect('invalid');
    if(!mailer.configured)return redirect('unavailable');
    // Set the cooldown before awaiting delivery so concurrent requests cannot duplicate mail.
    bucket.lastSuccess=now();
    try{await mailer.send(data);return redirect('sent');}
    catch{bucket.lastSuccess=0;console.error('Inquiry email delivery failed; no inquiry content was logged.');return redirect('failed');}
  }};
}
