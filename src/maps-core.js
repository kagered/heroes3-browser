/* Custom maps live separately from saves and downloaded resources. */
'use strict';
window.HeroesMaps = (() => {
  const FILE_LIMIT=8*1048576, EXPANDED_LIMIT=16*1048576, TOTAL_LIMIT=64*1048576, COUNT_LIMIT=64;
  const versions=new Map([[14,'RoE'],[21,'AB'],[28,'SoD']]);
  const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0;});
  function inspect(bytes) {
    if(bytes.length<18)throw Error('invalid');
    let header, length=0, crc=0xffffffff;
    const consume=chunk=>{
      length+=chunk.length;if(length>EXPANDED_LIMIT)throw Error('large');
      if(!header)header=new Uint8Array(Math.min(EXPANDED_LIMIT,65536));
      const offset=length-chunk.length;if(offset<header.length)header.set(chunk.subarray(0,header.length-offset),offset);
      for(const byte of chunk)crc=(crc>>>8)^crcTable[(crc^byte)&255];
    };
    if(bytes[0]===31 && bytes[1]===139 && bytes[2]===8) {
      const tail=new DataView(bytes.buffer,bytes.byteOffset+bytes.length-8,8);
      if(tail.getUint32(4,true)>EXPANDED_LIMIT)throw Error('large');
      try {
        const unzip=new window.fflate.Gunzip(consume);
        for(let offset=0;offset<bytes.length;offset+=256)unzip.push(bytes.subarray(offset,offset+256),offset+256>=bytes.length);
      } catch(error) {throw Error(error.message==='large'?'large':'invalid');}
      if(length!==tail.getUint32(4,true) || ((crc^0xffffffff)>>>0)!==tail.getUint32(0,true))throw Error('invalid');
    } else consume(bytes);
    if(length<18)throw Error('invalid');
    const view=new DataView(header.buffer);
    const format=versions.get(view.getUint32(0,true));if(!format)throw Error('format');
    const size=view.getUint32(5,true),levels=header[9]+1,nameLength=view.getUint32(10,true);
    if(header[4]>1 || header[9]>1 || ![36,72,108,144].includes(size) || nameLength>4096 || length<18+nameLength)throw Error('invalid');
    const descriptionLength=view.getUint32(14+nameLength,true);
    if(descriptionLength>length-18-nameLength || length<size*size*levels*7)throw Error('invalid');
    return {format,dimension:size};
  }
  const INPUT_LIMIT=TOTAL_LIMIT+2*1048576;
  const safeLeaf=name=>typeof name==='string' && name.length>0 && name.length<=200 && /\.h3m$/i.test(name) && !/[\\/\x00-\x1f\x7f]/.test(name);
  function safePath(name){
    if(typeof name!=='string' || name.length>360 || /[\\:\x00-\x1f\x7f]/.test(name) || name.startsWith('/'))throw Error('invalid');
    const parts=name.split('/');if(parts.length>6 || parts.some(part=>!part || part==='.' || part==='..'))throw Error('invalid');return name;
  }
  const fold=name=>name.normalize('NFC').toLowerCase();
  async function digest(data){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),n=>n.toString(16).padStart(2,'0')).join('');}
  async function parseFiles(files) {
    if(!files.length)throw Error('empty');
    if(files.length>16 || files.reduce((n,f)=>n+f.size,0)>INPUT_LIMIT)throw Error('large');
    const result=new Map();let total=0,count=0;
    async function append(name,data,expectedHash){
      if(!safeLeaf(name))throw Error('type');
      total+=data.length;count++;
      if(data.length>FILE_LIMIT || total>TOTAL_LIMIT || count>COUNT_LIMIT)throw Error('large');
      const details=inspect(data),id=await digest(data);
      if(expectedHash && expectedHash!==id)throw Error('invalid');
      result.set(id,{id,name:name.normalize('NFC'),bytes:data.length,date:Date.now(),...details,data});
    }
    for(const file of files) {
      if(typeof file.name!=='string' || /[\\/\x00-\x1f\x7f]/.test(file.name) || file.name.length>200)throw Error('type');
      const isMap=/\.h3m$/i.test(file.name),isZip=/\.zip$/i.test(file.name);
      if(!isMap && !isZip)throw Error('type');
      if(file.size>(isMap?FILE_LIMIT:INPUT_LIMIT))throw Error('large');
      const data=new Uint8Array(await file.arrayBuffer());
      if(data.length>(isMap?FILE_LIMIT:INPUT_LIMIT))throw Error('large');
      if(isMap){await append(file.name,data);continue;}
      let expanded=0,entriesCount=0,mapCount=0;const seen=new Set();let entries;
      try {
        entries=window.fflate.unzipSync(data,{filter(entry){
          if(++entriesCount>256)throw Error('large');
          if(entry.name.endsWith('/')){safePath(entry.name.slice(0,-1));return false;}
          safePath(entry.name);
          if(seen.has(fold(entry.name)))throw Error('invalid');seen.add(fold(entry.name));
          if(entry.name==='_heroes3_maps.json'){
            if(!Number.isSafeInteger(entry.originalSize) || entry.originalSize>262144)throw Error('large');return true;
          }
          if(!/\.h3m$/i.test(entry.name))return false;
          mapCount++;expanded+=entry.originalSize;
          if(!Number.isSafeInteger(entry.originalSize) || entry.originalSize<1 || entry.originalSize>FILE_LIMIT || expanded+total>TOTAL_LIMIT || mapCount+count>COUNT_LIMIT)throw Error('large');
          return true;
        }});
      }catch(error){throw Error(error.message==='large'?'large':'invalid');}
      let metadata;
      if(entries['_heroes3_maps.json']){
        try{metadata=JSON.parse(window.fflate.strFromU8(entries['_heroes3_maps.json']));}catch{throw Error('invalid');}
        if(metadata?.format!=='heroes3-browser-maps' || metadata.version!==1)throw Error('version');
        if(!Array.isArray(metadata.files) || metadata.files.length>COUNT_LIMIT)throw Error('invalid');
      }
      const maps=Object.entries(entries).filter(([name])=>/\.h3m$/i.test(name));
      if(!maps.length)throw Error('empty');
      const originals=new Map();
      if(metadata){
        for(const row of metadata.files){
          if(!row || !safeLeaf(row.name) || typeof row.sha256!=='string' || !/^[a-f0-9]{64}$/.test(row.sha256))throw Error('invalid');
          safePath(row.path);if(!/\.h3m$/i.test(row.path) || originals.has(row.path))throw Error('invalid');originals.set(row.path,row);
        }
        if(originals.size!==maps.length || maps.some(([name])=>!originals.has(name)))throw Error('invalid');
      }
      for(const [name,bytes] of maps){const info=originals.get(name);await append(info?info.name:name.split('/').pop(),bytes,info?.sha256);}
    }
    if(!result.size)throw Error('empty');
    return [...result.values()];
  }
  function readMaps(database){
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(['custom-map-info','custom-maps']),rows=[];let reason;
      const request=tx.objectStore('custom-map-info').getAll();
      request.onsuccess=()=>{
        let total=0;
        for(const row of request.result){
          total+=row.bytes;
          if(rows.length>=COUNT_LIMIT || !safeLeaf(row.name) || !Number.isSafeInteger(row.bytes) || row.bytes<1 || row.bytes>FILE_LIMIT || total>TOTAL_LIMIT || !/^[a-f0-9]{64}$/.test(row.id)){reason='invalid';tx.abort();return;}
          const entry={...row};rows.push(entry);const bytes=tx.objectStore('custom-maps').get(row.id);
          bytes.onsuccess=()=>{if(!(bytes.result instanceof Uint8Array) || bytes.result.length!==row.bytes){reason='invalid';tx.abort();return;}entry.data=bytes.result;};
        }
      };
      tx.oncomplete=()=>resolve(rows);
      tx.onabort=tx.onerror=()=>reject(Error(reason||'storage'));
    });
  }
  async function makeArchive(rows){
    if(!rows.length)throw Error('empty');
    if(rows.length>COUNT_LIMIT)throw Error('large');
    const contents=Object.create(null),files=[],seen=new Set();let total=0;
    for(const row of rows){
      if(!safeLeaf(row.name) || !(row.data instanceof Uint8Array))throw Error('invalid');
      total+=row.data.length;if(row.data.length>FILE_LIMIT || total>TOTAL_LIMIT)throw Error('large');
      inspect(row.data);const sha256=await digest(row.data);if(sha256!==row.id)throw Error('invalid');
      const stem=row.name.replace(/\.h3m$/i,'').replace(/:/g,'_').slice(0,170);let number=1,path;
      do{path='Maps/'+stem+(number===1?'':' ('+number+')')+'.h3m';number++;}while(seen.has(fold(path)));
      seen.add(fold(path));contents[path]=row.data;files.push({path,name:row.name,sha256});
    }
    contents['_heroes3_maps.json']=window.fflate.strToU8(JSON.stringify({format:'heroes3-browser-maps',version:1,files}));
    return window.fflate.zipSync(contents,{level:0});
  }
  function list(database) {
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('custom-map-info');const request=tx.objectStore('custom-map-info').getAll();
      tx.oncomplete=()=>resolve(request.result.sort((a,b)=>a.name.localeCompare(b.name)));
      tx.onabort=tx.onerror=()=>reject(tx.error||Error('storage'));
    });
  }
  function importRows(database,rows) {
    return new Promise((resolve,reject)=>{
      let added=0,duplicate=0,reason;
      const tx=database.transaction(['custom-maps','custom-map-info'],'readwrite');
      const info=tx.objectStore('custom-map-info'),maps=tx.objectStore('custom-maps');
      const request=info.getAll();
      request.onsuccess=()=>{
        const existing=new Set(request.result.map(row=>row.id));let size=request.result.reduce((n,row)=>n+row.bytes,0),count=existing.size;
        for(const row of rows) {
          if(existing.has(row.id)){duplicate++;continue;}
          size+=row.bytes;count++;
          if(size>TOTAL_LIMIT || count>COUNT_LIMIT){reason='capacity';tx.abort();return;}
          const {data,...metadata}=row;info.add(metadata,row.id);maps.add(data,row.id);existing.add(row.id);added++;
        }
      };
      tx.oncomplete=()=>resolve({added,duplicate});
      tx.onabort=tx.onerror=()=>reject(Error(reason||'storage'));
    });
  }
  function remove(database,id) {
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(['custom-maps','custom-map-info'],'readwrite');
      tx.objectStore('custom-maps').delete(id);tx.objectStore('custom-map-info').delete(id);
      tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('storage'));
    });
  }
  function mount(database,write) {
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('custom-maps');const request=tx.objectStore('custom-maps').openCursor();let error;
      request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;
        try {if(!/^[a-f0-9]{64}$/.test(cursor.key))throw Error('invalid');write('/Maps/browser-'+cursor.key+'.h3m',cursor.value);cursor.continue();}
        catch(reason){error=reason;tx.abort();}
      };
      tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(error||Error('storage'));
    });
  }
  return {parseFiles,list,importRows,remove,mount,readMaps,makeArchive};
})();
