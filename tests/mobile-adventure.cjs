const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync('src/mobile-adventure.js','utf8');
function setup({coarse=false,query='',width=844,height=390,manifest=true,language='en'}={}) {
 const buttons=[],classes=new Set();let events=0;
 const game={style:{setProperty(){}},classList:{toggle(k,v){v?classes.add(k):classes.delete(k)}},append(){}};
 const document={documentElement:{lang:language},getElementById(){return game},createElement(tag){const e={dataset:{},setAttribute(){},append(...children){},prepend(){},querySelectorAll(){return buttons}};if(tag==='button')buttons.push(e);return e}};
 const window={HEROES_MOBILE_ENGINE:manifest?{}:null,dispatchEvent(){events++}};
 vm.runInNewContext(code,{window,document,URLSearchParams,location:{search:query},matchMedia:()=>({matches:coarse}),innerWidth:width,innerHeight:height,Event:class{}});
 return {ui:window.HeroesMobileAdventure,buttons,classes,events:()=>events};
}
assert.equal(setup().ui.profile(),null,'desktop keeps original engine');
assert.equal(setup({coarse:true,width:390,height:844}).ui.profile(),null,'portrait starts with classic UI');
assert.equal(setup({coarse:true,query:'?mobile-map=off'}).ui.profile(),null);
assert.equal(setup({coarse:true,manifest:false}).ui.profile(),null,'source-only export needs no experimental binaries');
const t=setup({coarse:true});assert.equal(t.ui.profile().width,844);
const moduleOptions={};t.ui.attach(moduleOptions,t.ui.profile());assert.equal(t.buttons.length,11);
moduleOptions.mobileAdventureState(true,1|16);assert(t.classes.has('mobile-adventure-active'));assert.equal(t.buttons.find(b=>b.dataset.action===5).disabled,false);assert.equal(t.buttons.find(b=>b.dataset.action===2).disabled,true);
for(let i=0;i<10;i++)t.ui.send(1);assert.equal(moduleOptions.mobileActions.length,4,'bounded queue');
moduleOptions.mobileAdventureState(false,0);assert.equal(moduleOptions.mobileActions.length,0);t.ui.send(1);assert.equal(moduleOptions.mobileActions.length,0,'dialogs reject map actions');assert(!t.classes.has('mobile-adventure-active'));
const forced=setup({query:'?mobile-map=1'});assert.equal(forced.ui.profile().height,390);
console.log('PASS: desktop isolation, touch/landscape gating, missing engine fallback, engine state, enabled actions and modal queue clearing');
