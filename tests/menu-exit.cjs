const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const app=fs.readFileSync('src/app.js','utf8');const code=app.slice(app.indexOf('function connectMenuExit('),app.indexOf('\nfunction openDB()',app.indexOf('function connectMenuExit(')));
function fixture(native){
 const files=new Map([
  ['/config/mainmenu.json',JSON.stringify({window:{items:[{buttons:[{command:'exit'}]}]}})],
  ['/config/widgets/settings/settingsMainContainer.json',JSON.stringify({items:[{name:'quitButton',position:{x:1,y:2},image:'exit'}]})],
  ['/config/widgets/settings/otherOptionsTab.json',JSON.stringify({items:[]})]
 ]);const reads=[];let exits=0;
 const context={TextEncoder,DataView,Uint8Array,engine:{FS:{readFile:path=>{reads.push(path);return files.get(path)},open:()=>({})}},write:(path,data)=>files.set(path,new TextDecoder().decode(data)),returnHome:()=>exits++};
 vm.createContext(context);vm.runInContext(code,context);context.connectMenuExit(native);
 return {files,reads,context,get exits(){return exits}};
}
const native=fixture(true);
assert(!native.reads.some(path=>path.endsWith('otherOptionsTab.json')),'constructing all native settings tabs must never arm the legacy exit image');
assert.equal(JSON.parse(native.files.get('/config/widgets/settings/otherOptionsTab.json')).items.length,0);
native.context.engine.FS.open('/config/widgets/settings/otherOptionsTab.json');assert.equal(native.exits,0);
native.context.engine.FS.open('/Sprites/browser-exit.bmp');assert.equal(native.exits,1,'title-menu exit remains connected');
const classic=fixture(false);
assert.equal(JSON.parse(classic.files.get('/config/widgets/settings/otherOptionsTab.json')).items[0].name,'browserExitBridge');
assert.equal(JSON.parse(classic.files.get('/config/widgets/settings/settingsMainContainer.json')).items[0].type,'toggleGroup');
