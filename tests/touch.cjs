const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
class Element {constructor(){this.listeners={};this.style={};this.clientWidth=800;this.clientHeight=600;this.events=[];this.classList={toggle(){}}}addEventListener(type,fn){this.listeners[type]=fn}dispatchEvent(e){this.events.push(e)}focus(){}}
const elements={};for(const id of ['canvas','game','touch-mode','touch-tools','touch-zoom','touch-menu','touch-turn','touch-escape','touch-help','touch-guide','touch-help-close'])elements[id]=new Element();
let next=1;const timers=new Map();
let changePointer;
const ctx=vm.createContext({document:{getElementById:id=>elements[id]},window:new Element(),matchMedia:()=>({matches:true,addEventListener:(_type,fn)=>{changePointer=fn}}),setTimeout:(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),MouseEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},KeyboardEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}}});
vm.runInContext(fs.readFileSync('src/mobile.js','utf8'),ctx);
const c=elements.canvas;
function touch(type,points){c.listeners[type]({touches:points.map(([clientX,clientY])=>({clientX,clientY})),preventDefault(){},stopImmediatePropagation(){}})}
function tick(ms){for(const [id,t] of [...timers])if(t.ms<=ms){timers.delete(id);t.fn()}}
const buttons=()=>c.events.filter(e=>/mousedown|mouseup/.test(e.type)).map(e=>[e.type,e.button]);
touch('touchstart',[[100,100]]);touch('touchend',[]);tick(45);assert.deepEqual(buttons(),[['mousedown',0],['mouseup',0]]);c.events=[];
touch('touchstart',[[100,100]]);tick(500);touch('touchend',[]);assert.deepEqual(buttons(),[['mousedown',2],['mouseup',2]]);c.events=[];
touch('touchstart',[[100,100]]);touch('touchmove',[[140,100]]);touch('touchend',[]);assert.deepEqual(buttons(),[['mousedown',0],['mouseup',0]]);c.events=[];
touch('touchstart',[[100,100]]);touch('touchmove',[[140,100]]);touch('touchstart',[[140,100],[240,100]]);touch('touchmove',[[140,100],[340,100]]);touch('touchend',[[140,100]]);touch('touchend',[]);assert.deepEqual(buttons(),[['mousedown',0],['mouseup',0]]);assert.match(c.style.transform,/scale\(2\)/);c.events=[];
touch('touchstart',[[100,100]]);tick(500);touch('touchcancel',[]);assert.deepEqual(buttons(),[['mousedown',2],['mouseup',2]]);c.events=[];
elements['touch-menu'].onclick();tick(60);assert.deepEqual(c.events.map(e=>[e.type,e.keyCode]),[['keydown',79],['keyup',79]]);c.events=[];
changePointer({matches:false});touch('touchstart',[[100,100]]);touch('touchend',[]);tick(500);assert.equal(c.events.length,0);
console.log('PASS: tap, hold/right-click, drag, pinch cancels drag, zoom, cancellation releases button, menu keyboard, disabled mode');
