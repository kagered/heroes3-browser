const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function fixture(lang='en'){
 const elements=new Map(),revoked=[];let clicks=0,sequence=0;
 const element=()=>({dataset:{},textContent:'',hidden:false,children:[],setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},replaceChildren(){this.children=[]},append(...items){this.children.push(...items)},click(){clicks++},addEventListener(){},scrollIntoView(){this.scrolled=true}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
 const api={countSaves:async()=>0,readSaveBatches:async(db,consume)=>{await consume([{path:'/Saves/test.vsgm1',data:Uint8Array.of(1)}],1);return {saves:1,parts:1}},makeArchive:()=>Uint8Array.of(1),parseFiles:async()=>[],importRows:async()=>({saves:1,renamed:0})};
 const window={HeroesSaveTransfer:api,addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('src/save-transfer.js','utf8'),{window,document:{documentElement:{lang},getElementById:get,createElement:element},openDB:async()=>({close(){}}),migrateEnglishSaves:async()=>{},URL:{createObjectURL:()=>`blob:${++sequence}`,revokeObjectURL:url=>revoked.push(url)},Blob,Uint8Array,Date});
 const idle=async()=>{for(let i=0;i<100;i++){await new Promise(r=>setImmediate(r));if(!get('import-saves').disabled)return;}throw Error('busy');};
 return {get,api,idle,revoked};
}
(async()=>{
 for(const lang of ['en','ru']){
  const f=fixture(lang);await f.idle();assert.equal(f.get('saves-status').dataset.state,'summary');
  await f.get('export-saves').onclick();assert.equal(f.get('saves-status').dataset.state,'success');assert(f.get('save-download').download.endsWith('.zip'));
  f.api.readSaveBatches=async(db,consume)=>{for(let i=1;i<=3;i++)await consume([],i);return {saves:10,parts:3}};
  await f.get('export-saves').onclick();assert.equal(f.get('saves-status').dataset.state,'warning');assert.equal(f.get('save-downloads').children.length,2);assert.equal(f.get('save-downloads').hidden,false);assert(f.revoked.includes('blob:1'));
  f.api.readSaveBatches=async()=>{throw Error('storage')};await f.get('export-saves').onclick();assert.equal(f.get('saves-status').dataset.state,'error');assert.equal(f.get('saves-status')['aria-live'],'assertive');assert(f.get('saves-status').scrolled);assert.match(f.get('saves-status').textContent,lang==='en'?/export/:/экспорта/);assert.equal(f.get('save-download').hidden,true);assert.equal(f.get('save-downloads').children.length,0);
  f.api.readSaveBatches=async()=>({saves:0,parts:0});await f.get('export-saves').onclick();assert.equal(f.get('saves-status').dataset.state,'warning');
  f.get('save-files').files=[{name:'backup.zip'}];f.api.parseFiles=async()=>{throw Error('too-large')};f.get('save-files').onchange();await f.idle();assert.equal(f.get('saves-status').dataset.state,'error');assert.match(f.get('saves-status').textContent,/128/);
  f.api.parseFiles=async()=>[];f.get('save-files').onchange();await f.idle();assert.equal(f.get('saves-status').dataset.state,'success');
 }
 console.log('PASS: RU/EN summary, success, multipart warning, export-specific error, import errors, live announcements and URL cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
