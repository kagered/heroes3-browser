const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {indexedDB}=require('fake-indexeddb'),fflate=require('../src/vendor/save-zip.js');
const ctx=vm.createContext({fflate,Uint8Array,Set,Map,Promise,Error,Number,Object,JSON});vm.runInContext(fs.readFileSync('src/save-transfer-core.js','utf8'),ctx);const api=ctx.HeroesSaveTransfer;
function open(name){return new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(db,rows){return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');for(const [path,data] of rows)tx.objectStore('files').put(data,path);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)})}
const file=(name,data)=>({name,size:data.byteLength,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)});
(async()=>{
 const large=await open('large-export'),payload=new Uint8Array(33*1048576);payload[0]=42;payload[payload.length-1]=17;await put(large,[['/Saves/large.vsgm1',payload]]);
 let parts=0;await api.readSaveBatches(large,async rows=>{parts++;const archive=api.makeArchive(rows);const parsed=await api.parseFiles([file('large.zip',archive)]);assert.equal(parsed[0].data.byteLength,33*1048576);assert.equal(parsed[0].data[0],42);assert.equal(parsed[0].data.at(-1),17);});assert.equal(parts,1,'collection over old 32 MiB limit exports and imports');large.close();
 const bytes=await open('byte-batches');await put(bytes,[['/Saves/a.vsgm1',new Uint8Array(65*1048576)],['/Saves/b.vsgm1',new Uint8Array(65*1048576)]]);
 const sizes=[];await api.readSaveBatches(bytes,async rows=>sizes.push(rows.reduce((sum,r)=>sum+r.data.byteLength,0)));assert.deepEqual(sizes,[65*1048576,65*1048576]);bytes.close();
 const many=await open('file-batches'),rows=[];for(let i=0;i<257;i++)for(const ext of ['vcgm1','vsgm1'])rows.push([`/Saves/pair-${String(i).padStart(3,'0')}.${ext}`,Uint8Array.of(i%255+1)]);await put(many,rows);
 const imported=await open('batch-import');const result=await api.readSaveBatches(many,async batch=>{
  assert(batch.length<=512);const stems=new Map();for(const row of batch){const name=row.path.replace(/\.[^.]+$/,'');stems.set(name,(stems.get(name)||0)+1)}assert([...stems.values()].every(count=>count===2),'paired files never split');
  const parsed=await api.parseFiles([file('part.zip',api.makeArchive(batch))]);await api.importRows(imported,parsed);
 });assert.equal(result.parts,2);assert.equal(await api.countSaves(imported),257);many.close();imported.close();
 const empty=await open('empty-batches');const no=await api.readSaveBatches(empty,()=>assert.fail('empty archive'));assert.equal(no.parts,0);empty.close();
 await assert.rejects(api.parseFiles([{name:'large.zip',size:api.MAX_INPUT+1}]),/input-too-large/);
 console.log('PASS: real 33 MiB export/import, byte and count splitting, paired files, all parts restore, empty export, distinct input limit');
})().catch(error=>{console.error(error);process.exitCode=1});
