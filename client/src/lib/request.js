export async function request(path, method='GET', body, {timeoutMs=20000,signal}={}) {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  const cancel=()=>controller.abort();
  if(signal?.aborted)cancel();
  else signal?.addEventListener('abort',cancel,{once:true});
  try{
  const response=await fetch('/api'+path,{method,credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  let result;try{result=await response.json();}catch(error){if(error.name==='AbortError')throw error;throw new Error('The server is unavailable. Please try again shortly.');}
  if(!response.ok){const error=new Error(result.error||'Request failed.');error.status=response.status;error.code=result.code;throw error;}
  return result;
  }catch(error){
   if(error.name!=='AbortError'||signal?.aborted)throw error;
   const failure=new Error('The connection is taking too long. Please try again.');
   failure.code='request_timeout';
   throw failure;
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
