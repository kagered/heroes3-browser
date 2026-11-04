const fs=require('fs'),vm=require('vm'),assert=require('assert');const app=fs.readFileSync('src/app.js','utf8');const a=app.lastIndexOf("try { sessionStorage.setItem('heroes3.retryLaunch','1'); }");const b=app.indexOf('\n    };',a);const action=app.slice(a,b);let flag,navigation;
for(const destination of ['/index.html','https://heroes-iii-memory-reset.pages.dev/?lang=en']){
 const sessionStorage={setItem(k,v){assert.equal(k,'heroes3.retryLaunch');flag=v}};vm.runInNewContext(action,{sessionStorage,homeDestination:()=>destination,location:{reload(){assert.equal(flag,'1');navigation='reload'},replace(url){assert.equal(flag,'1');navigation=url}}});assert.equal(navigation,destination==='/index.html'?'reload':destination);
}
const start=app.indexOf('  let resume=false;');const end=app.indexOf('\n  try {\n    if (window.HEROES_BUILD)',start);const consume=app.slice(start,end)+'\nresult=resume;';const storage={getItem(){return flag},removeItem(){flag=undefined}};let c={sessionStorage:storage};vm.runInNewContext(consume,c);assert.equal(c.result,true);c={sessionStorage:storage};vm.runInNewContext(consume,c);assert.equal(c.result,false);
for(const ready of [true,false]){let calls=0;vm.runInNewContext("if (resume && ready) { $('mode').value='solo';void start(false); }",{resume:true,ready,$:()=>({}),start(){calls++}});assert.equal(calls,ready?1:0)}
console.log('PASS: desktop/iPad retry destinations, flag written before navigation, one-shot consumption and preflight guard');

const menuStart=app.indexOf('function returnToGameMenu(');const menuEnd=app.indexOf('async function returnHome()',menuStart);
let scheduled,returned=0;flag=undefined;
vm.runInNewContext(app.slice(menuStart,menuEnd)+';returnToGameMenu();',{sessionStorage:{setItem(k,v){assert.equal(k,'heroes3.retryLaunch');flag=v}},setTimeout(callback){scheduled=callback},returnHome(){assert.equal(flag,'1');returned++}});
assert.equal(returned,0,'engine teardown must wait for the confirmation callback to return');assert.equal(typeof scheduled,'function');scheduled();assert.equal(returned,1);
console.log('PASS: confirmed menu return schedules existing teardown and one-shot title-menu relaunch');

const logCode=app.slice(app.indexOf('const log ='),app.indexOf('const status ='))+'; log("Mobile scenario end: result screen opened");';const completionStore=new Map(),logElement={textContent:''};vm.runInNewContext(logCode,{$:()=>logElement,console:{log(){}},autoJoining:false,sessionStorage:{setItem:(k,v)=>completionStore.set(k,v)}});assert.equal(completionStore.get('heroes3.lastCompletionPhase'),'Mobile scenario end: result screen opened');assert(logElement.textContent.includes('result screen opened'));

const durableStore=new Map();const durableStorage={getItem:k=>durableStore.get(k)||null,setItem:(k,v)=>durableStore.set(k,v)};const traceSource=app.slice(app.indexOf('function readCompletionTrace()'),app.indexOf('const status ='));
const firstTab={localStorage:durableStorage};vm.createContext(firstTab);vm.runInContext(traceSource,firstTab);firstTab.recordCompletionPhase('Mobile scenario end: terminal game packet received');
const reopenedTab={localStorage:durableStorage};vm.createContext(reopenedTab);vm.runInContext(traceSource,reopenedTab);assert.equal(reopenedTab.readCompletionTrace()[0].phase,'Mobile scenario end: terminal game packet received','trace survives reopening without any sessionStorage');
for(let i=0;i<30;i++)reopenedTab.recordCompletionPhase('Mobile scenario end: phase '+i);assert.equal(reopenedTab.readCompletionTrace().length,24);
reopenedTab.recordCompletionPhase('Mobile scenario end: Grail placement confirmed');assert.equal(reopenedTab.readCompletionTrace().length,1,'new Grail attempt clears stale checkpoints');
const unavailableStorage={localStorage:{getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}}};vm.createContext(unavailableStorage);vm.runInContext(traceSource,unavailableStorage);assert.doesNotThrow(()=>unavailableStorage.recordCompletionPhase('Mobile scenario end: phase'));assert.equal(unavailableStorage.readCompletionTrace().length,0);
console.log('PASS: bounded completion trace survives new tabs and tolerates blocked storage');
