let pending=null;
export const installationPrompt=()=>pending;
export const clearInstallationPrompt=()=>{pending=null;};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;window.dispatchEvent(new Event('yawmeh-install-ready'));});
window.addEventListener('appinstalled',clearInstallationPrompt);
