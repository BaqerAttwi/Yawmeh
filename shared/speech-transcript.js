// Some mobile recognizers return growing sentence snapshots as separate results.
// Merge overlap between results; never remove repeated words within a result.
export function speechTranscript(results){
 let words=[];
 for(const result of Array.from(results)){
  const next=String(result?.[0]?.transcript||'').trim().split(/\s+/).filter(Boolean);
  if(!next.length)continue;
  const lower=value=>value.toLocaleLowerCase().replace(/[.,!?،؟]+$/,'');
  const same=(a,b)=>lower(a)===lower(b);
  if(words.length&&next.length>=words.length&&words.every((w,i)=>same(w,next[i]))){words=next;continue;}
  let overlap=0;
  for(let size=Math.min(words.length,next.length);size>=2;size--)if(next.slice(0,size).every((w,i)=>same(w,words[words.length-size+i]))){overlap=size;break;}
  words.push(...next.slice(overlap));
 }
 return words.join(' ').slice(0,1000);
}
