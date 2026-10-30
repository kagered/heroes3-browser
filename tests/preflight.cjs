const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {indexedDB}=require('fake-indexeddb');
const source=fs.readFileSync('src/preflight.js','utf8');
const openStorage=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('preflight-tests',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
function setup({workerFails=false,quota=1e9}={}){
 let terminated=0,revoked=0;
 const window={isSecureContext:true,crossOriginIsolated:true};
 class Worker {postMessage(buffer){queueMicrotask(()=>{if(workerFails)this.onerror();else{Atomics.store(new Int32Array(buffer),0,7);this.onmessage({data:'ok'})}})}terminate(){terminated++}}
 const context={window,WebAssembly,SharedArrayBuffer,Atomics,Worker,Blob,Uint8Array,Int32Array,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++},navigator:{storage:{estimate:async()=>({usage:0,quota})}},document:{createElement:()=>({getContext:()=>({})})},setTimeout,clearTimeout,localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}};
 vm.runInNewContext(source,context);return {context,window,counts:()=>[terminated,revoked]};
}
(async()=>{
 console.log('starting'); let env=setup();let result=await env.window.heroesPreflight.check({openStorage,requiredBytes:100});assert.equal(result.errors.length,0);assert.equal(result.warnings.length,0);assert.deepEqual(env.counts(),[1,1]);assert.equal(env.window.heroesPreferences.getItem('x'),null);env.window.heroesPreferences.setItem('x','y');
 console.log('first probe done'); const db=await openStorage();const count=await new Promise(resolve=>{const r=db.transaction('assets').objectStore('assets').count();r.onsuccess=()=>resolve(r.result)});assert.equal(count,0);db.close();
 env=setup({quota:10});result=await env.window.heroesPreflight.check({openStorage,requiredBytes:100});assert.equal(result.errors.length,0);assert.equal(result.warnings.length,1);
 env=setup({workerFails:true});result=await env.window.heroesPreflight.check({openStorage});assert.equal(result.errors.length,1);assert.deepEqual(env.counts(),[1,1]);
 env=setup();env.window.crossOriginIsolated=false;result=await env.window.heroesPreflight.check({openStorage});assert.equal(result.errors.length,1);assert.deepEqual(env.counts(),[0,0]);
 env=setup();result=await env.window.heroesPreflight.check({openStorage:async()=>{throw Error('denied')}});assert.equal(result.errors.length,1);
 env=setup();env.context.WebAssembly=undefined;result=await env.window.heroesPreflight.check({openStorage});assert.equal(result.errors.length,1);
 env=setup();env.context.navigator.storage.estimate=async()=>{throw Error('unavailable')};result=await env.window.heroesPreflight.check({openStorage});assert.equal(result.errors.length,0);
 console.log('PASS: compatibility, real IndexedDB transaction cleanup, storage denial, low quota, worker failure and cleanup, missing WASM, optional estimate, blocked preferences');
})().catch(e=>{console.error(e);process.exit(1)});
