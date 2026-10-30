const {indexedDB, IDBKeyRange}=require('fake-indexeddb');
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('src/app.js','utf8');
const code=source.slice(source.indexOf('function openDB()'),source.indexOf('function write(path, data)'));
const context=vm.createContext({indexedDB,IDBKeyRange,Set,Map,setTimeout,clearTimeout,ui:(ru,en)=>en});
vm.runInContext('let db; const restored=new Map(); const write=(path,data)=>restored.set(path,data);'+code,context);
function open(name,version){return new Promise((resolve,reject)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>{r.result.createObjectStore('files');r.result.createObjectStore('assets')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(db,rows){return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');for(const [k,v] of rows)tx.objectStore('files').put(Uint8Array.of(v),k);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)})}
function rows(db){return new Promise((resolve,reject)=>{let result=[];const tx=db.transaction('files');const r=tx.objectStore('files').openCursor();r.onsuccess=()=>{const c=r.result;if(c){result.push([c.key,c.value[0]]);c.continue()}};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error)})}
(async()=>{
 let ru=await open('heroes3-local-saves',2);await put(ru,[['/Saves/Game.vsgm1',1],['/Saves/Game.vcgm1',2],['/Saves/Game (English).vsgm1',3]]);ru.close();
 let en=await open('heroes3-en-saves',2);await put(en,[['/Saves/Game.vsgm1',4],['/Saves/Game.vcgm1',5],['/Saves/Other.vsgm1',6]]);en.close();
 await vm.runInContext('(async()=>{db=await openDB();await migrateEnglishSaves(db)})()',context);
 const shared=vm.runInContext('db',context);let result=await rows(shared);
 assert.deepEqual(result,[['/Saves/Game (English 2).vcgm1',5],['/Saves/Game (English 2).vsgm1',4],['/Saves/Game (English).vsgm1',3],['/Saves/Game.vcgm1',2],['/Saves/Game.vsgm1',1],['/Saves/Other.vsgm1',6]]);
 await Promise.all([vm.runInContext('migrateEnglishSaves(db)',context),vm.runInContext('migrateEnglishSaves(db)',context)]);assert.deepEqual(await rows(shared),result);
 en=await open('heroes3-en-saves',2);assert.equal((await rows(en)).length,3);en.close();
 await vm.runInContext("persist('/Saves/New.vsgm1',new Uint8Array([9]))",context);
 await vm.runInContext('restore()',context);assert.equal(vm.runInContext("restored.get('/Saves/New.vsgm1')[0]",context),9);
 shared.close();
 await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('heroes3-en-saves');r.onsuccess=resolve;r.onerror=()=>reject(r.error)});
 await vm.runInContext('(async()=>{db=await openDB();await migrateEnglishSaves(db);db.close()})()',context);
 console.log('PASS: upgrade, merge, collision families, repeat/concurrent migration, source retained, shared write/restore, absent legacy database');
})().catch(e=>{console.error(e);process.exitCode=1});
