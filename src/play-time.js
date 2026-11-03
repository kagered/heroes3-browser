/* Local active-game time. Archive merge is idempotent across devices. */
'use strict';
(function(root){
  const valid=value=>{
    const result={};
    if(!value || typeof value!=='object' || Array.isArray(value))return result;
    for(const [id,ms] of Object.entries(value).slice(0,4096))if(/^[a-zA-Z0-9-]{1,64}$/.test(id) && Number.isSafeInteger(ms) && ms>=0 && ms<=315576000000)result[id]=ms;
    return result;
  };
  const merge=(a,b)=>{const result=valid(a);for(const [id,ms] of Object.entries(valid(b)))result[id]=Math.max(result[id]||0,ms);return result;};
  const format=ms=>{const seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60);return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
  if(typeof module==='object' && module.exports){module.exports={valid,merge,format};return;}
  const key='heroes3-play-time-v1', id=root.crypto.randomUUID();
  let ledger={},playing=false,last=performance.now(),dirty=false;
  try{ledger=valid(JSON.parse(localStorage.getItem(key)||'{}'));}catch{}
  function tick(){
    const now=performance.now(),elapsed=now-last;last=now;
    // A suspended process must not accrue hours when it wakes up.
    if(playing && !document.hidden && elapsed>=0 && elapsed<15000){ledger[id]=(ledger[id]||0)+Math.floor(elapsed);dirty=true;}
  }
  function flush(){tick();if(!dirty)return;try{ledger=merge(ledger,JSON.parse(localStorage.getItem(key)||'{}'));localStorage.setItem(key,JSON.stringify(ledger));dirty=false;}catch{}}
  function render(){const total=Object.values(ledger).reduce((a,b)=>a+b,0);for(const el of document.querySelectorAll('[data-play-time]'))el.textContent=(document.documentElement.lang==='en'?'Time played: ':'Время в игре: ')+format(total);}
  root.HeroesPlayTime={setPlaying(value){if(value===playing)return;tick();playing=value;flush();},snapshot(){flush();return {...ledger};},restore(value){flush();ledger=merge(ledger,value);dirty=true;flush();render();}};
  setInterval(()=>{tick();render();},1000);setInterval(flush,10000);
  document.addEventListener('visibilitychange',()=>{last=performance.now();flush();});
  root.addEventListener('pagehide',flush);
  root.addEventListener('storage',event=>{if(event.key===key){try{ledger=merge(ledger,JSON.parse(event.newValue||'{}'));render();}catch{}}});
  render();
})(typeof window==='undefined'?globalThis:window);
