/* Touch-to-mouse bridge for the unmodified SDL browser build. */
'use strict';
(() => {
  const canvas = document.getElementById('canvas');
  const game = document.getElementById('game');
  const tools = document.getElementById('touch-tools');
  const touchDevice = matchMedia('(any-pointer: coarse)');
  let enabled = touchDevice.matches;
  let gesture, timer, held = null, zoom = 1, panX = 0, panY = 0;
  let tapTimer;
  function mouse(type, point, button=0) {
    canvas.focus({preventScroll:true});
    canvas.dispatchEvent(new MouseEvent(type, {bubbles:true, cancelable:true,
      clientX:point.x, clientY:point.y, button, buttons:type === 'mouseup' ? 0 : (held === 2 ? 2 : held === 0 ? 1 : 0)}));
  }
  function release(point) {
    clearTimeout(timer);clearTimeout(tapTimer);
    if (held !== null) { mouse('mouseup', point || gesture?.last || {x:0,y:0}, held); held=null; }
  }
  function transform() {
    if(window.HeroesMobileAdventure?.active){canvas.style.transform="";return;}
    const maxX = canvas.clientWidth * (zoom-1)/2;
    const maxY = canvas.clientHeight * (zoom-1)/2;
    panX = Math.max(-maxX,Math.min(maxX,panX));
    panY = Math.max(-maxY,Math.min(maxY,panY));
    canvas.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
    const english = document.documentElement?.lang === 'en';
    document.getElementById('touch-zoom').textContent = zoom > 1.05 ? (english ? 'Reset zoom' : 'Масштаб 1:1') : (english ? 'Zoom in' : 'Увеличить');
  }
  function configure() {
    release();gesture=null;zoom=1;panX=panY=0;transform();
    game.classList.toggle('touch-mode', enabled);
    tools.hidden=!enabled;
  }
  touchDevice.addEventListener('change', event => { enabled=event.matches;configure(); });
  window.addEventListener("mobile-adventure-change",()=>{release();gesture=null;zoom=1;panX=panY=0;transform();});
  configure();
  const point = touch => ({x:touch.clientX,y:touch.clientY});
  function pair(touches) {
    const a=point(touches[0]),b=point(touches[1]);
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  function multi(touches) {
    release(); const center=pair(touches);
    gesture={type:'multi',center,zoom,panX,panY};
  }
  canvas.addEventListener('touchstart',event=>{
    if(!enabled)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.touches.length>1){multi(event.touches);return;}
    release();
    const p=point(event.touches[0]);gesture={type:'tap',start:p,last:p};
    mouse('mousemove',p);
    timer=setTimeout(()=>{
      if(gesture?.type!=='tap')return;
      gesture.type='right';held=2;mouse('mousedown',gesture.last,2);
    },500);
  },{capture:true,passive:false});
  canvas.addEventListener('touchmove',event=>{
    if(!enabled)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.touches.length>1){
      if(gesture?.type!=='multi')multi(event.touches);
      const center=pair(event.touches);
      if(window.HeroesMobileAdventure?.active){
        const ratio=center.distance/Math.max(1,gesture.center.distance);
        if(ratio>1.18 || ratio<0.85){window.HeroesMobileAdventure.send(ratio>1?9:10);gesture.center=center;}
        return;
      }
      zoom=Math.max(1,Math.min(3,gesture.zoom*center.distance/Math.max(1,gesture.center.distance)));
      panX=gesture.panX+center.x-gesture.center.x;panY=gesture.panY+center.y-gesture.center.y;transform();return;
    }
    if(!gesture || gesture.type==='multi')return;
    const p=point(event.touches[0]);gesture.last=p;
    if(gesture.type==='tap' && Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>8){
      clearTimeout(timer);gesture.type='drag';held=0;mouse('mousedown',gesture.start);
    }
    mouse('mousemove',p,held===2?2:0);
  },{capture:true,passive:false});
  canvas.addEventListener('touchend',event=>{
    if(!enabled)return;
    event.preventDefault();event.stopImmediatePropagation();clearTimeout(timer);
    if(gesture?.type==='tap' && !event.touches.length){
      const p=gesture.last;held=0;mouse('mousedown',p);
      tapTimer=setTimeout(()=>release(p),45);
    }else release();
    // After a pinch, ignore the remaining finger until all fingers are lifted.
    if(!event.touches.length)gesture=null;
  },{capture:true,passive:false});
  canvas.addEventListener('touchcancel',event=>{
    if(!enabled)return;event.preventDefault();event.stopImmediatePropagation();release();gesture=null;
  },{capture:true,passive:false});
  window.addEventListener('blur',()=>{release();gesture=null;});
  window.addEventListener('resize',transform);
  function key(key,code,keyCode) {
    canvas.focus({preventScroll:true});
    const options={key,code,keyCode,which:keyCode,bubbles:true};
    canvas.dispatchEvent(new KeyboardEvent('keydown',options));
    setTimeout(()=>canvas.dispatchEvent(new KeyboardEvent('keyup',options)),60);
  }
  document.getElementById('touch-menu').onclick=()=>key('o','KeyO',79);
  document.getElementById('touch-turn').onclick=()=>key('e','KeyE',69);
  document.getElementById('touch-escape').onclick=()=>key('Escape','Escape',27);
  document.getElementById('touch-zoom').onclick=()=>{zoom=zoom>1.05?1:2;panX=panY=0;transform();};
  const help=document.getElementById('touch-help');
  document.getElementById('touch-guide').onclick=()=>{help.hidden=!help.hidden;};
  document.getElementById('touch-help-close').onclick=()=>{help.hidden=true;};
})();
