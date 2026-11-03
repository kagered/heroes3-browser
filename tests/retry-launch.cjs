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
