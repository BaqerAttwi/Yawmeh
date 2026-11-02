import {z} from 'zod';
export const currencyCodeSchema=z.string().trim().min(1).max(40).refine(v=>!['__proto__','constructor','prototype'].includes(v.toLowerCase())&&!/[\u0000-\u001f]/.test(v),'Choose a readable currency name or symbol');
export const rateSchema=z.coerce.number().positive().max(1000000).refine(v=>Math.abs(v*1e6-Math.round(v*1e6))<0.0001,'Use at most six decimal places');
const json=value=>typeof value==='string'?JSON.parse(value):value;
export function currencyCatalog(settings={}) {
 return [{code:'USD',name:'US dollar',symbol:'$',rate:1},{code:'LBP',name:'Lebanese pound',symbol:'LBP',rate:Number(settings.current_rate)||null},...(json(settings.custom_currencies)||[])];
}
export const currencyLabel=c=>c.name&&c.symbol?`${c.name} (${c.symbol})`:c.name||c.symbol||c.code;
export const currencyOf = entry => entry.currency || 'USD';
export function savedRates(entry){return json(entry.rate_snapshot)||null;}
export function entryCents(entry, display='USD', field='amount') {
 const raw=Math.round(Number(entry[field] || 0)*100),source=currencyOf(entry);
 if(source===display || raw===0)return raw;
 const snapshot=savedRates(entry);
 if(snapshot){const from=Object.hasOwn(snapshot,source)?Number(snapshot[source].rate):NaN,to=Object.hasOwn(snapshot,display)?Number(snapshot[display].rate):NaN;return from>0&&to>0?Math.round(raw/from*to):NaN;}
 // Earlier USD/LBP entries keep their original rate convention.
 const rate=Number(entry.exchange_rate);
 if(!['USD','LBP'].includes(source)||!['USD','LBP'].includes(display)||!Number.isFinite(rate)||rate<=0)return NaN;
 return Math.round(display==='USD'?raw/rate:raw*rate);
}
export function formatMoney(value,currency='USD',catalog=[]) {
 if(!Number.isFinite(value))return 'Unavailable (missing historical rate)';
 if(currency==='USD'||currency==='LBP')return new Intl.NumberFormat('en-US',{style:'currency',currency,currencyDisplay:currency==='LBP'?'code':'symbol',minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100);
 const info=Array.isArray(catalog)?catalog.find(c=>c.code===currency):catalog?.[currency];
 const label=info?currencyLabel(info):currency;
 return `${label} ${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100)}`;
}
export const nativeEntries=(entries,currency)=>entries.filter(e=>currencyOf(e)===currency);
export function rateLabel(entry){const snapshot=savedRates(entry),code=currencyOf(entry);if(snapshot)return `1 USD = ${Number(snapshot[code]?.rate).toLocaleString('en-US',{maximumFractionDigits:6})} ${code} · saved rate`;return entry.exchange_rate?`1 USD = ${Number(entry.exchange_rate).toLocaleString('en-US',{maximumFractionDigits:6})} LBP · saved rate`:'Legacy USD record · historical rate unavailable';}
export const currencyInputSchema=z.object({name:z.string().trim().max(40).default(''),symbol:z.string().trim().max(12).default(''),rate:rateSchema,reference:currencyCodeSchema.default('USD')}).strict().refine(v=>v.name||v.symbol,'Enter a name, a symbol, or both');
export function currencyDefinition(input,settings){const value=currencyInputSchema.parse(input),code=currencyCodeSchema.parse(value.name||value.symbol),catalog=currencyCatalog(settings),reference=catalog.find(c=>c.code===value.reference);if(!reference?.rate)throw new Error('Set the reference currency rate first.');if(catalog.some(c=>c.code.toLowerCase()===code.toLowerCase()))throw new Error('This currency already exists. Update its rate instead.');if(catalog.length>=22)throw new Error('You can add up to 20 custom currencies.');return {code,name:value.name,symbol:value.symbol,rate:rateSchema.parse(Math.round(value.rate*reference.rate*1e6)/1e6)};}
export function captureRates(entry,settings){const catalog=currencyCatalog(settings),code=currencyOf(entry),source=catalog.find(c=>c.code===code);if(!source)throw new Error('Add this currency in Settings first.');
 const rates=Object.fromEntries(catalog.filter(c=>c.rate>0).map(c=>[c.code,{rate:Number(c.rate),name:c.name,symbol:c.symbol}]));
 if(entry.unit_rate!==undefined){const reference=entry.rate_reference||'USD',base=rates[reference]?.rate;if(!base)throw new Error('Set the reference currency rate first.');const rate=rateSchema.parse(Math.round(entry.unit_rate*base*1e6)/1e6);if(code==='USD'&&rate!==1)throw new Error('USD is the fixed reference and must equal 1 USD.');rates[code]={rate,name:source.name,symbol:source.symbol};}
 else if(entry.exchange_rate!==undefined&&['USD','LBP'].includes(code)){rates.LBP={rate:entry.exchange_rate,name:'Lebanese pound',symbol:'LBP'};}
 if(!rates[code])throw new Error('Enter an exchange rate for this currency.');
 // Legacy clients used exchange_rate as LBP per USD; new records carry the complete map.
 const {unit_rate,rate_reference,...raw}=entry;return {...raw,currency:code,exchange_rate:rates[code].rate,rate_snapshot:rates};
}
