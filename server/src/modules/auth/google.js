import {OAuth2Client} from 'google-auth-library';
import {randomBytes,createHash} from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {hashPassword,tokenHash} from './passwords.js';
import {accountEnabled} from '../../../../shared/account-access.js';
import {sendSignupGreeting} from './signup.js';

export function googleConfigured(env=process.env){
 if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.APP_ORIGIN)return false;
 try{const url=new URL(env.APP_ORIGIN);return url.protocol==='https:'||(env.NODE_ENV!=='production'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname));}catch{return false;}
}
export function mountGoogle(router,{store,issueSession,env=process.env,sendGreeting=sendSignupGreeting,makeClient=options=>new OAuth2Client(options)}){
 const cookie='daywell_google_state',cookieOptions=()=>({httpOnly:true,secure:env.COOKIE_SECURE==='true',sameSite:'lax',path:'/api/auth/google',maxAge:10*60000});
 const limiter=rateLimit({windowMs:15*60000,limit:15,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many Google sign-in attempts. Try again later.'}});
 const redirect=()=>new URL('/api/auth/google/callback',env.APP_ORIGIN).toString();
 const client=()=>makeClient({clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,redirectUri:redirect(),transporterOptions:{timeout:10000,retry:false}});
 router.get('/google',limiter,async(req,res)=>{
  if(!googleConfigured(env))return res.status(503).json({error:'Google signup is not configured yet. Use email signup.'});
  const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url');
  await store.issueOAuthState(tokenHash(state),verifier,nonce);
  res.cookie(cookie,state,cookieOptions());
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for(const [key,value] of Object.entries({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:redirect(),response_type:'code',scope:'openid email profile',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}))url.searchParams.set(key,value);
  res.redirect(url.toString());
 });
 router.get('/google/callback',limiter,async(req,res)=>{
  if(!googleConfigured(env))return res.redirect('/#auth=google_unavailable');
  const state=req.query.state,code=req.query.code;
  const savedCookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookie+'='))?.slice(cookie.length+1);
  const {maxAge,...clearOptions}=cookieOptions();res.clearCookie(cookie,clearOptions);
  if(typeof state!=='string'||!/^[a-f0-9]{64}$/.test(state)||savedCookie!==state)return res.redirect('/#auth=google_failed');
  const saved=await store.consumeOAuthState(tokenHash(state));
  if(!saved||typeof code!=='string'||!code||code.length>4096)return res.redirect('/#auth=google_failed');
  try{
   const google=client(),{tokens}=await google.getToken({code,codeVerifier:saved.code_verifier,redirect_uri:redirect()});
   if(!tokens.id_token)throw new Error('missing-token');
   const ticket=await google.verifyIdToken({idToken:tokens.id_token,audience:env.GOOGLE_CLIENT_ID});const profile=ticket.getPayload();
   if(!profile||profile.nonce!==saved.nonce||profile.email_verified!==true||!['accounts.google.com','https://accounts.google.com'].includes(profile.iss)||typeof profile.sub!=='string'||!profile.sub||profile.sub.length>255||typeof profile.email!=='string'||profile.email.length>254||!profile.email.includes('@'))throw new Error('invalid-identity');
   let user=await store.findByGoogle(profile.sub);
   if(!user){
    const email=profile.email.toLowerCase();
    // Existing password accounts must authenticate separately before any linking.
    if(await store.findByEmail(email))return res.redirect('/#auth=google_existing_account');
    const name=String(profile.name||email.split('@')[0]).trim().slice(0,100)||'Member';
    const authoritativeEmail=email.endsWith('@gmail.com')||(typeof profile.hd==='string'&&!!profile.hd&&email.endsWith('@'+profile.hd.toLowerCase()));
    const id=await store.create({name,email,password_hash:await hashPassword(randomBytes(48).toString('hex')),google_sub:profile.sub,permissions:['money','tasks'],reminder_email:email,active:false,payment_status:'unpaid',access_expires_at:null,email_verified:authoritativeEmail});
    user={id,name,email,role:'user',active:false,payment_status:'unpaid'};
    const verificationToken=authoritativeEmail?undefined:randomBytes(32).toString('hex');
    if(verificationToken)await store.issueVerification(id,tokenHash(verificationToken));
    try{await sendGreeting(email,name,verificationToken);}catch{console.error('Google signup greeting delivery failed.');}
   }
   if(!accountEnabled(user))return res.redirect('/#auth=inactive');
   if(!await issueSession(user,req,res))return res.redirect('/#auth=inactive');
   return res.redirect('/');
  }catch{console.error('Google authentication failed.');return res.redirect('/#auth=google_failed');}
 });
}
