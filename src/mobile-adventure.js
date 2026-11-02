/* Lab mobile shell. VCMI remains authoritative for game actions. */
'use strict';
(() => {
  const force = new URLSearchParams(location.search).get('mobile-map');
  const touchDevice=matchMedia('(any-pointer: coarse)').matches;
  const eligible = force !== 'off' && (force === '1' || touchDevice);
  let module, panel, mapTop, dialogTop, bottom, screenHelp, active=false, session=false, initialized=false, lastMask=-1, heroHud, heroLabel, heroName, heroPoints, heroMeter, heroHint, pausePanel, pauseOpen=false, lastHeroKey="";
  const en = () => document.documentElement.lang === 'en';
  const text = (ru,english) => en()?english:ru;
  const actions = [[12,'К герою','Center hero'],[11,'Королевство','Kingdom'],[7,'Уровень','Layer'],[9,'+','+'],[10,'−','−'],[1,'Герой','Hero'],[2,'Следующий','Next hero'],[3,'Город','Town'],[8,'Двигаться','Move'],[4,'Магия','Spells'],[5,'Конец хода','End turn'],[6,'Меню','Menu']];
  function profile() {
    const screenWidth=touchDevice && typeof screen!=='undefined' ? Math.max(screen.width||0,screen.height||0) : 0;
    return !!window.HEROES_MOBILE_ENGINE && eligible ? {width:Math.floor(Math.max(innerWidth,innerHeight,screenWidth)),height:Math.floor(Math.min(innerWidth,innerHeight))} : null;
  }
  function send(id) { if(active && module.mobileActions.length<4) module.mobileActions.push(id); }
  function escape() {
    const canvas=document.getElementById('canvas');canvas.focus({preventScroll:true});
    const options={key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true};
    canvas.dispatchEvent(new KeyboardEvent('keydown',options));
    setTimeout(()=>canvas.dispatchEvent(new KeyboardEvent('keyup',options)),60);
  }
  function updateGeometry() {
    if(!session)return;
    const game=document.getElementById('game'), view={width:Math.max(innerWidth,innerHeight),height:Math.min(innerWidth,innerHeight)};
    game.classList.toggle('mobile-portrait',innerHeight>innerWidth);
    game.style.setProperty('--mobile-view-width',view.width+'px');
    game.style.setProperty('--mobile-view-height',view.height+'px');
    const ratio=Math.max(800,module.mobileViewport.width)/Math.max(600,module.mobileViewport.height);
    const width=Math.min(view.width,Math.max(1,view.height-48)*ratio);
    game.style.setProperty('--mobile-dialog-width',width+'px');
    game.style.setProperty('--mobile-dialog-height',width/ratio+'px');
    game.scrollTop=0;game.scrollLeft=0;
  }
  function remapPoint(point,canvas) {
    if(!session || innerWidth>=innerHeight)return point;
    const rect=canvas.getBoundingClientRect();
    return {x:rect.left+(point.y-rect.top)/rect.height*rect.width,
      y:rect.top+(rect.right-point.x)/rect.width*rect.height};
  }
  async function fullscreen(showHelp=true) {
    try {
      if(!document.fullscreenElement) {
        if(!document.documentElement.requestFullscreen)throw new Error('unsupported');
        await document.documentElement.requestFullscreen({navigationUI:'hide'});
      }
    } catch { if(showHelp && screenHelp)screenHelp.hidden=false; }
    try { await screen.orientation?.lock?.('landscape'); } catch {}
    updateGeometry();
  }
  function heroState(name,remaining,limit,selected) {
    if(!heroHud)return;
    const key=[name,remaining,limit,selected].join('|');if(key===lastHeroKey)return;lastHeroKey=key;
    heroName.textContent=name || text('Нет героя','No hero');
    heroPoints.textContent=name ? `${remaining} / ${limit}` : '—';
    heroMeter.setAttribute('aria-label',`${text('Оставшийся запас хода','Remaining movement points')}: ${remaining} / ${limit}`);
    heroMeter.max=Math.max(1,limit);heroMeter.value=Math.max(0,remaining);
    heroHint.textContent=!name ? text('Выбери другого героя','Select another hero') : !selected ? text('Выбран город · нажми «К герою»','Town selected · Center hero to move') : remaining===0 ? text('Запас хода исчерпан · заверши ход','No movement left · end the turn') : text('Перетащи карту · выбери путь','Drag the map · select a destination');
    heroHud.classList.toggle('movement-empty',!!name && remaining===0);
  }
  function togglePause(open) {
    if(!pausePanel)return;
    pauseOpen=open;pausePanel.hidden=!open;
    if(open)pausePanel.querySelector('button')?.focus({preventScroll:true});
    else document.getElementById('canvas').focus({preventScroll:true});
  }
  function state(value,mask) {
    if(!panel)return;
    if(!initialized || active!==value) {
      initialized=true;active=value;
      const game=document.getElementById('game');game.classList.toggle('mobile-adventure-active',active);
      game.scrollTop=0;game.scrollLeft=0;
      mapTop.hidden=!active;bottom.hidden=!active;dialogTop.hidden=active;
      if(!active){module.mobileActions.length=0;togglePause(false);}
      window.dispatchEvent(new Event('mobile-adventure-change'));
    }
    if(mask!==lastMask) {
      lastMask=mask;
      for(const button of panel.querySelectorAll('button[data-action]'))button.disabled=!(mask&(1<<(Number(button.dataset.action)-1)));
    }
  }
  function displayButton() {
    const b=document.createElement('button');b.type='button';b.textContent=text('Экран ⛶','Screen ⛶');b.onclick=()=>fullscreen();return b;
  }
  window.HeroesMobileAdventure = {
    get active(){return active;},get session(){return session;},send,profile,remapPoint,
    prepareDisplay(){if(touchDevice && profile())void fullscreen(false);},
    attach(options,viewport) {
      module=options;session=true;
      options.mobileAdventureUI=true;options.mobileViewport=viewport;
      options.mobileActions=[];options.mobileAdventureState=state;options.mobileHeroState=heroState;
      const game=document.getElementById('game');game.classList.add('mobile-adventure-session');
      game.style.setProperty('--mobile-render-width',Math.max(800,viewport.width)+'px');
      game.style.setProperty('--mobile-render-height',Math.max(600,viewport.height)+'px');
      updateGeometry();
      window.addEventListener('resize',updateGeometry);
      window.addEventListener('fullscreenchange',updateGeometry);
      panel=document.createElement('div');panel.className='mobile-adventure-shell';
      mapTop=document.createElement('nav');dialogTop=document.createElement('nav');bottom=document.createElement('nav');
      mapTop.className=dialogTop.className='mobile-adventure-top';bottom.className='mobile-adventure-bottom';
      mapTop.setAttribute('aria-label',text('Инструменты карты','Map tools'));
      bottom.setAttribute('aria-label',text('Действия на карте','Adventure actions'));
      for(const [id,ru,english] of actions) {
        const b=document.createElement('button');b.type='button';b.dataset.action=id;b.textContent=en()?english:ru;b.disabled=true;b.onclick=()=>id===6?togglePause(true):send(id);
        if(id===9 || id===10)b.setAttribute('aria-label',id===9?text('Приблизить карту','Zoom map in'):text('Отдалить карту','Zoom map out'));
        (id===12 || id===11 || id===7 || id===9 || id===10 ? mapTop : bottom).append(b);
      }
      heroHud=document.createElement('div');heroHud.className='mobile-hero-hud';
      heroLabel=document.createElement('div');heroLabel.className='mobile-hero-line';
      heroName=document.createElement('span');heroName.className='mobile-hero-name';heroPoints=document.createElement('span');heroPoints.className='mobile-hero-points';heroLabel.append(heroName,heroPoints);
      heroMeter=document.createElement('progress');heroHint=document.createElement('div');
      heroMeter.setAttribute('aria-label',text('Оставшийся запас хода','Remaining movement points'));heroHint.className='mobile-movement-hint';
      heroHud.append(heroLabel,heroMeter,heroHint);mapTop.append(heroHud,displayButton());
      const back=document.createElement('button');back.type='button';back.textContent=text('← Назад / Закрыть','← Back / Close');back.onclick=escape;
      const home=document.createElement('button');home.type='button';home.textContent=text('На главную','Home');home.onclick=()=>document.getElementById('back').click();
      dialogTop.append(back,displayButton(),home);
      screenHelp=document.createElement('div');screenHelp.className='mobile-display-help';screenHelp.hidden=true;
      screenHelp.setAttribute('role','dialog');screenHelp.setAttribute('aria-modal','false');
      const info=document.createElement('p');info.textContent=text('Если браузер не убирает панели: в Safari нажми «Поделиться» → «На экран Домой», затем открой игру через появившийся значок. Это запуск сайта, без отдельного приложения.','If your browser keeps its bars visible: in Safari choose Share → Add to Home Screen, then launch the game from that icon. This opens the website without a separate app.');
      const close=document.createElement('button');close.type='button';close.textContent=text('Понятно','Got it');close.onclick=()=>{screenHelp.hidden=true;};
      screenHelp.append(info,close);
      pausePanel=document.createElement('section');pausePanel.className='mobile-pause-panel';pausePanel.hidden=true;
      pausePanel.setAttribute('role','dialog');pausePanel.setAttribute('aria-modal','true');pausePanel.setAttribute('aria-label',text('Меню игры','Game menu'));
      const title=document.createElement('h2');title.textContent=text('Пауза','Game menu');pausePanel.append(title);
      const pauseItems=[[0,'Продолжить игру','Resume game'],[13,'Сохранить игру','Save game'],[14,'Загрузить игру','Load game'],[16,'Сведения о сценарии','Scenario information'],[11,'Королевство','Kingdom overview'],[6,'Настройки игры','Game settings'],[15,'В главное меню игры','Game main menu']];
      for(const [id,ru,english] of pauseItems){
        const button=document.createElement('button');button.type='button';button.textContent=en()?english:ru;
        if(id)button.dataset.action=id;
        button.onclick=()=>{togglePause(false);if(id)send(id);};pausePanel.append(button);
      }
      pausePanel.addEventListener('keyup',event=>event.stopPropagation());
      pausePanel.addEventListener('keydown',event=>{
        event.stopPropagation();
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();togglePause(false);}
        if(event.key==='Tab'){
          const buttons=Array.from(pausePanel.querySelectorAll('button')).filter(b=>!b.disabled);
          const first=buttons[0],last=buttons[buttons.length-1];
          if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
          else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
        }
      });
      panel.append(mapTop,dialogTop,bottom,screenHelp,pausePanel);game.append(panel);
      // SDL derives mouse coordinates from the canvas bounding rectangle, which
      // contains swapped axes when the landscape surface is rotated in portrait.
      const canvas=document.getElementById('canvas');
      for(const type of ['mousedown','mousemove','mouseup'])canvas.addEventListener(type,event=>{
        if(event.heroesMobileMapped || !session || innerWidth>=innerHeight)return;
        event.stopImmediatePropagation();event.preventDefault();
        const p=remapPoint({x:event.clientX,y:event.clientY},canvas);
        const mapped=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:p.x,clientY:p.y,button:event.button,buttons:event.buttons});
        mapped.heroesMobileMapped=true;canvas.dispatchEvent(mapped);
      },true);
      state(false,0);
    }
  };
})();
