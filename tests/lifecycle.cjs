const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const jobs=new Map(),frames=new Map(),events=new Map();let sequence=0,terminated=0,closed=0,lost=0;
class Worker {terminate(){terminated++}}
class AudioContext {constructor(){this.state='running'}close(){closed++;this.state='closed';return Promise.resolve()}}
const host={Worker,AudioContext,setTimeout:(fn)=>{const id=++sequence;jobs.set(id,fn);return id},clearTimeout:id=>jobs.delete(id),setInterval:fn=>{const id=++sequence;jobs.set(id,fn);return id},clearInterval:id=>jobs.delete(id),requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name)=>events.delete(name)};
const originals={...host};const canvas={width:1024,height:768,getContext:()=>({getExtension:()=>({loseContext:()=>lost++})})};
vm.runInNewContext(fs.readFileSync('src/runtime-lifecycle.js','utf8'),{window:host,Proxy,Reflect,Set,Map,Promise});
(async()=>{
 const runtime=host.createGameRuntime(canvas);
 new host.Worker('a');new host.Worker('b');new host.AudioContext();canvas.getContext('webgl2');
 let callbackRuns=0;host.requestAnimationFrame(()=>callbackRuns++);host.setTimeout(()=>callbackRuns++,16);host.setInterval(()=>callbackRuns++,16);
 const lateCallbacks=[...frames.values(),...jobs.values()];
 const counts=await runtime.stop();assert.equal(counts.workers,2);assert.equal(terminated,2);assert.equal(closed,1);assert.equal(lost,1);assert.equal(frames.size,0);assert.equal(canvas.width,1);assert.equal(canvas.height,1);
 for(const key of Object.keys(originals))assert.equal(host[key],originals[key]);
 for(const fn of [...jobs.values(),...lateCallbacks])fn();assert.equal(callbackRuns,0);
 await runtime.stop();assert.equal(terminated,2);assert.equal(closed,1);
 const second=host.createGameRuntime(canvas);new host.Worker('c');events.get('pagehide')();await second.stop();assert.equal(terminated,3);
 let saveDone,stopDone;const navigation=[];
 const context=vm.createContext({navigator:{userAgent:"Desktop",platform:"MacIntel",maxTouchPoints:0},gameLanguage:"ru",returningHome:false,saveQueue:new Promise(r=>saveDone=r),gameRuntime:{stop:()=>new Promise(r=>stopDone=r)},engine:{},window:{engine:{}},db:{close(){navigation.push('db-close')}},musicFiles:new Map(),loadedMusic:new Set(),setTimeout:fn=>{fn()},location:{replace:url=>navigation.push(url)},log:()=>{}});
 const app=fs.readFileSync('src/app.js','utf8');vm.runInContext(app.slice(app.indexOf('function homeDestination()'),app.indexOf('function connectMenuExit(')),context);
 const exiting=vm.runInContext('returnHome()',context);assert.deepEqual(navigation,[]);saveDone();await new Promise(setImmediate);assert.deepEqual(navigation,[]);stopDone({workers:1,audio:1});await exiting;assert.deepEqual(navigation,['db-close','/index.html']);assert.equal(context.engine,undefined);assert.equal(context.window.engine,undefined);
 console.log('PASS: workers, audio, rendering, timers, global restoration, repeated shutdown, pagehide, saves-before-stop-before-navigation');
})().catch(e=>{console.error(e);process.exitCode=1});
