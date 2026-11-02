import {isIP} from 'node:net';

// Trust only explicitly named proxy addresses, never every forwarded header.
export function trustedProxies(env=process.env) {
 const value=env.TRUST_PROXY?.trim();
 if(!value)return false;
 const addresses=value.split(',').map(value=>value.trim());
 for(const address of addresses){
  if(address==='loopback')continue;
  const [ip,prefix,...extra]=address.split('/'),family=isIP(ip);
  if(!family||extra.length||(prefix!==undefined&&(!/^\d+$/.test(prefix)||Number(prefix)<1||Number(prefix)>(family===4?32:128))))throw new Error('TRUST_PROXY must list trusted IP addresses or non-zero CIDRs (or loopback).');
 }
 return addresses;
}

// Fail closed for an explicitly production deployment; local HTTP stays supported.
export function validateProductionSecurity(env=process.env) {
 trustedProxies(env);
 if(env.NODE_ENV!=='production')return;
 if(env.COOKIE_SECURE!=='true')throw new Error('Production requires COOKIE_SECURE=true and an HTTPS reverse proxy.');
 let origin;
 try {origin=new URL(env.APP_ORIGIN);}catch {throw new Error('Production requires APP_ORIGIN set to the public HTTPS origin.');}
 if(origin.protocol!=='https:' || origin.username || origin.password || origin.pathname!=='/' || origin.search || origin.hash)throw new Error('APP_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment.');
 if(!env.MYSQL_PASSWORD||env.MYSQL_PASSWORD.length<12||/^(change-me|replace|password$)/i.test(env.MYSQL_PASSWORD))throw new Error('Production requires a non-placeholder MYSQL_PASSWORD of at least 12 characters.');
 if(env.MYSQL_USER==='root')throw new Error('Use a dedicated MySQL account instead of root in production.');
 try{new Intl.DateTimeFormat('en',{timeZone:env.TIMEZONE||'Asia/Beirut'}).format();}catch{throw new Error('TIMEZONE must be a valid timezone.');}
}
