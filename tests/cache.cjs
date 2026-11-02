const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {indexedDB}=require('fake-indexeddb');
const context={window:{},Map,Object,Promise,Number};vm.runInNewContext(fs.readFileSync('src/cache-core.js','utf8'),context);const api=context.window.HeroesCache;
context.window.HEROES_MOBILE_ENGINE={'vendor-mobile/vcmiclient.wasm':{size:123}};
assert.equal(api.catalog({}).get('engine-1.6.5:vendor-mobile/vcmiclient.wasm'),123);
const inventories={ru:{files:[{path:'Data/test.lod',size:10,version:'ru-hash'},{path:'Mp3/theme.mp3',size:4,version:'ignored-hash'}]},en:{files:[{path:'Data/test.lod',size:20,version:'en-hash'}]}};
const entries=[['ru-hash:/game-data/ru/Data/test.lod',10],['en-hash:/game-data/en/Data/test.lod',20],['ru-hash:/game-data/Data/test.lod?lang=ru',10],['en-hash:/game-data/Data/test.lod?lang=en',20],['engine-1.6.5:/game-data/ru/Mp3/theme.mp3',4],['old:/game-data/ru/Data/old.lod',3],['engine-1.6.5:vendor/vcmi.data',1],['unknown-resource',2]];
const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('cache-tests',1);r.onupgradeneeded=()=>{for(const name of ['assets','files','migrations'])r.result.createObjectStore(name)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
const read=(db,store,key)=>new Promise(resolve=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result)});
(async()=>{
 const db=await open();let tx=db.transaction(['assets','files','migrations'],'readwrite');for(const [key,size] of entries)tx.objectStore('assets').put(new Uint8Array(size),key);tx.objectStore('files').put(new Uint8Array([3,1,4]),'/Saves/game.vsgm1');tx.objectStore('migrations').put(true,'english-saves-v1');await done(tx);
 const sizes=api.catalog(inventories);let result=await api.summary(db,sizes);assert.equal(result.ru.bytes,24);assert.equal(result.ru.count,4);assert.equal(result.ru.unknown,1);assert.equal(result.en.bytes,40);assert.equal(result.shared.count,2);assert.equal(result.shared.bytes,7919378);assert.equal(result.shared.unknown,1);
 await assert.rejects(api.clear(db,'invalid'));result=await api.summary(db,sizes);assert.equal(result.en.count,2);
 await api.clear(db,'ru');result=await api.summary(db,sizes);assert.equal(result.ru.count,0);assert.equal(result.en.count,2);assert.equal(result.shared.count,2);assert.deepEqual([...await read(db,'files','/Saves/game.vsgm1')],[3,1,4]);
 await api.clear(db,'en');result=await api.summary(db,sizes);assert.equal(result.en.count,0);assert.equal(result.shared.count,2);
 await api.clear(db,'all');result=await api.summary(db,sizes);assert(Object.values(result).every(group=>group.count===0));assert.deepEqual([...await read(db,'files','/Saves/game.vsgm1')],[3,1,4]);assert.equal(await read(db,'migrations','english-saves-v1'),true);db.close();
 // Assert that counting/clearing only opens the assets store and uses key cursors.
 const guarded={transaction(name,mode){assert.equal(name,'assets');return {objectStore(){return {openKeyCursor(){throw Error('key-cursor-reached')},get(){throw Error('large-value-read')},openCursor(){throw Error('large-value-read')}}}}}};
 await assert.rejects(api.summary(guarded,sizes),/key-cursor-reached/);
 console.log('PASS: both URL formats, music, unknown sizes, language-specific removal, all resources, invalid scope, saves/migration preservation and key-only access');
})().catch(error=>{console.error(error);process.exit(1)});
