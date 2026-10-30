/* Verified resource downloads. Only assets are read or changed. */
'use strict';
window.HeroesDownloads = (() => {
  class ResourceError extends Error {
    constructor(code,retryable=true){super(code);this.code=code;this.retryable=retryable;this.downloadFailure=true;}
  }
  const hex=bytes=>Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function transaction(database,mode,action){
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('assets',mode);const request=action(tx.objectStore('assets'));
      tx.oncomplete=()=>resolve(request?.result);
      tx.onabort=tx.onerror=()=>reject(tx.error||new Error('cache'));
    });
  }
  async function verifyCached(data,{size,hash,onProgress}){
    if(!(data instanceof Uint8Array) || (size!==undefined && data.length!==size))return false;
    if(!hash){onProgress?.(data.length,true);return true;}
    const digest=window.heroesSHA256.create();let lastYield=Date.now();
    try{
      for(let i=0;i<data.length;i+=1048576){
        const end=Math.min(i+1048576,data.length);digest.update(data.subarray(i,end));onProgress?.(end,true);
        if(Date.now()-lastYield>16){await pause(0);lastYield=Date.now();}
      }
      return hex(digest.digest())===hash;
    }finally{digest.destroy();}
  }
  async function receive(url,{fetchResource,size,hash,onProgress,timeoutMs,forceReload},state){
    const controller=new AbortController();let timer,reader,complete=false,timedOut=false;
    let rejectAbort;const aborted=new Promise((_,reject)=>{rejectAbort=reject;});
    controller.signal.addEventListener('abort',()=>rejectAbort(new ResourceError(timedOut?'timeout':'network')),{once:true});
    const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);};
    const digest=hash?window.heroesSHA256.create():null;
    reset();
    try{
      const response=await Promise.race([fetchResource(url,{signal:controller.signal,cache:forceReload?'reload':'default'}),aborted]);
      if(!response.ok)throw new ResourceError('http-'+response.status,response.status===408||response.status===429||response.status>=500);
      reset();
      const header=Number(response.headers.get('Content-Length'));
      const expected=size??(Number.isSafeInteger(header)&&header>0?header:undefined);
      let data;
      if(response.body && expected!==undefined){
        if(!state.buffer || state.buffer.length!==expected)state.buffer=new Uint8Array(expected);
        data=state.buffer;reader=response.body.getReader();let offset=0;
        while(true){
          const chunk=await Promise.race([reader.read(),aborted]);
          if(chunk.done)break;
          reset();
          if(offset+chunk.value.length>expected)throw new ResourceError('size');
          data.set(chunk.value,offset);offset+=chunk.value.length;digest?.update(chunk.value);onProgress?.(offset,false);
        }
        if(offset!==expected)throw new ResourceError('size');
      }else{
        data=new Uint8Array(await Promise.race([response.arrayBuffer(),aborted]));
        if(expected!==undefined && data.length!==expected)throw new ResourceError('size');
        digest?.update(data);onProgress?.(data.length,false);
      }
      clearTimeout(timer);
      if(digest && hex(digest.digest())!==hash)throw new ResourceError('integrity');
      complete=true;return data;
    }catch(error){
      if(error instanceof ResourceError)throw error;
      // Allocation/runtime errors should reach the launch handler, not trigger retries.
      if(error instanceof RangeError || error?.name==='RangeError')throw error;
      throw new ResourceError(timedOut?'timeout':'network');
    }finally{
      clearTimeout(timer);digest?.destroy();
      if(!complete){controller.abort();if(reader)void reader.cancel().catch(()=>{});}
      try{reader?.releaseLock();}catch{}
    }
  }
  async function load({database,url,key,size,hash,fetchResource=fetch,onProgress,onState,attempts=3,timeoutMs=30000,retryDelay=1000}){
    let cached;const state={};
    try{cached=await transaction(database,'readonly',store=>store.get(key));}
    catch{onState?.({kind:'cache-unavailable'});}
    let forceReload=false;
    if(cached!==undefined){
      if(await verifyCached(cached,{size,hash,onProgress}))return cached;
      onState?.({kind:'invalid-cache'});forceReload=true;
      // Reuse a damaged resource's buffer, avoiding a second large allocation.
      if(cached instanceof Uint8Array && cached.length===size)state.buffer=cached;
      try{await transaction(database,'readwrite',store=>store.delete(key));}
      catch{onState?.({kind:'cache-unavailable'});}
      cached=undefined;
    }
    for(let attempt=1;attempt<=attempts;attempt++){
      try{
        const data=await receive(url,{fetchResource,size,hash,onProgress,timeoutMs,forceReload},state);
        try{await transaction(database,'readwrite',store=>store.put(data,key));}
        catch{onState?.({kind:'cache-unavailable'});}
        return data;
      }catch(error){
        if(!error.downloadFailure || !error.retryable || attempt===attempts)throw error;
        forceReload ||= error.code==='integrity'||error.code==='size';
        onState?.({kind:'retry',attempt:attempt+1,attempts,code:error.code});
        await pause(retryDelay*attempt);
      }
    }
  }
  return {load,ResourceError};
})();
