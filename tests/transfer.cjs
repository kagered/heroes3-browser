const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {indexedDB}=require('fake-indexeddb');const fflate=require('../src/vendor/save-zip.js');
const c=vm.createContext({fflate,Uint8Array,Set,Map,Promise,Error,Number,Object,JSON});vm.runInContext(fs.readFileSync('src/save-transfer-core.js','utf8'),c);const api=c.HeroesSaveTransfer;
function open(name){return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(db,rows){return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');for(const [k,v] of rows)tx.objectStore('files').put(Uint8Array.from(v),k);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)})}
function all(db){return new Promise((resolve,reject)=>{const rows=[];const tx=db.transaction('files');const r=tx.objectStore('files').openCursor();r.onsuccess=()=>{const v=r.result;if(v){rows.push([v.key,Array.from(v.value)]);v.continue()}};tx.oncomplete=()=>resolve(rows);tx.onabort=()=>reject(tx.error)})}
function file(name,bytes){return {name,size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}}
(async()=>{
 const source=await open('export'),destination=await open('import');
 await put(source,[['/Saves/Тест.vsgm1',[1,2,3]],['/Saves/Тест.vcgm1',[4,5]],['/config/settings.json',[8]]]);
 const rows=await api.readSaves(source);assert.equal(rows.length,2);assert.equal(await api.countSaves(source),1);
 const backup=api.makeArchive(rows,{'device-a':12345}),parsed=await api.parseFiles([file('backup.zip',backup)]);assert.equal(parsed.length,2);assert.equal(parsed.playTime[0]['device-a'],12345);
 await put(destination,[['/Saves/Тест.vsgm1',[9]],['/Saves/Тест.vcgm1',[8]],['/Saves/Тест (imported).vsgm1',[7]]]);
 const result=await api.importRows(destination,parsed);assert.equal(result.saves,1);assert.equal(result.renamed,1);
 let saved=await all(destination);assert.deepEqual(saved,[['/Saves/Тест (imported 2).vcgm1',[4,5]],['/Saves/Тест (imported 2).vsgm1',[1,2,3]],['/Saves/Тест (imported).vsgm1',[7]],['/Saves/Тест.vcgm1',[8]],['/Saves/Тест.vsgm1',[9]]]);
 const round=await api.parseFiles([file('round.zip',api.makeArchive(await api.readSaves(destination)))]);assert.equal(round.length,5);
 const native=await api.parseFiles([file('Native.vsgm1',Uint8Array.of(17))]);assert.equal(native[0].path,'/home/web_user/.local/share/vcmi/Saves/Native.vsgm1');
 const before=await all(destination);
 const cases=[
  ['../bad.vsgm1',Uint8Array.of(1),'invalid'],
  ['/bad.vsgm1',Uint8Array.of(1),'invalid'],
  ['_heroes3.json',fflate.strToU8('{"format":"heroes3-browser-saves","version":99,"paths":{}}'),'version'],
  ['big.vsgm1',new Uint8Array(api.MAX_BYTES+1),'too-large']
 ];
 for(const [name,bytes,error] of cases){const bad=fflate.zipSync({[name]:bytes},{level:1});await assert.rejects(api.parseFiles([file('bad.zip',bad)]),new RegExp(error));}
 await assert.rejects(api.parseFiles([file('bad.zip',fflate.zipSync({'a.vsgm1':Uint8Array.of(1),'A.VSGM1':Uint8Array.of(2)}))]),/duplicate/);
 const malformed=fflate.zipSync({'a.vsgm1':Uint8Array.of(1),'_heroes3.json':fflate.strToU8(JSON.stringify({format:'heroes3-browser-saves',version:1,paths:{'a.vsgm1':'/config/settings.json'}}))});await assert.rejects(api.parseFiles([file('bad.zip',malformed)]),/invalid/);
 assert.deepEqual(await all(destination),before);
 const failing={transaction(...args){const tx=destination.transaction(...args),method=tx.objectStore.bind(tx);tx.objectStore=name=>{const store=method(name),add=store.add.bind(store);let count=0;store.add=(...args)=>{if(++count===2)throw Error('injected failure');return add(...args)};return store};return tx}};
 await assert.rejects(api.importRows(failing,[{path:'/Saves/Atomic.vsgm1',data:Uint8Array.of(1)},{path:'/Saves/Atomic.vcgm1',data:Uint8Array.of(2)}]),/storage/);assert.deepEqual(await all(destination),before);
 const caseRows=[{path:'/Saves/Mixed.vsgm1',data:Uint8Array.of(1)},{path:'/Saves/MIXED.vcgm1',data:Uint8Array.of(2)}];await put(destination,[['/Saves/Mixed.vsgm1',[9]]]);const mixed=await api.importRows(destination,caseRows);assert.equal(mixed.saves,1);assert.equal(mixed.renamed,1);const entries=await all(destination);assert(entries.some(([p])=>p==='/Saves/Mixed (imported).vcgm1'));
 source.close();destination.close();console.log('PASS: ZIP round trip, Cyrillic, native file, paired collisions, case folding, unsafe paths, expansion limits, invalid backup, atomic rollback, originals retained');
})().catch(e=>{console.error(e);process.exitCode=1});
