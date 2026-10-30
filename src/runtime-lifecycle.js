/* Own browser resources created while the WASM game is running. */
'use strict';
window.createGameRuntime = function(canvas) {
  const host = window;
  const originals = new Map();
  const workers = new Set(), frames = new Set(), timeouts = new Set(), intervals = new Set(), audio = new Set(), contexts = new Set();
  let active = true, stopped;
  const nativeTimeout = host.setTimeout.bind(host);
  function patch(name, replacement) {
    originals.set(name, host[name]); host[name] = replacement;
  }
  function trackConstructor(name, collection) {
    const Constructor = host[name];
    if (typeof Constructor !== 'function') return;
    patch(name, new Proxy(Constructor, {construct(target, args, newTarget) {
      const resource = Reflect.construct(target,args,newTarget);
      if (active) collection.add(resource);
      return resource;
    }}));
  }
  trackConstructor('Worker',workers);
  trackConstructor('AudioContext',audio);
  trackConstructor('webkitAudioContext',audio);
  const request = host.requestAnimationFrame;
  const cancel = host.cancelAnimationFrame;
  if (request && cancel) {
    patch('requestAnimationFrame', callback => {
      let id = request.call(host,time => {frames.delete(id);if(active)callback(time);});
      frames.add(id); return id;
    });
    patch('cancelAnimationFrame', id => {frames.delete(id);cancel.call(host,id);});
  }
  const timeout=host.setTimeout, clearTimeout=host.clearTimeout;
  const interval=host.setInterval, clearInterval=host.clearInterval;
  patch('setTimeout',(callback,delay,...args)=>{
    const id=timeout.call(host,(...values)=>{timeouts.delete(id);if(active && typeof callback==='function')callback(...values);},delay,...args);
    timeouts.add(id);return id;
  });
  patch('clearTimeout',id=>{timeouts.delete(id);clearTimeout.call(host,id);});
  patch('setInterval',(callback,delay,...args)=>{
    const id=interval.call(host,(...values)=>{if(active && typeof callback==='function')callback(...values);},delay,...args);
    intervals.add(id);return id;
  });
  patch('clearInterval',id=>{intervals.delete(id);clearInterval.call(host,id);});
  const getContext=canvas.getContext;
  canvas.getContext=function(...args){const context=getContext.apply(this,args);if(context)contexts.add(context);return context;};
  function stop(module) {
    if (stopped) return stopped;
    active=false;
    const counts={workers:workers.size,audio:audio.size,frames:frames.size};
    for(const worker of workers){try{worker.terminate();}catch{}}
    workers.clear();
    for(const id of frames)cancel.call(host,id);
    for(const id of timeouts)clearTimeout.call(host,id);
    for(const id of intervals)clearInterval.call(host,id);
    frames.clear();timeouts.clear();intervals.clear();
    for(const [name,original] of originals)host[name]=original;
    originals.clear();canvas.getContext=getContext;
    // SDL may expose an AudioContext created outside the tracked constructor.
    const sdl=module?.SDL2;
    if(sdl?.audioContext)audio.add(sdl.audioContext);
    for(const node of [sdl?.audio?.scriptProcessorNode,sdl?.capture?.scriptProcessorNode]) {
      try{if(node){node.onaudioprocess=null;node.disconnect();}}catch{}
    }
    const closing=[];
    for(const context of audio){try{if(context.state!=='closed')closing.push(Promise.resolve(context.close()).catch(()=>{}));}catch{}}
    audio.clear();
    for(const context of contexts){try{context.getExtension?.('WEBGL_lose_context')?.loseContext();}catch{}}
    contexts.clear();canvas.width=1;canvas.height=1;
    stopped=Promise.race([Promise.all(closing),new Promise(resolve=>nativeTimeout(resolve,250))]).then(()=>counts);
    host.removeEventListener('pagehide',unload);
    return stopped;
  }
  function unload(){void stop(null);}
  host.addEventListener('pagehide',unload,{once:true});
  return {stop};
};
