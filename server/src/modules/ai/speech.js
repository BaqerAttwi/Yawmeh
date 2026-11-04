import {z} from 'zod';
import rateLimit from 'express-rate-limit';
import express from 'express';
import {hasAccess} from '../../../../shared/access.js';

export const speechSchema=z.object({text:z.string().trim().min(1).max(3000),language:z.enum(['en','ar']),voice:z.enum(['marin','cedar']).default('marin'),avatar:z.enum(['sage','nova','pip']).default('sage'),speed:z.number().min(.85).max(1.1).default(1)}).strict();
export const speechAvailable=env=>env.COMPANION_VOICE_ENABLED==='true'&&!!env.OPENAI_API_KEY;
export function speechRequest(value,env) {
 const input=speechSchema.parse(value);
 const styles={sage:'Warm, calm and reassuring.',nova:'Bright, curious and encouraging.',pip:'Friendly, crisp and practical.'};
 return {url:'https://api.openai.com/v1/audio/speech',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.OPENAI_API_KEY}`},body:{model:'gpt-4o-mini-tts',voice:input.voice,input:input.text,response_format:'mp3',speed:input.speed,instructions:`Read the supplied text faithfully. Do not add words or change numbers. ${styles[input.avatar]} ${input.language==='ar'?'Use a natural Lebanese Arabic accent. Preserve English names and currency codes.':'Use clear, natural conversational English.'}`}};
}

export function mountSpeech(app,{env=process.env,fetchSpeech=fetch}={}) {
 const permitted=(req,res,next)=>hasAccess(req.user,'tasks')||hasAccess(req.user,'money')?next():res.status(403).json({error:'Companion access is required.'});
 app.get('/api/companion/voice',permitted,(req,res)=>res.json({available:speechAvailable(env),voices:['marin','cedar']}));
 const limiter=rateLimit({windowMs:60000,limit:8,keyGenerator:req=>String(req.user.id),standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Voice limit reached. Try again in a minute or use device voices.'}});
 const daily=rateLimit({windowMs:86400000,limit:100,keyGenerator:req=>String(req.user.id),standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Daily voice limit reached. Use device voices or try tomorrow.'}});
 app.get('/api/companion/transcription',permitted,(req,res)=>res.json({available:speechAvailable(env)}));
 app.post('/api/companion/transcription',permitted,limiter,daily,express.raw({type:['audio/webm','audio/mp4','audio/ogg','audio/wav'],limit:'8mb'}),async(req,res)=>{
  if(!speechAvailable(env))return res.status(503).json({error:'Speech transcription is not configured.'});
  const type=(req.headers['content-type']||'').split(';')[0];
  const extensions={'audio/webm':'webm','audio/mp4':'mp4','audio/ogg':'ogg','audio/wav':'wav'};
  if(!extensions[type]||!Buffer.isBuffer(req.body)||!req.body.length)return res.status(400).json({error:'Send a non-empty supported audio recording.'});
  if(!['auto','en','ar'].includes(req.query.language||'auto'))return res.status(400).json({error:'Unsupported language.'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  const cancel=()=>controller.abort();req.on('aborted',cancel);res.on('close',cancel);
  try{
   const form=new FormData();form.append('file',new Blob([req.body],{type}),'speech.'+extensions[type]);
   form.append('model','gpt-4o-transcribe');form.append('response_format','json');
   if(req.query.language&&req.query.language!=='auto')form.append('language',req.query.language);
   form.append('prompt','Transcribe faithfully in the original language. Speech may mix Lebanese Arabic and English. Preserve names, numbers, times, USD and LBP. Do not answer the speaker or add words.');
   const upstream=await fetchSpeech('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},body:form,signal:controller.signal,redirect:'error'});
   if(!upstream.ok)throw new Error('provider');
   const chunks=[];let size=0;
   for await(const chunk of upstream.body){size+=chunk.length;if(size>32768){controller.abort();throw new Error('size');}chunks.push(Buffer.from(chunk));}
   const result=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(typeof result.text!=='string'||result.text.trim().length>1000)throw new Error('transcript');
   if(!res.destroyed)res.json({text:result.text.trim()});
  }catch{if(!res.destroyed)res.status(502).json({error:'Could not transcribe this recording. Try again or use browser recognition.'});}
  finally{clearTimeout(timer);req.off('aborted',cancel);res.off('close',cancel);}
 });
 app.post('/api/companion/speech',permitted,limiter,daily,async(req,res)=>{
  const value=speechSchema.parse(req.body);
  if(!speechAvailable(env))return res.status(503).json({error:'Natural voice is not configured. Use device voices.'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  const cancel=()=>controller.abort();req.on('aborted',cancel);res.on('close',cancel);
  try{
   const request=speechRequest(value,env);
   const upstream=await fetchSpeech(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(request.body),signal:controller.signal,redirect:'error'});
   if(!upstream.ok||!upstream.headers.get('content-type')?.startsWith('audio/'))throw new Error('provider');
   const chunks=[];let size=0;
   for await(const chunk of upstream.body){size+=chunk.length;if(size>8*1024*1024){controller.abort();throw new Error('size');}chunks.push(chunk);}
   if(!size)throw new Error('empty');
   if(!res.destroyed)res.type('audio/mpeg').send(Buffer.concat(chunks));
  }catch{if(!res.destroyed)res.status(502).json({error:'Natural voice is unavailable. Try device voices.'});}
  finally{clearTimeout(timer);req.off('aborted',cancel);res.off('close',cancel);}
 });
}
