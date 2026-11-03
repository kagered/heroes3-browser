/* Local save archive handling. No network operations. */
'use strict';
(function(root) {
  const zip = root.fflate;
  const MAX_BYTES = 128 * 1024 * 1024, MAX_INPUT = 144 * 1024 * 1024, MAX_FILES = 512;
  const DEFAULT_ROOT = '/home/web_user/.local/share/vcmi/Saves/';
  const EXT = /\.(vsgm1|vcgm1)$/i;
  const fold = name => name.normalize('NFC').toLowerCase();
  const stem = name => name.replace(/\.[^/.]+$/, '');
  function fail(code) { throw new Error(code); }
  function safeName(name) {
    if (typeof name !== 'string' || name.length > 240 || /[\\:\x00-\x1f]/.test(name) || name.startsWith('/')) fail('invalid');
    const parts = name.split('/');
    if (parts.length > 8 || parts.some(part => !part || part === '.' || part === '..')) fail('invalid');
    return name;
  }
  function savePath(path) {
    if (typeof path !== 'string') fail('invalid');
    const absolute = path.startsWith('/') ? path : '/' + path;
    const prefix = ['/Saves/', DEFAULT_ROOT].find(prefix => absolute.startsWith(prefix));
    if (!prefix) fail('invalid');
    const relative = safeName(absolute.slice(prefix.length));
    if (!EXT.test(relative)) fail('invalid');
    return {path:absolute,relative,prefix};
  }
  function isSavePath(path) { try { savePath(path); return true; } catch { return false; } }
  async function readSaves(database) {
    return new Promise((resolve,reject) => {
      const tx=database.transaction('files'), rows=[];let bytes=0;
      const request=tx.objectStore('files').openCursor();
      request.onsuccess=()=>{
        const cursor=request.result;
        if (!cursor) return;
        if (isSavePath(cursor.key)) {
          const data=cursor.value;
          if (!(data instanceof Uint8Array) || !data.byteLength) {tx.abort();return;}
          bytes+=data.byteLength;
          if (bytes>MAX_BYTES || rows.length>=MAX_FILES) {tx.abort();return;}
          rows.push({path:savePath(cursor.key).path,data});
        }
        cursor.continue();
      };
      tx.oncomplete=()=>resolve(rows);
      tx.onabort=()=>reject(new Error(bytes>MAX_BYTES || rows.length>=MAX_FILES ? 'too-large' : 'storage'));
      tx.onerror=()=>reject(new Error('storage'));
    });
  }
  async function readSaveBatches(database, consume) {
    // Read only one archive batch at a time. Keep server/client save pairs together.
    const keys=await new Promise((resolve,reject)=>{
      const tx=database.transaction('files'),request=tx.objectStore('files').getAllKeys();
      request.onsuccess=()=>resolve(request.result.filter(isSavePath));
      request.onerror=()=>reject(new Error('storage'));
    });
    const groups=new Map();
    for(const path of keys){const key=fold(stem(savePath(path).path));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(path);}
    let batch=[],bytes=0,parts=0;
    async function flush(){if(!batch.length)return;await consume(batch,++parts);batch=[];bytes=0;}
    for(const paths of groups.values()){
      const rows=await new Promise((resolve,reject)=>{
        const tx=database.transaction('files'),store=tx.objectStore('files'),result=[];
        for(const path of paths){const request=store.get(path);request.onsuccess=()=>{
          const data=request.result;
          if(!(data instanceof Uint8Array) || !data.byteLength){tx.abort();return;}
          result.push({path:savePath(path).path,data});
        };}
        tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(new Error('storage'));
      });
      const size=rows.reduce((sum,row)=>sum+row.data.byteLength,0);
      if(size>MAX_BYTES || rows.length>MAX_FILES)fail('save-too-large');
      if(bytes+size>MAX_BYTES || batch.length+rows.length>MAX_FILES)await flush();
      batch.push(...rows);bytes+=size;
    }
    await flush();return {saves:groups.size,parts};
  }
  function makeArchive(rows) {
    if (!rows.length) fail('empty');
    const contents=Object.create(null), paths=Object.create(null), seen=new Set();let bytes=0;
    if(rows.length>MAX_FILES)fail('too-large');
    for(const row of rows) {
      const file=savePath(row.path),name='Saves/'+file.relative;
      if(seen.has(fold(name)))fail('duplicate');seen.add(fold(name));
      bytes+=row.data.byteLength;if(bytes>MAX_BYTES)fail('too-large');
      contents[name]=row.data;paths[name]=file.path;
    }
    contents['_heroes3.json']=zip.strToU8(JSON.stringify({format:'heroes3-browser-saves',version:1,engine:'VCMI 1.6.5',paths}));
    // VCMI saves are already compressed. Store them without another compression pass.
    return zip.zipSync(contents,{level:0});
  }
  async function parseFiles(files) {
    if(!files.length)fail('empty');
    if(files.reduce((sum,file)=>sum+file.size,0)>MAX_INPUT)fail('input-too-large');
    const rows=[];let total=0;
    const seen=new Set();
    function append(path,data) {
      const checked=savePath(path).path;
      if(!data.byteLength)fail('invalid');
      if(seen.has(fold(checked)))fail('duplicate');seen.add(fold(checked));
      total+=data.byteLength;
      if(total>MAX_BYTES)fail('too-large');
      if(rows.length>=MAX_FILES)fail('too-many');
      rows.push({path:checked,data});
    }
    for(const file of files) {
      const name=safeName(file.name);
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(EXT.test(name)) {append(DEFAULT_ROOT+name,bytes);continue;}
      if(!/\.zip$/i.test(name))fail('invalid');
      let expanded=0,count=0;const names=new Set();
      const entries=zip.unzipSync(bytes,{filter(entry){
        if(entry.name.endsWith('/'))return false;
        safeName(entry.name);
        if(entry.name==='_heroes3.json') {
          if(entry.originalSize>256*1024)fail('too-large');return true;
        }
        if(!EXT.test(entry.name))return false;
        if(names.has(fold(entry.name)))fail('duplicate');names.add(fold(entry.name));
        expanded+=entry.originalSize;count++;
        if(!Number.isSafeInteger(entry.originalSize) || entry.originalSize<1 || expanded+total>MAX_BYTES)fail('too-large');
        if(count+rows.length>MAX_FILES)fail('too-many');
        return true;
      }});
      let metadata;
      if(entries['_heroes3.json']) {
        try{metadata=JSON.parse(zip.strFromU8(entries['_heroes3.json']));}catch{fail('invalid');}
        if(metadata?.format!=='heroes3-browser-saves' || metadata.version!==1 || !metadata.paths || typeof metadata.paths!=='object')fail('version');
      }
      for(const [entryName,data] of Object.entries(entries)) {
        if(!EXT.test(entryName))continue;
        let relative=entryName.startsWith('Saves/')?entryName.slice(6):entryName;
        safeName(relative);
        const mapped=metadata?.paths[entryName];
        append(mapped===undefined?DEFAULT_ROOT+relative:mapped,data);
      }
    }
    if(!rows.length)fail('empty');
    return rows;
  }
  function importRows(database, rows) {
    // Plan all renames before writing, then commit the complete import atomically.
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('files','readwrite'),store=tx.objectStore('files');
      const request=store.getAllKeys();let result;
      request.onsuccess=()=>{
        try {
          const existing=new Set(request.result.map(fold));
          const occupied=new Set([...existing,...rows.map(row=>fold(savePath(row.path).path))]);
          const groups=new Map();
          for(const row of rows){const path=savePath(row.path).path,base=stem(path),key=fold(base);if(!groups.has(key))groups.set(key,{base,rows:[]});groups.get(key).rows.push({...row,path});}
          let renamed=0;
          for(const {base,rows:group} of groups.values()) {
            let target=base;
            if(group.some(row=>existing.has(fold(row.path)))) {
              let n=1;
              do {target=base+' (imported'+(n===1?'':' '+n)+')';n++;}
              while(group.some(row=>occupied.has(fold(target+row.path.slice(stem(row.path).length)))));
              renamed++;
            }
            for(const row of group){const path=target+row.path.slice(stem(row.path).length);occupied.add(fold(path));store.add(row.data,path);}
          }
          result={saves:groups.size,renamed};
        } catch {tx.abort();}
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(new Error('storage'));
      tx.onerror=()=>reject(new Error('storage'));
    });
  }
  async function countSaves(database) {
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('files');const r=tx.objectStore('files').getAllKeys();
      r.onsuccess=()=>resolve(new Set(r.result.filter(isSavePath).map(path=>fold(stem(savePath(path).path)))).size);
      r.onerror=()=>reject(new Error('storage'));
    });
  }
  root.HeroesSaveTransfer={readSaves,readSaveBatches,makeArchive,parseFiles,importRows,countSaves,isSavePath,MAX_BYTES,MAX_INPUT,MAX_FILES};
})(globalThis);
