/* Lab mobile shell. VCMI remains authoritative for game actions. */
'use strict';
(() => {
  const force = new URLSearchParams(location.search).get('mobile-map');
  const touchDevice=matchMedia('(any-pointer: coarse)').matches;
  const eligible = force !== 'off' && (force === '1' || touchDevice);
  let actionNotice, noticeTimer, module, panel, mapTop, dialogTop, bottom, screenHelp, active=false, mapOverlay=false, session=false, initialized=false, lastMask=-1, popup=false, heroHud, heroLabel, heroName, heroPoints, heroMeter, heroHint, pausePanel, pauseOpen=false, lastHeroKey="";
  const isIPad=()=>typeof navigator!=='undefined' && (/iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints>1));
  const en = () => document.documentElement.lang === 'en';
  const text = (ru,english) => en()?english:ru;
  const actions = [[12,'К герою','Center hero'],[11,'Королевство','Kingdom'],[7,'Уровень','Layer'],[9,'+','+'],[10,'−','−'],[1,'Герой','Hero'],[2,'Следующий','Next hero'],[3,'Город','Town'],[8,'Двигаться','Move'],[4,'Магия','Spells'],[5,'Конец хода','End turn'],[6,'Меню','Menu']];
  function profile() {
    const screenWidth=touchDevice && typeof screen!=='undefined' ? Math.max(screen.width||0,screen.height||0) : 0;
    const screenHeight=touchDevice && typeof screen!=='undefined' ? Math.min(screen.width||0,screen.height||0) : 0;
    return !!window.HEROES_MOBILE_ENGINE && eligible ? {width:Math.floor(Math.max(innerWidth,innerHeight,screenWidth)),height:Math.floor(Math.max(Math.min(innerWidth,innerHeight),screenHeight))} : null;
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
    if(saveNameInput && document.activeElement===saveNameInput){positionSaveNameInput();return;}
    const game=document.getElementById('game'), visual=window.visualViewport;
    const width=Math.round(visual?.width || innerWidth), height=Math.round(visual?.height || innerHeight);
    // Safari overlays its system status and dismissal controls in tablet fullscreen.
    const ipad=isIPad();
    const inset=touchDevice && document.fullscreenElement ? 28 : 0;
    const view={width:Math.max(width,height),height:Math.min(width,height)-inset};
    game.style.setProperty('--mobile-top-inset',inset+'px');
    game.style.setProperty('--mobile-start-inset',inset && ipad?'96px':inset?'64px':'8px');
    const changed=module.mobileViewport.width!==view.width || module.mobileViewport.height!==view.height;
    module.mobileViewport={width:view.width,height:view.height};
    if(changed)module.mobileViewportRevision=(module.mobileViewportRevision||0)+1;
    game.classList.toggle('mobile-portrait',innerHeight>innerWidth);
    game.style.setProperty('--mobile-view-width',view.width+'px');
    game.style.setProperty('--mobile-view-height',view.height+'px');
    const ratio=module.mobileRenderSize.width/module.mobileRenderSize.height;
    const dialogWidth=Math.min(view.width,Math.max(1,view.height-48)*ratio);
    game.style.setProperty('--mobile-dialog-width',dialogWidth+'px');
    game.style.setProperty('--mobile-dialog-height',dialogWidth/ratio+'px');
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
      if(typeof navigator!=='undefined' && navigator.standalone)return;
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
    const wasOpen=pauseOpen;pauseOpen=open;pausePanel.hidden=!open;
    if(open)pausePanel.querySelector('button')?.focus({preventScroll:true});
    else if(wasOpen && document.activeElement!==saveNameInput)document.getElementById('canvas').focus({preventScroll:true});
  }
  function state(value,mask,overlay=false,isPopup=false) {
    if(!panel)return;
    if(!initialized || active!==value || mapOverlay!==overlay || popup!==isPopup) {
      initialized=true;active=value;mapOverlay=overlay;popup=isPopup;
      if(active)saveNameField(false);
      if(turnBanner)turnBanner.hidden=!turnVisible || !(active || mapOverlay);
      const game=document.getElementById('game');game.classList.toggle('mobile-adventure-active',active || mapOverlay);
      game.scrollTop=0;game.scrollLeft=0;
      mapTop.hidden=!(active || popup);bottom.hidden=!(active || popup);dialogTop.hidden=active || popup;
      mapTop.inert=bottom.inert=popup;
      if(!active){module.mobileActions.length=0;togglePause(false);}
      window.dispatchEvent(new Event('mobile-adventure-change'));
    }
    if(mask!==lastMask) {
      lastMask=mask;
      for(const button of panel.querySelectorAll('button[data-action]'))button.disabled=!(mask&(1<<(Number(button.dataset.action)-1)));
    }
  }
  function notify(message,success=false,anchor=null) {
    if(!actionNotice)return;
    clearTimeout(noticeTimer);actionNotice.textContent=message;actionNotice.hidden=false;
    const anchored=anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y) && Number.isFinite(anchor.width);
    actionNotice.classList.toggle('anchored',!!anchored);
    Object.assign(actionNotice.style,anchored?{left:anchor.x+'px',top:anchor.y+'px',width:Math.max(120,anchor.width)+'px'}:{left:'',top:'',width:''});
    actionNotice.classList.toggle('success',success);
    noticeTimer=setTimeout(()=>{actionNotice.hidden=true;},success?4000:5000);
  }
  let saveNameInput, saveNameDone, saveNameRect, textFieldKind='save';
  function positionSaveNameInput() {
    if(!saveNameInput || !saveNameRect)return;
    const editing=document.activeElement===saveNameInput;
    const visual=window.visualViewport;
    const game=document.getElementById('game');
    const rect=game.getBoundingClientRect();
    const [x,y,width,height]=saveNameRect;
    if(editing) {
      const top=(visual?.offsetTop||0)+12,left=(visual?.offsetLeft||0)+12;
      Object.assign(saveNameInput.style,{left:left+'px',top:top+'px',width:Math.max(120,Math.min(560,(visual?.width||innerWidth)-110))+'px',height:'48px',transform:'none'});
      Object.assign(saveNameDone.style,{left:left+Math.max(120,Math.min(560,(visual?.width||innerWidth)-110))+8+'px',top:top+'px'});
    } else if(innerHeight>innerWidth) {
      Object.assign(saveNameInput.style,{left:(rect.right-y)+'px',top:(rect.top+x)+'px',width:width+'px',height:height+'px',transform:'rotate(90deg)'});
    } else Object.assign(saveNameInput.style,{left:(rect.left+x)+'px',top:(rect.top+y)+'px',width:width+'px',height:height+'px',transform:'none'});
    saveNameDone.hidden=!editing;
  }
  function saveNameField(visible,x,y,width,height,value,kind='save') {
    if(!panel || !module)return;
    if(!visible){if(saveNameInput){saveNameInput.hidden=true;saveNameInput.blur();}return;}
    if(!saveNameInput) {
      saveNameInput=document.createElement('input');saveNameInput.type='text';
      saveNameInput.className='mobile-save-name';saveNameInput.maxLength=240;
      saveNameInput.autocomplete='off';saveNameInput.spellcheck=false;
      saveNameInput.setAttribute('autocapitalize','off');
      saveNameInput.setAttribute('aria-label',text('Имя сохранения','Save name'));
      saveNameInput.oninput=()=>{
        if(textFieldKind==='save')saveNameInput.value=saveNameInput.value.replace(/[<>:"/\\|?*\r\n]/g,'');
        module.mobileSaveNameValue=saveNameInput.value;
      };
      saveNameInput.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter' || event.key==='Escape'){event.preventDefault();saveNameInput.blur();}});
      saveNameDone=document.createElement('button');saveNameDone.type='button';saveNameDone.className='mobile-save-done';saveNameDone.textContent=text('Готово','Done');saveNameDone.hidden=true;
      saveNameDone.onclick=()=>saveNameInput.blur();
      saveNameInput.addEventListener('focus',()=>{module.mobileTextEditing=true;positionSaveNameInput();});
      saveNameInput.addEventListener('blur',()=>{module.mobileTextEditing=false;saveNameDone.hidden=true;window.scrollTo?.(0,0);updateGeometry();positionSaveNameInput();});
      document.body.append(saveNameInput,saveNameDone);
      window.visualViewport?.addEventListener('scroll',positionSaveNameInput);
      window.addEventListener('scroll',positionSaveNameInput);

    }
    textFieldKind=kind;
    saveNameInput.setAttribute('aria-label',kind==='player'?text('Имя игрока','Player name'):text('Имя сохранения','Save name'));
    saveNameInput.hidden=false;
    saveNameRect=[x,y,width,height];positionSaveNameInput();
    if(document.activeElement!==saveNameInput && saveNameInput.value!==value)saveNameInput.value=value;
  }
  let turnBanner, turnHeading, turnDetail, turnTimer, turnGeneration=0, turnVisible=false;
  function turnState(phase,player,day,week,month) {
    if(!turnBanner)return;
    const generation=++turnGeneration;clearTimeout(turnTimer);
    const colors=['#d86250','#6796e4','#e4c85d','#79ac79','#dd9759','#b38ac9','#72b8ba','#d6b7bd'];
    const ru=['красного','синего','жёлтого','зелёного','оранжевого','фиолетового','бирюзового','розового'];
    const eng=['Red','Blue','Tan','Green','Orange','Purple','Teal','Pink'];
    const index=Number.isInteger(player)&&player>=0&&player<8?player:0;
    turnBanner.style.setProperty('--turn-player-color',colors[index]);
    turnBanner.classList.toggle('turn-ready',phase===2);turnVisible=true;turnBanner.hidden=!(active || mapOverlay);
    turnHeading.textContent=phase===2?text('Твой ход','Your turn'):phase===1?text('Ход '+ru[index]+' игрока',eng[index]+" player's turn"):text('Смена хода','Passing the turn');
    turnDetail.textContent=text('Месяц '+month+' · Неделя '+week+' · День '+day,'Month '+month+' · Week '+week+' · Day '+day);
    if(phase===2)turnTimer=setTimeout(()=>{if(generation===turnGeneration){turnVisible=false;turnBanner.hidden=true;}},2000);
  }
  let fullTextReader;
  function showFullText(value) {
    if(!fullTextReader) {
      fullTextReader=document.createElement('section');fullTextReader.className='mobile-full-text';fullTextReader.setAttribute('role','dialog');fullTextReader.setAttribute('aria-modal','true');
      const content=document.createElement('div');content.className='mobile-full-text-content';
      const close=document.createElement('button');close.type='button';close.textContent=text('Закрыть','Close');close.onclick=()=>{fullTextReader.hidden=true;};
      fullTextReader.append(content,close);document.body.append(fullTextReader);
    }
    fullTextReader.children[0].textContent=value.replace(/\{(?:[^{}|]*\|)?/g,'').replace(/\}/g,'');
    fullTextReader.children[0].scrollTop=0;fullTextReader.hidden=false;
  }
  function displayButton() {
    const b=document.createElement('button');b.type='button';b.textContent=text('Экран ⛶','Screen ⛶');b.onclick=()=>{if(isIPad() && !navigator.standalone && !document.fullscreenElement)screenHelp.hidden=false;else void fullscreen();};return b;
  }
  window.HeroesMobileAdventure = {
    get active(){return active;},get session(){return session;},send,profile,remapPoint,notify,saveNameField,showFullText,
    prepareDisplay(){if(touchDevice && !isIPad() && profile())void fullscreen(false);},
    attach(options,viewport) {
      module=options;session=true;
      options.mobileAdventureUI=true;options.mobileViewport=viewport;
      options.mobileRenderSize={width:Math.max(800,viewport.width),height:Math.max(600,viewport.height)};
      options.mobileActions=[];options.mobileAdventureState=state;options.mobileHeroState=heroState;options.mobileTurnState=turnState;
      const game=document.getElementById('game');game.classList.add('mobile-adventure-session');
      game.style.setProperty('--mobile-render-width',Math.max(800,viewport.width)+'px');
      game.style.setProperty('--mobile-render-height',Math.max(600,viewport.height)+'px');
      updateGeometry();
      window.addEventListener('resize',updateGeometry);
      window.addEventListener('fullscreenchange',updateGeometry);
      window.visualViewport?.addEventListener('resize',updateGeometry);
      panel=document.createElement('div');panel.className='mobile-adventure-shell';
      turnBanner=document.createElement('aside');turnBanner.className='mobile-turn-banner';turnBanner.hidden=true;turnBanner.setAttribute('role','status');turnBanner.setAttribute('aria-live','polite');
      const hourglass=document.createElement('span');hourglass.className='mobile-turn-hourglass';hourglass.setAttribute('aria-hidden','true');
      const turnCopy=document.createElement('div');turnHeading=document.createElement('strong');turnDetail=document.createElement('span');turnCopy.append(turnHeading,turnDetail);turnBanner.append(hourglass,turnCopy);panel.append(turnBanner);

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
      const info=document.createElement('p');info.textContent=text('Safari может выйти из полного экрана при свайпе — сайт не может отключить этот системный жест. Поэтому на iPad игра открывается без автоматического перехода в полный экран. Для игры без панелей Safari: «Поделиться» → «На экран Домой», затем открой игру через появившийся значок. Или включи полный экран кнопкой ниже.','Safari may leave fullscreen when you swipe; websites cannot disable that system gesture. On iPad the game therefore starts without automatic fullscreen. To play without Safari bars, choose Share → Add to Home Screen, then open the game from that icon. You can also enter fullscreen below.');
      const enter=document.createElement('button');enter.type='button';enter.textContent=text('Войти в полный экран','Enter fullscreen');enter.onclick=()=>{screenHelp.hidden=true;void fullscreen();};
      const close=document.createElement('button');close.type='button';close.textContent=text('Понятно','Got it');close.onclick=()=>{screenHelp.hidden=true;};
      screenHelp.append(info,enter,close);
      pausePanel=document.createElement('section');pausePanel.className='mobile-pause-panel';pausePanel.hidden=true;
      pausePanel.setAttribute('role','dialog');pausePanel.setAttribute('aria-modal','true');pausePanel.setAttribute('aria-label',text('Меню игры','Game menu'));
      const title=document.createElement('h2');title.textContent=text('Пауза','Game menu');pausePanel.append(title);
      const clock=document.createElement("p");clock.dataset.playTime="";clock.className="mobile-play-time";pausePanel.append(clock);
      const pauseItems=[[0,'Продолжить игру','Resume game'],[13,'Сохранить игру','Save game'],[14,'Загрузить игру','Load game'],[16,'Сведения о сценарии','Scenario information'],[11,'Королевство','Kingdom overview'],[17,'Копать','Dig'],[6,'Настройки игры','Game settings'],[15,'В главное меню игры','Game main menu'],[18,'Выход в ОС','Exit to desktop']];
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
      actionNotice=document.createElement('div');actionNotice.className='mobile-action-notice';actionNotice.hidden=true;actionNotice.setAttribute('role','status');actionNotice.setAttribute('aria-live','polite');actionNotice.setAttribute('aria-atomic','true');
      panel.append(mapTop,dialogTop,bottom,screenHelp,pausePanel,actionNotice);game.append(panel);
      // SDL derives mouse coordinates from the canvas bounding rectangle, which
      // contains swapped axes when the landscape surface is rotated in portrait.
      // Cancel page scrolling only inside the game surface. Safari's own
      // fullscreen dismissal gesture remains controlled by the system.
      game.addEventListener('touchmove',event=>{
        if(session && event.cancelable && (event.target===game || event.target===document.getElementById('canvas')))event.preventDefault();
      },{passive:false});
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
