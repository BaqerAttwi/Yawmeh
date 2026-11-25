const storageKey='yawmeh:theme';
const themes=['light','dark','system'];

export function getTheme(){
  try{
    const stored=localStorage.getItem(storageKey);
    return themes.includes(stored)?stored:'system';
  }catch{return 'system';}
}

export function applyTheme(theme){
  if(theme==='system')delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=theme;
}

export function setTheme(theme){
  if(!themes.includes(theme))return;
  applyTheme(theme);
  try{localStorage.setItem(storageKey,theme);}catch{}
}

applyTheme(getTheme());
window.addEventListener('storage',event=>{
  if(event.key===storageKey||event.key===null)applyTheme(getTheme());
});
