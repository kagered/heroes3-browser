/* Experimental adventure-map shell. Engine actions are checked inside VCMI. */
'use strict';
(() => {
  const force = new URLSearchParams(location.search).get('mobile-map');
  const eligible = force !== 'off' && (force === '1' || matchMedia('(any-pointer: coarse)').matches);
  let module, panel, active = false, lastMask = -1;
  const en = () => document.documentElement.lang === 'en';
  const actions = [[11,'Королевство','Kingdom'],[7,'Уровень','Layer'],[9,'+','+'],[10,'−','−'],[1,'Герой','Hero'],[2,'Следующий','Next hero'],[3,'Город','Town'],[8,'Двигаться','Move'],[4,'Магия','Spells'],[5,'Конец хода','End turn'],[6,'Меню','Menu']];
  function send(id) { if(active && module.mobileActions.length < 4) module.mobileActions.push(id); }
  function state(value, mask) {
    if(!panel) return;
    if(active !== value) {
      active = value;
      const game=document.getElementById('game');
      game.classList.toggle('mobile-adventure-active', active);
      game.scrollTop=0;game.scrollLeft=0;
      panel.hidden = !active;
      if(!active) module.mobileActions.length = 0;
      window.dispatchEvent(new Event('mobile-adventure-change'));
    }
    if(mask !== lastMask) {
      lastMask = mask;
      for(const button of panel.querySelectorAll('button')) button.disabled = !(mask & (1 << (Number(button.dataset.action)-1)));
    }
  }
  window.HeroesMobileAdventure = {
    get active() { return active; }, send,
    profile() { return !!window.HEROES_MOBILE_ENGINE && eligible && innerWidth > innerHeight ? {width:Math.floor(innerWidth),height:Math.floor(innerHeight)} : null; },
    attach(options, viewport) {
      module = options;
      options.mobileAdventureUI = true; options.mobileViewport = viewport;
      options.mobileActions = []; options.mobileAdventureState = state;
      const game = document.getElementById('game');
      game.style.setProperty('--mobile-render-width', Math.max(800, viewport.width)+'px');
      game.style.setProperty('--mobile-render-height', Math.max(600, viewport.height)+'px');
      panel = document.createElement('div'); panel.className='mobile-adventure-shell'; panel.hidden=true;
      const top=document.createElement('nav'), bottom=document.createElement('nav');
      top.className='mobile-adventure-top'; bottom.className='mobile-adventure-bottom';
      top.setAttribute('aria-label',en()?'Map tools':'Инструменты карты');
      bottom.setAttribute('aria-label',en()?'Adventure actions':'Действия на карте');
      for(const [id,ru,english] of actions) {
        const b=document.createElement('button'); b.type='button';b.dataset.action=id;
        b.textContent=en()?english:ru;b.disabled=true;b.onclick=()=>send(id);
        (id===11 || id===7 || id===9 || id===10 ? top : bottom).append(b);
      }
      const note=document.createElement('span');note.textContent=en()?'Adventure · Lab':'Приключение · Lab';top.prepend(note);
      panel.append(top,bottom);game.append(panel);
    }
  };
})();
