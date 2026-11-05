const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync('src/mobile-adventure.js','utf8');
function setup({coarse=false,query='',width=844,height=390,manifest=true,language='en',screenSize,userAgent='',maxTouchPoints=0}={}) {
 const timers=[],buttons=[],elements=[],classes=new Set(),styles={},listeners={};let events=0;
 const game={getBoundingClientRect(){return {left:0,top:0,right:width,bottom:height,width,height}},width:844,height:600,style:{setProperty(k,v){styles[k]=v}},classList:{add(k){classes.add(k)},toggle(k,v){v?classes.add(k):classes.delete(k)}},append(){},addEventListener(){},focus(){document.activeElement=game;}};
 const document={body:{append(){}},documentElement:{lang:language},getElementById(){return game},createElement(tag){const e={tagName:tag,getContext:tag==='canvas'?()=>({drawImage(){}}):undefined,toDataURL:()=>"data:image/jpeg;base64,test",dataset:{},style:{setProperty(k,v){this[k]=v;}},listeners:{},blur(){if(document.activeElement===this){document.activeElement=null;this.listeners.blur?.();}},children:[],classList:{toggle(){}},attrs:{},setAttribute(k,v){this.attrs[k]=v;},append(...children){this.children.push(...children)},prepend(){},addEventListener(type,fn){this.listeners[type]=fn;},focus(){document.activeElement=this;this.listeners.focus?.();},querySelector(){return buttons[0]},querySelectorAll(){return buttons.filter(b=>b.dataset.action)}};elements.push(e);if(tag==='button')buttons.push(e);return e}};
 const window={HEROES_MOBILE_ENGINE:manifest?{}:null,dispatchEvent(){events++},addEventListener(type,fn){listeners[type]=fn}};
 vm.runInNewContext(code,{window,document,URLSearchParams,location:{search:query},matchMedia:()=>({matches:coarse}),innerWidth:width,innerHeight:height,screen:screenSize,navigator:{userAgent,maxTouchPoints},Event:class{},setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){}});
 return {ui:window.HeroesMobileAdventure,buttons,elements,classes,events:()=>events,window,document,styles,listeners,timers};
}
assert.equal(setup().ui.profile(),null,'desktop keeps original engine');
assert.equal(setup({coarse:true,width:390,height:844}).ui.profile().width,844,'portrait starts the same landscape layout');
assert.equal(setup({coarse:true,query:'?mobile-map=off'}).ui.profile(),null);
assert.equal(setup({coarse:true,manifest:false}).ui.profile(),null,'source-only export needs no experimental binaries');
const t=setup({coarse:true});assert.equal(t.ui.profile().width,844);
const moduleOptions={};t.ui.attach(moduleOptions,t.ui.profile());assert.equal(new Set(t.buttons.filter(b=>b.dataset.action).map(b=>b.dataset.action)).size,18);
moduleOptions.mobileAdventureState(true,1|16);assert(t.classes.has('mobile-adventure-active'));assert.equal(t.buttons.find(b=>b.dataset.action===5).disabled,false);assert.equal(t.buttons.find(b=>b.dataset.action===2).disabled,true);
for(let i=0;i<10;i++)t.ui.send(1);assert.equal(moduleOptions.mobileActions.length,4,'bounded queue');
moduleOptions.mobileAdventureState(false,0);assert.equal(moduleOptions.mobileActions.length,0);t.ui.send(1);assert.equal(moduleOptions.mobileActions.length,0,'dialogs reject map actions');assert(!t.classes.has('mobile-adventure-active'));
const forced=setup({query:'?mobile-map=1'});assert.equal(forced.ui.profile().height,390);
console.log('PASS: desktop isolation, touch/landscape gating, missing engine fallback, engine state, enabled actions and modal queue clearing');

const portrait=setup({coarse:true,width:390,height:844});portrait.ui.attach({},portrait.ui.profile());
const rect={left:-210,right:390,top:0,width:600,height:844};
const mapped=portrait.ui.remapPoint({x:300,y:100},{getBoundingClientRect:()=>rect});
assert(Math.abs((mapped.x-rect.left)/rect.width*844-100)<0.001);
assert(Math.abs((mapped.y-rect.top)/rect.height*600-90)<0.001);
console.log('PASS: rotated portrait input maps back to landscape engine coordinates');

assert.equal(setup({coarse:true,width:390,height:745,screenSize:{width:390,height:844}}).ui.profile().width,844,'reserve landscape width when portrait browser bars reduce the viewport');

moduleOptions.mobileAdventureState(true,0xffff);
moduleOptions.mobileHeroState('Lord Haart',0,1560,true);
assert.equal(t.buttons.find(b=>b.dataset.action===13).disabled,false,'native save menu follows engine availability');
t.buttons.find(b=>b.dataset.action===6).onclick();
assert.equal(moduleOptions.mobileActions.length,0,'opening native menu must not open classic settings');
console.log('PASS: live movement callback and native pause menu action routing');

const hud=t.elements.find(e=>e.className==='mobile-hero-hud');
assert.equal(hud.children[0].children[1].textContent,'0 / 1560');
assert.match(hud.children[2].textContent,/No movement left/);
moduleOptions.mobileHeroState('Lord Haart',500,1560,false);
assert.match(hud.children[2].textContent,/Town selected/);
t.buttons.find(b=>b.dataset.action===13).onclick();
assert.equal(moduleOptions.mobileActions[0],13,'native Save sends the engine save command');

moduleOptions.mobileAdventureState(false,0,true);
assert(t.classes.has('mobile-adventure-active'),'small map popup retains the native map surface');
assert.equal(t.ui.active,false,'map commands remain blocked behind the popup');
moduleOptions.mobileAdventureState(false,0,true,true);
assert.equal(t.elements.find(e=>e.className==='mobile-adventure-bottom').hidden,false,'tooltip retains bottom navigation');
assert.equal(t.elements.find(e=>e.className==='mobile-adventure-bottom').inert,true,'tooltip blocks background actions');
moduleOptions.mobileAdventureState(false,0,false,false);
assert(!t.classes.has('mobile-adventure-active'),'large dialog uses classic fitting');
moduleOptions.mobileAdventureState(true,0xffff);
assert(t.classes.has('mobile-adventure-active'));

assert.equal(t.elements.filter(e=>e.tagName==='canvas').length,0,'native modals do not allocate snapshot canvases');

const tablet=setup({coarse:true,width:1024,height:700,screenSize:{width:1024,height:768}});
const tabletOptions={},allocation=tablet.ui.profile();assert.equal(allocation.height,768,'reserve full tablet backing surface');
tablet.ui.attach(tabletOptions,allocation);assert.equal(tabletOptions.mobileViewport.height,700);
tablet.window.visualViewport={width:1024,height:768};tablet.document.fullscreenElement={};tablet.listeners.fullscreenchange();
assert.equal(tabletOptions.mobileRenderSize.height,768,'fullscreen does not allocate a second canvas');
assert.equal(tabletOptions.mobileViewport.height,740,'fullscreen map follows usable height');
assert.equal(tablet.styles['--mobile-top-inset'],'28px');assert.equal(tablet.styles['--mobile-start-inset'],'64px','dismiss affordance cannot cover first button');
assert.equal(tablet.styles['--mobile-view-height'],'740px');
console.log('PASS: tablet fullscreen backing allocation, live geometry and system-control insets');

const ipad=setup({coarse:true,width:1024,height:768,userAgent:'Mozilla Macintosh Safari',maxTouchPoints:5});
ipad.document.fullscreenElement={};ipad.ui.attach({},ipad.ui.profile());
assert.equal(ipad.styles['--mobile-start-inset'],'96px','iPad fullscreen dismiss control has reserved space');

const ipadWindowed=setup({coarse:true,userAgent:'iPad Safari',maxTouchPoints:5});
let fullscreenCalls=0;ipadWindowed.document.documentElement.requestFullscreen=()=>{fullscreenCalls++};
ipadWindowed.ui.prepareDisplay();assert.equal(fullscreenCalls,0,'iPad does not enter gesture-prone Safari fullscreen automatically');
ipadWindowed.ui.attach({},ipadWindowed.ui.profile());
ipadWindowed.ui.notify('Recruiting: Pikemen × 2');
const notice=ipadWindowed.elements.find(e=>e.className==='mobile-action-notice');assert.equal(notice.hidden,false);assert.equal(notice.textContent,'Recruiting: Pikemen × 2');
ipadWindowed.ui.notify('Recruited: Pikemen × 2',true);assert.equal(notice.textContent,'Recruited: Pikemen × 2');ipadWindowed.timers.at(-1)();assert.equal(notice.hidden,true);
console.log('PASS: iPad windowed default and timed recruitment feedback');

ipadWindowed.buttons.find(b=>b.textContent==='Screen ⛶').onclick();
assert.equal(ipadWindowed.elements.find(e=>e.className==='mobile-display-help').hidden,false,'Screen explains Safari limitations on iPad');
ipadWindowed.buttons.find(b=>b.textContent==='Enter fullscreen').onclick();
assert.equal(fullscreenCalls,1,'iPad still supports explicit fullscreen opt-in');

const names=setup({coarse:true});const namesModule={};names.ui.attach(namesModule,names.ui.profile());
names.ui.saveNameField(true,20,220,320,44,'Old save');
const nameField=names.elements.find(e=>e.className==='mobile-save-name');
assert.equal(nameField.tagName,'input');assert.equal(nameField.value,'Old save');
assert.equal(nameField.style.top,'220px');
names.document.activeElement=nameField;nameField.value='Новая партия';nameField.oninput();
names.ui.saveNameField(true,20,220,320,44,'Old save');
assert.equal(nameField.value,'Новая партия','engine state must not erase typing while field is focused');
assert.equal(namesModule.mobileSaveNameValue,'Новая партия');
nameField.value='bad/name:*?';nameField.oninput();assert.equal(namesModule.mobileSaveNameValue,'badname');
names.ui.saveNameField(false);assert.equal(nameField.hidden,true);assert.equal(names.document.activeElement,null);
names.document.activeElement=null;names.ui.saveNameField(true,20,220,320,44,'Selected existing save');assert.equal(nameField.value,'Selected existing save');
namesModule.mobileAdventureState(true,0xffff);assert.equal(nameField.hidden,true,'return to map hides browser save field');
console.log('PASS: browser save-name editing, Cyrillic, filtering, focus preservation and dismissal');

const keyboard=setup({coarse:true,userAgent:'iPad Safari',maxTouchPoints:5});const keyboardModule={};keyboard.ui.attach(keyboardModule,keyboard.ui.profile());
keyboard.ui.saveNameField(true,20,220,320,44,'New save');
const keyboardInput=keyboard.elements.find(e=>e.className==='mobile-save-name');keyboardInput.focus();assert.equal(keyboardModule.mobileTextEditing,true);
const beforeKeyboardHeight=keyboardModule.mobileViewport.height;keyboard.window.visualViewport={width:844,height:220,offsetTop:100,offsetLeft:0};keyboard.listeners.resize();
assert.equal(keyboardModule.mobileViewport.height,beforeKeyboardHeight,"typing must not resize the game");
assert.equal(keyboardInput.style.top,"112px","input stays in the visible keyboard viewport");
keyboardModule.mobileAdventureState(false,0,false);
assert.equal(keyboard.document.activeElement,keyboardInput,'keyboard viewport change must not focus the canvas');
keyboardModule.mobileAdventureState(false,0,true);
assert.equal(keyboard.document.activeElement,keyboardInput,'native dialog reflow must preserve text focus');
keyboard.ui.saveNameField(true,20,140,320,44,'New save');
assert.equal(keyboard.document.activeElement,keyboardInput,'repositioning the browser field must preserve text focus');
console.log('PASS: iPad keyboard resize and dialog-layer changes retain filename focus');

keyboardInput.blur();assert.equal(keyboardModule.mobileTextEditing,false,"leaving the name field restores normal game layout");

const reader=setup({coarse:true});reader.ui.attach({},reader.ui.profile());
const whole='Начало\n'+('Длинное сообщение. '.repeat(200))+'КОНЕЦ';reader.ui.showFullText(whole);
const full=reader.elements.find(e=>e.className==='mobile-full-text');assert.equal(full.children[0].textContent,whole);assert.equal(full.hidden,false);full.children[1].onclick();assert.equal(full.hidden,true);
console.log('PASS: full-text reader retains the entire long message and dismisses without game action');

const turns=setup({coarse:true});const turnModule={};turns.ui.attach(turnModule,turns.ui.profile());turnModule.mobileAdventureState(true,0xffff);
turnModule.mobileTurnState(0,0,1,1,1);const banner=turns.elements.find(e=>e.className==='mobile-turn-banner');assert.equal(banner.hidden,false);assert.equal(banner.children[1].children[0].textContent,'Passing the turn');
turnModule.mobileTurnState(1,1,1,1,1);assert.equal(banner.children[1].children[0].textContent,"Blue player's turn");
turnModule.mobileTurnState(2,0,2,1,1);assert.equal(banner.children[1].children[0].textContent,'Your turn');assert.equal(banner.children[1].children[1].textContent,'Month 1 · Week 1 · Day 2');const oldTurnTimer=turns.timers.at(-1);
turnModule.mobileTurnState(0,0,2,1,1);oldTurnTimer();assert.equal(banner.hidden,false,'stale ready timer must not hide the next AI turn');
turnModule.mobileAdventureState(false,0,false);assert.equal(banner.hidden,true,'turn banner stays out of classic battle windows');turnModule.mobileAdventureState(true,0xffff);assert.equal(banner.hidden,false);
turnModule.mobileTurnState(2,0,3,1,1);turns.timers.at(-1)();assert.equal(banner.hidden,true,'your-turn notice dismisses without blocking gameplay');
console.log('PASS: engine turn phases, player color/date, stale timers and battle visibility');

const digging=setup({coarse:true});const digModule={};digging.ui.attach(digModule,digging.ui.profile());const digButton=digging.buttons.find(b=>b.dataset.action===17);
assert(digButton);assert.equal(digButton.textContent,'Dig');digModule.mobileAdventureState(true,0);assert.equal(digButton.disabled,true);digModule.mobileAdventureState(true,1<<16);assert.equal(digButton.disabled,false);digButton.onclick();assert.equal(digModule.mobileActions.at(-1),17);digModule.mobileAdventureState(false,0,true);assert.equal(digButton.disabled,true);assert.equal(digModule.mobileActions.length,0);
const diggingRu=setup({coarse:true,language:'ru'});diggingRu.ui.attach({},diggingRu.ui.profile());assert.equal(diggingRu.buttons.find(b=>b.dataset.action===17).textContent,'Копать');
console.log('PASS: bilingual digging action follows engine availability and clears behind dialogs');

const exiting=setup({coarse:true});const exitModule={};exiting.ui.attach(exitModule,exiting.ui.profile());const exitButton=exiting.buttons.find(b=>b.dataset.action===18);assert.equal(exitButton.textContent,'Exit to desktop');exitModule.mobileAdventureState(true,0);assert.equal(exitButton.disabled,true);exitModule.mobileAdventureState(true,1<<17);assert.equal(exitButton.disabled,false);exitButton.onclick();assert.equal(exitModule.mobileActions.at(-1),18);exitModule.mobileAdventureState(false,0,true);assert.equal(exitModule.mobileActions.length,0);
const exitRu=setup({coarse:true,language:'ru'});exitRu.ui.attach({},exitRu.ui.profile());assert.equal(exitRu.buttons.find(b=>b.dataset.action===18).textContent,'Выход в ОС');
console.log('PASS: bilingual exit action uses original availability and queued engine confirmation');

const playerField=setup({coarse:true});const playerModule={};playerField.ui.attach(playerModule,playerField.ui.profile());
playerField.ui.saveNameField(true,20,100,300,44,'Player','player');
const playerInput=playerField.elements.find(e=>e.className==='mobile-save-name');
assert.equal(playerInput.attrs['aria-label'],'Player name');
playerInput.value='Игрок / Knight: III';playerInput.oninput();
assert.equal(playerModule.mobileSaveNameValue,'Игрок / Knight: III','player names preserve punctuation and Unicode');
playerField.ui.saveNameField(false);
playerField.ui.saveNameField(true,20,100,300,44,'Save');playerInput.value='Save / One: II';playerInput.oninput();
assert.equal(playerModule.mobileSaveNameValue,'Save  One II','save filenames retain their filename restrictions');
console.log('PASS: player-name input reuses mobile keyboard bridge without applying filename rules');

const anchoredNotice=setup({coarse:true});anchoredNotice.ui.attach({},anchoredNotice.ui.profile());
anchoredNotice.ui.notify('Recruited: Ammo Carts × 1',true,{x:36,y:224,width:320});
const anchored=anchoredNotice.elements.find(e=>e.className==='mobile-action-notice');
assert.equal(anchored.style.left,'36px');assert.equal(anchored.style.top,'224px');assert.equal(anchored.style.width,'320px');
anchoredNotice.ui.notify('Another notice');assert.equal(anchored.style.left,'');assert.equal(anchored.style.top,'');assert.equal(anchored.style.width,'');
console.log('PASS: recruitment status stays in the native safe slot; subsequent general notices reset placement');

anchoredNotice.ui.notify('Recruiting: Swordsmen × 4',false,{x:36,y:224,width:320});
assert.equal(anchored.hidden,false);anchoredNotice.ui.dismissRecruitNotice();assert.equal(anchored.hidden,true,'closing recruitment must remove its pending status immediately');
anchoredNotice.ui.notify('Recruited: Ammo Carts × 1',true,{x:36,y:224,width:320});assert.equal(anchored.hidden,false,'an open recruitment dialog can show the confirmed result');
anchoredNotice.ui.dismissRecruitNotice();assert.equal(anchored.hidden,true);
anchoredNotice.ui.notify('General status');anchoredNotice.ui.dismissRecruitNotice();assert.equal(anchored.hidden,false,'dismissal of recruitment must not hide unrelated notices');
console.log('PASS: recruitment notice follows dialog lifetime and leaves general notices alone');
