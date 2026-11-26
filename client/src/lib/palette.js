const storageKey='yawmeh.palette';
export const palettes=['lime','ocean','coral','emerald'];

export function getPalette(){
  try{
    const value=localStorage.getItem(storageKey);
    return palettes.includes(value)?value:'lime';
  }catch{return 'lime';}
}

export function applyPalette(name){
  if(name==='lime')delete document.documentElement.dataset.palette;
  else if(palettes.includes(name))document.documentElement.dataset.palette=name;
}

export function setPalette(name){
  if(!palettes.includes(name))return;
  applyPalette(name);
  try{localStorage.setItem(storageKey,name);}catch{}
}
