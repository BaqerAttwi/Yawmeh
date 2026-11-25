import React,{useEffect,useRef,useState} from 'react';
import {Camera,Image} from 'lucide-react';
import {request} from '../../lib/request.js';
import {companionRequestTimeoutMs} from '../../../../shared/companion-status.js';

async function jpegData(file){
  if(file.size>25*1024*1024||file.type==='image/svg+xml')throw new Error('photo');
  const url=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
  const photo=new window.Image();
  photo.src=url;
  await photo.decode();
  const scale=Math.min(1,2200/Math.max(photo.naturalWidth,photo.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(photo.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(photo.naturalHeight*scale));
  const context=canvas.getContext('2d',{alpha:false});
  context.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--image-matte').trim();
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(photo,0,0,canvas.width,canvas.height);
  for(const quality of [.86,.72,.56]){
    const encoded=canvas.toDataURL('image/jpeg',quality).split(',')[1];
    if(encoded?.length&&encoded.length<=1000000)return encoded;
  }
  throw new Error('photo');
}

export function ReceiptScan({available,busy,language,onReview}){
  const ar=language==='ar',t=(en,arabic)=>ar?arabic:en;
  const camera=useRef(),gallery=useRef(),active=useRef(null);
  const [scanning,setScanning]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>{active.current?.abort();},[]);
  async function scan(event){
    const file=event.currentTarget.files[0];event.currentTarget.value='';
    if(!file||active.current||!available||busy)return;
    const controller=new AbortController();
    active.current=controller;setScanning(true);setError('');
    try{
      const image=await jpegData(file).catch(()=>{throw new Error('photo');});
      if(controller.signal.aborted)return;
      const result=await request('/companion/receipt','POST',{image},{timeoutMs:companionRequestTimeoutMs,signal:controller.signal});
      if(!controller.signal.aborted)onReview(result);
    }catch(failure){
      if(controller.signal.aborted)return;
      setError(failure.message==='photo'
        ?t('Choose a readable photo under 25 MB.','اختار صورة واضحة حجمها أقل من ٢٥ ميغابايت.')
        :failure.status===429?t('The scan limit was reached. Try again later or log the expense manually.','وصلت لحدّ المسح. جرّب بعدين أو سجّل المصروف بإيدك.')
        :t('Couldn’t read the receipt. Try a clearer photo or log the expense manually.','ما قدرنا نقرا الإيصال. جرّب صورة أوضح أو سجّل المصروف بإيدك.'));
    }finally{
      active.current=null;
      if(!controller.signal.aborted)setScanning(false);
    }
  }
  return <div className="companion-tools">
    <strong>{t('Scan a receipt','مسح إيصال')}</strong>
    <small>{available?t('Your photo is sent to Google Gemini to read the receipt. Yawmeh keeps no copy of the photo.','الصورة بتنبعت لـ Google Gemini ليقرا الإيصال. يومِه ما بيحتفظ بنسخة منها.'):t('Receipt scanning needs the online AI connection. You can still add an expense manually.','مسح الإيصال بده اتصال بالذكاء الاصطناعي. فيك بعدك تضيف المصروف بإيدك.')}</small>
    <div className="button-row">
      <button type="button" disabled={!available||busy||scanning} onClick={()=>camera.current?.click()}><Camera size={15}/>{t('Snap a receipt','صوّر الإيصال')}</button>
      <button type="button" disabled={!available||busy||scanning} onClick={()=>gallery.current?.click()}><Image size={15}/>{t('Choose photo','اختار صورة')}</button>
    </div>
    <input type="file" accept="image/*" capture="environment" ref={camera} hidden onChange={scan}/>
    <input type="file" accept="image/*" ref={gallery} hidden onChange={scan}/>
    {scanning&&<small role="status">{t('Reading receipt…','عم نقرا الإيصال…')}</small>}
    {error&&<small role="alert">{error}</small>}
  </div>;
}
