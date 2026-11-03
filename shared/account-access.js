export const OWNER_EMAIL='yawmehme@gmail.com';
export function accessExpiry(value){
 if(!value)return null;
 const text=String(value);const date=new Date(/Z$|[+-]\d\d:\d\d$/.test(text)?text:text.replace(' ','T')+'Z');
 return Number.isFinite(date.getTime())?date.toISOString():null;
}
export function accountEnabled(user,now=Date.now()){
 if(!user?.active)return false;
 if(user.role==='admin')return true;
 if(user.email_verified===false||user.email_verified===0)return false;
 if(!user.access_expires_at)return true;
 const expiry=accessExpiry(user.access_expires_at);return !!expiry&&new Date(expiry).getTime()>now;
}
export const inactiveAccount={code:'ACCOUNT_INACTIVE',error:'Your account is inactive. Please contact the owner to activate access.',ownerEmail:OWNER_EMAIL};
