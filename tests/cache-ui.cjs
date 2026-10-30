const fs=require('fs'),vm=require('vm'),assert=require('assert');const {indexedDB}=require('fake-indexeddb');
const openDB=()=>new Promise(resolve=>{const r=indexedDB.open('cache-ui',1);r.onupgradeneeded=()=>{for(const name of ['assets','files'])r.result.createObjectStore(name)};r.onsuccess=()=>resolve(r.result)});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
(async()=>{
 const db=await openDB();let tx=db.transaction(['assets','files'],'readwrite');tx.objectStore('assets').put(new Uint8Array(10),'ru:/game-data/ru/Data/test.lod');tx.objectStore('assets').put(new Uint8Array(20),'en:/game-data/en/Data/test.lod');tx.objectStore('files').put(new Uint8Array([9]),'/Saves/a.vsgm1');await done(tx);db.close();
 const elements=new Map();const make=()=>({hidden:false,disabled:false,dataset:{},attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,v){this.events[k]=v},focus(){}});const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
 const buttons=['ru','en','all'].map(scope=>Object.assign(make(),{dataset:{cacheClear:scope}}));const panel=get('cache-panel');panel.querySelectorAll=()=>buttons;panel.open=true;
 const context={window:{HEROES_STATIC:{inventories:{ru:{files:[{path:'Data/test.lod',size:10,version:'ru'}]},en:{files:[{path:'Data/test.lod',size:20,version:'en'}]}}}},document:{getElementById:get,documentElement:{lang:'en'}},openDB,console};vm.createContext(context);vm.runInContext(fs.readFileSync('src/cache-core.js','utf8'),context);vm.runInContext(fs.readFileSync('src/cache.js','utf8'),context);
 async function idle(){for(let i=0;i<1000;i++){await new Promise(resolve=>setImmediate(resolve));if(panel.attrs['aria-busy']==='false')return;}throw Error('UI did not finish')}
 panel.events.toggle();let prevented=false;get('start').events.click({preventDefault(){prevented=true},stopImmediatePropagation(){}});assert(prevented);await idle();assert(!buttons[0].disabled);
 buttons[0].onclick();assert.equal(get('cache-confirmation').hidden,false);assert(get('cache-confirm-text').textContent.includes('Russian'));get('cache-cancel').onclick();assert(get('cache-confirmation').hidden);
 buttons[0].onclick();get('cache-confirm').onclick();await idle();assert(buttons[0].disabled);assert(!buttons[1].disabled);assert(get('cache-status').textContent.includes('saves are still here'));
 context.document.documentElement.lang='ru';buttons[2].onclick();assert(get('cache-confirm-text').textContent.includes('всех скачанных'));get('cache-confirm').onclick();await idle();assert(buttons.every(button=>button.disabled));assert(get('cache-status').textContent.includes('Сохранения остались'));
 console.log('PASS: UI refresh, launch guard, confirmation, cancellation, RU/EN, selective and full cleanup, empty-cache buttons');
})().catch(e=>{console.error(e);process.exit(1)});
