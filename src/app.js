/* Local launcher for the unmodified VCMI 1.6.5 WebAssembly build. */
'use strict';
const $ = id => document.getElementById(id);
const log = (...args) => {
  const text = args.join(' ');
  $('log').textContent += text + '\n'; console.log(...args);
  if(text.startsWith('Mobile scenario end:'))recordCompletionPhase(text);
  if (autoJoining && text.includes('Connection established')) {
    autoJoining = false;
    $('connecting').hidden = true;
  }
};
function readCompletionTrace() {
  try {
    const value=JSON.parse(localStorage.getItem('heroes3.completionTrace.v1')||'[]');
    return Array.isArray(value)?value.filter(item=>item && typeof item.phase==='string' && Number.isFinite(item.time)).slice(-24):[];
  } catch {return [];}
}
function recordCompletionPhase(phase) {
  try {sessionStorage.setItem('heroes3.lastCompletionPhase',phase);}catch{}
  try {
    const trace=phase==='Mobile scenario end: Grail placement confirmed'?[]:readCompletionTrace();
    trace.push({phase,time:Date.now()});localStorage.setItem('heroes3.completionTrace.v1',JSON.stringify(trace.slice(-24)));
  } catch {}
}
const status = (text, value) => { $('status').textContent = text; if (value !== undefined) $('progress').value = value; };
const loadingStages = [
  ['Подготовка хранилища', 'Preparing storage'],
  ['Загрузка движка', 'Loading the engine'],
  ['Подготовка файлов игры', 'Preparing game files'],
  ['Восстановление сохранений', 'Restoring saves'],
  ['Открытие главного меню', 'Opening the main menu'],
];
function loadingStage(index, detail = '') {
  $('load-steps').hidden = false;
  $('load-steps').replaceChildren(...loadingStages.map((labels, number) => {
    const item = document.createElement('li');
    item.textContent = ui(...labels);
    item.dataset.number = number + 1;
    if (number < index) item.className = 'done';
    if (number === index) item.setAttribute('aria-current', 'step');
    return item;
  }));
  status(ui(`Этап ${index + 1} из 5 · `, `Step ${index + 1} of 5 · `) + ui(...loadingStages[index]));
  $('load-detail').textContent = detail;
  $('progress').removeAttribute('value');
}
function showLoading() {
  $('loading-content').append($('load-state'));
  $('loading-screen').hidden = false;
  $('loading-screen').setAttribute('aria-busy', 'true');
}
function finishLoading(failed = false) {
  $('loading-screen').hidden = true;
  $('loading-screen').setAttribute('aria-busy', 'false');
  $('load-home').append($('load-state'));
  $('load-steps').hidden = true;
  $('load-detail').textContent = '';
  $('progress').value = failed ? 0 : 100;
}
let inventory;
let gameLanguage = window.heroesPreferences.language();
const ui = (ru, en) => gameLanguage === 'en' ? en : ru;
const dataURL = path => '/game-data/' + path + '?lang=' + gameLanguage;
let engine;
let gameRuntime;
let db;
let saveQueue = Promise.resolve();
const musicFiles = new Map();
const loadedMusic = new Set();
let returningHome = false;
let networkInfo;
let autoJoining = false;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function invitationCode(ip, port=3030) {
  const bytes = [...ip.split('.').map(Number),port>>8,port&255];
  bytes.push(bytes.reduce((sum,n)=>((sum*31)^n)&255,73));
  let bits=0,value=0,result='';
  for (const byte of bytes) {
    value=(value<<8)|byte;bits+=8;
    while(bits>=5){bits-=5;result+=alphabet[(value>>>bits)&31];}
  }
  if(bits) result+=alphabet[(value<<(5-bits))&31];
  return 'H3-'+result.match(/.{1,4}/g).join('-');
}
function decodeCode(code) {
  const compact=code.trim().toUpperCase().replace(/^H3-?/,'').replace(/[\s-]/g,'');
  if(compact.length!==12) throw new Error('Проверь код: скопируй его целиком у друга.');
  let bits=0,value=0,bytes=[];
  for(const char of compact){const n=alphabet.indexOf(char);if(n<0)throw new Error('В коде есть лишний символ.');value=(value<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}}
  if(bytes.length!==7 || bytes.slice(0,6).reduce((sum,n)=>((sum*31)^n)&255,73)!==bytes[6]) throw new Error('В коде опечатка. Скопируй его ещё раз.');
  return {host:bytes.slice(0,4).join('.'),port:(bytes[4]<<8)|bytes[5]};
}
function busy(value) {
  for(const id of ['create','join','start']) $(id).disabled=value;
  if(!value){$('create').disabled=!networkInfo?.can_host;$('join').disabled=!networkInfo?.available;}
}
async function apiAction(path) {
  const response=await fetch(path,{method:'POST',headers:{'X-Heroes-Token':networkInfo?.token||''}});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Не удалось выполнить действие');return data;
}
async function createRoom() {
  busy(true);status('Создаём игру…');
  try {
    const room=await apiAction('/api/host');
    $('room-address').replaceChildren(...room.addresses.map(ip=>new Option(ip,ip)));
    $('room-options').hidden=room.addresses.length<2;
    const showCode=()=>{$('room-code').textContent=invitationCode($('room-address').value,room.port);};
    $('room-address').onchange=showCode;showCode();
    if(room.addresses[0]==='127.0.0.1')throw new Error('Не найден адрес сети. Включи Hamachi или подключись к домашней сети и попробуй ещё раз.');
    $('room-bar').hidden=false;
    $('mode').value='lan';$('host-ip').value='127.0.0.1';$('host-port').value=room.port;
    await start(true);
  } catch(error){status(error.message);busy(false);}
}
async function joinRoom() {
  try {const target=decodeCode($('join-code').value);$('mode').value='lan';$('host-ip').value=target.host;$('host-port').value=target.port;await start(true);}
  catch(error){status(error.message);busy(false);}
}
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('room-code').textContent);$('copy-code').textContent='Скопировано';}catch{$('copy-code').textContent='Выдели и скопируй код';}};
$('create').onclick=createRoom;$('join').onclick=joinRoom;
$('close-app').onclick=async()=>{try{await apiAction('/api/quit');$('launcher').innerHTML='<h1>Приложение закрыто</h1><p>Теперь можно закрыть эту вкладку.</p>';}catch(error){status(error.message);}};

async function enterNetworkLobby() {
  autoJoining=true;$('connecting').hidden=false;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  await wait(500);
  // Native menu coordinates on the launcher's fixed 1024x768 canvas.
  for(const [x,y] of [[756,154],[761,264],[687,464],[457,537],[452,435]]) {
    if(!autoJoining)return;
    const canvas=$('canvas');canvas.focus();
    const rect=canvas.getBoundingClientRect();
    const position={clientX:rect.left+x*rect.width/1024,clientY:rect.top+y*rect.height/768,bubbles:true,button:0};
    canvas.dispatchEvent(new MouseEvent('mousemove',position));
    await wait(150);
    canvas.dispatchEvent(new MouseEvent('mousedown',{...position,buttons:1}));
    await wait(80);
    canvas.dispatchEvent(new MouseEvent('mouseup',{...position,buttons:0}));
    await wait(450);
  }
  setTimeout(()=>{if(autoJoining){$('connection-message').textContent='Соединение пока не установлено. Проверь, что хозяин открыл игру и вы в одной сети Hamachi.';}},15000);
}

$('mode').value = new URLSearchParams(location.search).get('mode') === 'lan' ? 'lan' : 'solo';
$('host-ip').value = window.heroesPreferences.getItem('heroes3.lan.host') || '127.0.0.1';
$('player-name').value = new URLSearchParams(location.search).get('player') || window.heroesPreferences.getItem('heroes3.lan.name') || 'Игрок';
function updateNetworkUI() {
  $('network-fields').hidden = $('mode').value !== 'lan';
  $('network-status').textContent = networkInfo?.available ? 'Локальное подключение готово.' : 'Для сетевой игры запусти Start-LAN.command или Start-Client.command.';
}
$('mode').onchange = updateNetworkUI;
updateNetworkUI();

function homeDestination() {
  const appleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Older Safari can retain shared WASM memory despite terminating workers.
  // A separate, committed cross-site document is used only on the public site.
  if (appleTouch && location.origin === 'https://heroes-iii-lab.pages.dev')
    return 'https://heroes-iii-lab-reset.pages.dev/?lang=' + gameLanguage;
  return '/index.html';
}

function returnToGameMenu(target = 'main') {
  try { if(target==='load')sessionStorage.setItem('heroes3.mobileMenuTarget','load');else sessionStorage.removeItem('heroes3.mobileMenuTarget'); } catch {}
  try { sessionStorage.setItem('heroes3.retryLaunch','1'); } catch {}
  // Defer teardown until the engine confirmation callback has returned.
  setTimeout(()=>{void returnHome();},0);
}

async function returnHome() {
  if (returningHome) return;
  returningHome = true;
  await saveQueue;
  if (gameRuntime) {
    const counts = await gameRuntime.stop(engine);
    log(`Game stopped: ${counts.workers} workers, ${counts.audio} audio contexts`);
    try { sessionStorage.setItem('heroes3.lastShutdown', JSON.stringify(counts)); } catch {}
  }
  engine = undefined;
  window.engine = undefined;
  if (db) { db.close(); db = undefined; }
  musicFiles.clear(); loadedMusic.clear();
  // Allow the browser to retire terminated worker resources before navigation.
  await new Promise(resolve => setTimeout(resolve, 200));
  location.replace(homeDestination());
}

function connectMenuExit(nativeSettings = false) {
  // VCMI 1.6.5 compiles handleQuit() as a no-op for Emscripten.
  // Its menu supports lazy tabs. A dedicated tab opens our tiny local image;
  // that resource read bridges the real menu button to the browser launcher.
  // This leaves the upstream JS/WASM artifacts unchanged.
  const source = engine.FS.readFile('/config/mainmenu.json', {encoding:'utf8'});
  const json = source.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match, string) => string || '').replace(/,\s*([}\]])/g, '$1');
  const menu = JSON.parse(json);
  for (const tab of menu.window.items) {
    for (const button of tab.buttons || []) {
      if (button.command === 'exit') button.command = 'to browser-exit';
    }
  }
  menu.window.items.push({name:'browser-exit',buttons:[],
    images:[{x:0,y:0,name:'browser-exit.bmp'}]});
  write('/config/mainmenu.json', new TextEncoder().encode(JSON.stringify(menu)));
  // A valid 1x1, 24-bit BMP. It is read only when the exit tab is selected.
  const bmp = new Uint8Array(58);
  const view = new DataView(bmp.buffer);
  bmp.set([66,77]); view.setUint32(2,58,true); view.setUint32(10,54,true);
  view.setUint32(14,40,true); view.setUint32(18,1,true); view.setUint32(22,1,true);
  view.setUint16(26,1,true); view.setUint16(28,24,true); view.setUint32(34,4,true);
  write('/Sprites/browser-exit.bmp',bmp);
  // The prebuilt WASM also omits html5::quitGame(). Route the in-game
  // exit button through an unused lazy settings tab, using the same FS bridge.
  // Tab 3 is not exposed by this build's settings tab bar (indices 0..2).
  if (!nativeSettings) {
  const settingsPath = '/config/widgets/settings/settingsMainContainer.json';
  const settingsSource = engine.FS.readFile(settingsPath, {encoding:'utf8'});
  const settingsMenu = JSON.parse(settingsSource.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match, string) => string || '').replace(/,\s*([}\]])/g, '$1'));
  const quitIndex = settingsMenu.items.findIndex(item => item.name === 'quitButton');
  if (quitIndex < 0) throw new Error('Не найден элемент выхода из игрового меню.');
  const originalQuit = settingsMenu.items[quitIndex];
  settingsMenu.items[quitIndex] = {
    name:'quitButton', type:'toggleGroup', callback:'activateSettingsTab',
    position:originalQuit.position,
    items:[{...originalQuit, name:'browserQuitButton', type:'toggleButton',
      position:{x:0,y:0}, index:3, callback:undefined}]
  };
  write(settingsPath, new TextEncoder().encode(JSON.stringify(settingsMenu)));
  const exitTabPath = '/config/widgets/settings/otherOptionsTab.json';
  const exitTabSource = engine.FS.readFile(exitTabPath, {encoding:'utf8'});
  const exitTab = JSON.parse(exitTabSource.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match, string) => string || '').replace(/,\s*([}\]])/g, '$1'));
  exitTab.items.push({name:'browserExitBridge',type:'texture',image:'browser-exit.bmp',position:{x:0,y:0}});
  write(exitTabPath, new TextEncoder().encode(JSON.stringify(exitTab)));
  }


  const open = engine.FS.open;
  engine.FS.open = function(path, ...args) {
    const result = open.call(this,path,...args);
    if (typeof path === 'string' && path.toLowerCase().endsWith('/browser-exit.bmp'))
      void returnHome();
    return result;
  };
}

function openDB() {
  return new Promise((resolve, reject) => {
    let expired = false;
    const request = indexedDB.open('heroes3-local-saves', 4);
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error(ui('Хранилище не отвечает. Закрой другие вкладки с игрой и повтори проверку.', 'Storage is not responding. Close other game tabs and check again.')));
    }, 8000);
    request.onupgradeneeded = () => {
      if (expired) { request.transaction.abort(); return; }
      for (const name of ['files', 'assets', 'migrations', 'custom-maps', 'custom-map-info'])
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (expired) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => { clearTimeout(timer); reject(request.error); };
  });
}
async function checkBeforeLaunch() {
  status(ui('Проверяем готовность браузера…', 'Checking browser readiness…'), 0);
  const result = await window.heroesPreflight.check({openStorage:openDB,
    requiredBytes:inventory.files.filter(file => !file.path.startsWith('Mp3/')).reduce((sum,file) => sum + file.size,0)});
  const panel = $('preflight-panel');
  panel.hidden = false;
  panel.dataset.state = result.errors.length ? 'error' : result.warnings.length ? 'warning' : 'ready';
  panel.open = Boolean(result.errors.length || result.warnings.length);
  $('preflight-summary').textContent = result.errors.length ? ui('Запуск пока недоступен', 'Launch is currently unavailable') : result.warnings.length ? ui('Можно играть · есть замечания', 'Ready to play · please note') : ui('Браузер готов к запуску', 'Browser checks passed');
  $('preflight-messages').replaceChildren(...[...result.errors,...result.warnings].map(labels => {
    const item = document.createElement('li'); item.textContent = ui(...labels); return item;
  }));
  $('preflight-retry').hidden = !result.errors.length;
  return result.errors.length === 0;
}
// Copy the old English saves once. The source database remains intact.
async function migrateEnglishSaves(target) {
  const source = await new Promise((resolve, reject) => {
    const request = indexedDB.open('heroes3-en-saves');
    let absent = false;
    request.onupgradeneeded = () => { absent = true; request.transaction.abort(); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => absent ? resolve(null) : reject(request.error);
  });
  if (!source) return;
  try {
    if (!source.objectStoreNames.contains('files')) return;
    const entries = await new Promise((resolve, reject) => {
      const rows = [];
      const tx = source.transaction('files');
      const request = tx.objectStore('files').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) { rows.push([cursor.key, cursor.value]); cursor.continue(); }
      };
      tx.oncomplete = () => resolve(rows);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
    await new Promise((resolve, reject) => {
      // Save files and the migration marker commit together, including across tabs.
      const tx = target.transaction(['files', 'migrations'], 'readwrite');
      const files = tx.objectStore('files');
      const markers = tx.objectStore('migrations');
      const marker = markers.get('english-saves-v1');
      marker.onsuccess = () => {
        if (marker.result) return;
        const keys = files.getAllKeys();
        keys.onsuccess = () => {
          const occupied = new Set([...keys.result, ...entries.map(([path]) => path)]);
          const existing = new Set(keys.result);
          const renamed = new Map();
          const stem = path => path.replace(/\.[^/.]+$/, '');
          // Rename an entire save family, keeping companion files together.
          for (const [path] of entries) {
            const base = stem(path);
            if (!existing.has(path) || renamed.has(base)) continue;
            let number = 1, candidate;
            do {
              candidate = base + ' (English' + (number === 1 ? '' : ' ' + number) + ')';
              number++;
            } while (entries.some(([key]) => stem(key) === base && occupied.has(candidate + key.slice(base.length))));
            renamed.set(base, candidate);
            for (const [key] of entries)
              if (stem(key) === base) occupied.add(candidate + key.slice(base.length));
          }
          for (const [path, data] of entries) {
            const base = stem(path);
            files.add(data, renamed.has(base) ? renamed.get(base) + path.slice(base.length) : path);
          }
          markers.put(true, 'english-saves-v1');
        };
      };
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { source.close(); }
}
function persist(path, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(data, path);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function restore() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const request = tx.objectStore('files').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) { write(cursor.key, cursor.value); cursor.continue(); }
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function write(path, data) {
  if (!path.startsWith('/')) path = '/' + path;
  engine.FS.mkdirTree(path.substring(0, path.lastIndexOf('/')) || '/');
  engine.FS.writeFile(path, data, {canOwn:true});
}
// Checksums of the pinned, unmodified VCMI 1.6.5 resource package.
const engineAssets = {"vendor/vcmi.data":{"size":7919378,"hash":"5cf736ddd2e8546d66dfe5f7aa899645098d1ca18de4c272b3fbabbfda0a3872"},"vendor/vcmi.data.js":{"size":64017,"hash":"8b1d546d1eeedfdad0cad7b72a80cce6dfe06ca4063e00477107ec120dfe4f0f"},"vendor/vcmiclient.wasm":{"size":9039947,"hash":"79fc6206700775aafb4e15e57969792d48241f16879e4ac32cca4e486bb800f1"}};
function fetchAsset(url,options) { return fetch(url,options); }
async function fetchBytes(url,version='engine-1.6.5',onProgress) {
  const file=inventory?.files.find(file=>dataURL(file.path)===url);
  const metadata=file?{size:file.size,hash:/^[a-f0-9]{64}$/.test(file.version)?file.version:undefined}:(window.HEROES_MOBILE_ENGINE?.[url] || engineAssets[url])||{};
  try {
    return await window.HeroesDownloads.load({database:db,url,key:version+':'+url,...metadata,fetchResource:fetchAsset,onProgress,
      onState:event=>{
        if(event.kind==='cache-unavailable') { log('Resource cache unavailable:',url);return; }
        const text=event.kind==='retry'?ui(`Связь прервалась или файл не прошёл проверку. Повторяем загрузку: попытка ${event.attempt} из ${event.attempts}…`,`Connection interrupted or a file check failed. Retrying: attempt ${event.attempt} of ${event.attempts}…`):ui('Файл в кэше не прошёл проверку. Скачиваем только его заново…','A cached file failed verification. Downloading just that file again…');
        log(text,url);
        if(!$('loading-screen').hidden)$('load-detail').textContent=text;
      }
    });
  } catch(error) {
    if(error.downloadFailure){
      const reason=error.code==='integrity'||error.code==='size'?ui('Файл не прошёл проверку целостности.','A file failed its integrity check.'):error.code?.startsWith('http-')?ui('Сервер не смог отдать файл.','The server could not deliver a file.'):ui('Загрузка прервалась или соединение слишком долго не отвечало. Проверь интернет.','The download was interrupted or the connection stopped responding. Check your internet connection.');
      error.message=reason;
    }
    throw error;
  }
}

async function start(autoConnect=false) {
  window.HeroesMobileAdventure?.prepareDisplay();
  busy(true);
  $('language').disabled = true;
  $('launch-error').hidden = true;
  try {
    const networkMode = $('mode').value === 'lan';
    const host = $('host-ip').value.trim();
    const port = Number($('host-port').value);
    const name = $('player-name').value.trim() || 'Игрок';
    if (networkMode) {
      if (!networkInfo?.available) throw new Error('Сетевой шлюз не запущен. Открой Start-LAN.command или Start-Client.command.');
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.split('.').some(n => Number(n) > 255))
        throw new Error('Введи IPv4-адрес хозяина, например 25.12.34.56.');
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Порт должен быть от 1024 до 65535.');
      window.heroesPreferences.setItem('heroes3.lan.host', host);
      window.heroesPreferences.setItem('heroes3.lan.name', name);
    }
    if (!await checkBeforeLaunch()) {
      status(ui('Исправь замечания выше и повтори проверку.', 'Resolve the issues above and check again.'));
      $('language').disabled = false;
      return;
    }
    showLoading();
    loadingStage(0, ui('Проверяем локальные данные. Сохранения останутся в этом браузере.', 'Checking local data. Your saves stay in this browser.'));
    db = await openDB();
    await migrateEnglishSaves(db);
    navigator.storage?.persist?.().catch(() => {});
    loadingStage(1, ui('Подготавливаем движок и память. Это может занять немного времени.', 'Preparing the engine and memory. This may take a little while.'));
    const appleTouch = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // One-variable rendering experiment. ?render=standard restores the old size.
    const renderMode = new URLSearchParams(location.search).get('render');
    const compact = !networkMode && (renderMode === 'compact' || (appleTouch && renderMode !== 'standard'));
    const mobileViewport = window.HeroesMobileAdventure?.profile();
    const enginePrefix = mobileViewport ? (window.HEROES_MOBILE_ENGINE_BASE || "vendor-mobile/") : "vendor/";
    const width = mobileViewport ? Math.max(800,mobileViewport.width) : compact ? 800 : 1024;
    const height = mobileViewport ? Math.max(600,mobileViewport.height) : compact ? 600 : 768;
    $('canvas').width = width;
    $('canvas').height = height;
    log(`Render profile: ${width}x${height}`);
    const options = {
      canvas: $('canvas'), noInitialRun: true,
      locateFile: path => enginePrefix + path,
      print: log, printErr: log,
      onAbort: reason => { finishLoading(true); $('game').style.display = 'none'; $('launcher').hidden = false; status(ui('Движок остановился: ', 'The engine stopped: ') + reason); log(reason); },
      fsRead: path => engine.FS.readFile(path),
      fsWrite: (path, data) => write(path, data),
      fsUpdate: (filePtr, bufferPtr, length) => {
        const path = engine.UTF8ToString(filePtr);
        const data = engine.HEAPU8.slice(bufferPtr, bufferPtr + length);
        engine._free(bufferPtr);
        saveQueue = saveQueue.then(() => persist(path, data)).catch(log);
      },
      getWidth: () => width, getHeight: () => height,
      gameStarted: () => {finishLoading();$('fullscreen').hidden=typeof $('game').requestFullscreen !== 'function';$('game').append($('fullscreen')); log('Главное меню готово');if(networkMode && autoConnect)void enterNetworkLobby();},
      mainMenuQuit: returnHome, mobileReturnToMenu: returnToGameMenu,
      quitGame: returnHome,
      loadHighscores: (_campaign, callback) => callback(0),
      websocket: { url: networkMode ? `ws://localhost:${networkInfo.port}/relay?host=${encodeURIComponent(host)}&port=${port}&token=${encodeURIComponent(networkInfo.token)}` : 'ws://localhost:8765/no-multiplayer', subprotocol:'binary' },
      loadMusic: async pointer => {
        const path = engine.UTF8ToString(pointer);
        if (loadedMusic.has(path)) return;
        loadedMusic.add(path);
        const local = musicFiles.get(path.split('/').pop().toLowerCase());
        if (!local) return;
        try { write(path, await fetchBytes(dataURL(local))); engine._playMusic(); }
        catch (error) { log('Музыка:', error.message); }
      },
    };
    // This binary imports shared memory with a 512 MiB minimum. Its import
    // permits a lower maximum than the default 2 GiB; keep the minimum intact.
    if (appleTouch) {
      $('load-detail').textContent = ui('Подготавливаем память для iPad.', 'Preparing memory for iPad.');
      options.wasmMemory = new WebAssembly.Memory({initial:8192, maximum:16384, shared:true});
    }
    gameRuntime = window.createGameRuntime($('canvas'));
    if(mobileViewport) {
      window.HeroesMobileAdventure.attach(options,mobileViewport);
      await new Promise((resolve,reject) => {
        // Pin the loader to the same build as the verified wasm binary.
        const loader=enginePrefix+'vcmiclient.js';
        const loaderHash=window.HEROES_MOBILE_ENGINE?.[loader]?.hash;
        const script=document.createElement('script');script.src=loader+(loaderHash?'?v='+encodeURIComponent(loaderHash):'');
        script.onload=resolve;script.onerror=()=>reject(new Error('Mobile engine unavailable'));document.head.append(script);
      });
    }
    options.wasmBinary = await fetchBytes(enginePrefix+'vcmiclient.wasm');
    engine = await VCMI(options);
    window.engine = engine;
    $('load-detail').textContent = ui('Подключаем основные ресурсы движка.', 'Preparing the engine’s core resources.');
    const pack = await fetchBytes(enginePrefix+'vcmi.data');
    engine.getPreloadedPackage = () => pack.buffer;
    const packageScript = new TextDecoder().decode(await fetchBytes(enginePrefix+'vcmi.data.js'));
    new Function('Module', packageScript)(engine);
    engine.getPreloadedPackage = undefined;
    // The package's filesystem loader runs synchronously after getPreloadedPackage.
    for (const file of inventory.files) {
      if (file.path.startsWith('Mp3/')) {
        musicFiles.set(file.path.split('/').pop().toLowerCase(), file.path);
        write('/' + file.path, new Uint8Array());
      }
    }
    const files = inventory.files.filter(f => !f.path.startsWith('Mp3/'));
    const total = files.reduce((sum, f) => sum + f.size, 0);
    loadingStage(2);
    let loaded = 0;
    for (const file of files) {
      const report = (bytes, cached = false) => {
        const done = Math.min(loaded + bytes, total);
        $('progress').value = total ? done / total * 100 : 0;
        const amount = value => (value / 1048576).toLocaleString(gameLanguage, {maximumFractionDigits:1});
        $('load-detail').textContent = ui(cached ? 'Читаем и проверяем файлы устройства' : 'Загружаем файлы', cached ? 'Reading and checking device files' : 'Downloading files') +
          ` · ${amount(done)} / ${amount(total)} ${ui('МБ', 'MB')} · ${Math.floor(done / total * 100)}%`;
      };
      write('/' + file.path, await fetchBytes(dataURL(file.path), String(file.version || file.size), report));
      loaded += file.size;
    }
    loadingStage(3, ui('Возвращаем сохранённые партии и настройки.', 'Restoring saved games and settings.'));
    await restore();
    await window.HeroesMaps.mount(db, write);
    connectMenuExit(!!mobileViewport && !!window.HEROES_MOBILE_NATIVE_SETTINGS);
    const config = new TextEncoder().encode(JSON.stringify({
      general: { language: gameLanguage === 'en' ? 'english' : 'russian', autosaveCountLimit: 3, playerName:name },
      video: { resolution: { width, height, scaling: 100 } },
      server: { remoteHostname:networkMode ? host : 'localhost', remotePort:port,
        localHostname:networkMode ? host : 'localhost',localPort:port },
      lobby: { hostname: 'localhost' },
      ...(mobileViewport ? {adventure:{leftButtonDrag:true,borderScroll:false},session:{adventureTrackHero:false}} : {}),
    }));
    write('/config/settings.json', config);
    write('/home/web_user/.config/vcmi/settings.json', config);
    loadingStage(4, ui('Файлы готовы. Запускаем игру — меню скоро появится.', 'Files are ready. Starting the game — the menu will appear shortly.'));
    $('launcher').hidden = true;
    $('game').style.display = mobileViewport ? 'block' : 'grid';
    $('canvas').addEventListener('contextmenu', event => event.preventDefault());
    $('canvas').focus();
    engine.callMain(networkMode ? ['--disable-video','--donotstartserver'] : ['--disable-video']);
  } catch (error) {
    if (gameRuntime) await gameRuntime.stop(engine);
    engine = undefined; window.engine = undefined;
    if (db) { db.close(); db = undefined; }
    $('game').style.display = 'none';
    $('launcher').hidden = false;
    $('connecting').hidden = true;
    finishLoading(true);
    status(error.downloadFailure ? ui('Можно повторить загрузку.', 'You can retry the download.') : ui('Не удалось запустить: ', 'Could not start: ') + error.message);
    log(error.stack || error);
    if (error.downloadFailure) {
      $('launch-error').hidden = false;
      $('launch-error-text').textContent = error.message;
      $('launch-error').scrollIntoView?.({block:'nearest',behavior:'auto'});
    }
    $('start').textContent = ui('Повторить', 'Try again');
    $('start').onclick = () => {
      try { sessionStorage.setItem('heroes3.retryLaunch','1'); } catch {}
      const destination = homeDestination();
      if (destination === '/index.html') location.reload();
      else location.replace(destination);
    };
    busy(false);
  }
}

(async () => {
  let resume=false;
  try { resume=sessionStorage.getItem('heroes3.retryLaunch')==='1';sessionStorage.removeItem('heroes3.retryLaunch'); } catch {}
  try {
    if (window.HEROES_BUILD) log(`Build ${window.HEROES_BUILD.version} · ${window.HEROES_BUILD.engine}`);
    const completionTrace=readCompletionTrace();
    if(completionTrace.length)for(const item of completionTrace)log('Previous scenario completion ['+new Date(item.time).toISOString()+']: '+item.phase);
    else try { const phase=sessionStorage.getItem('heroes3.lastCompletionPhase');if(phase)log('Previous scenario completion: '+phase); } catch {}
    try { const previous = JSON.parse(sessionStorage.getItem('heroes3.lastShutdown')); if (previous) log(`Previous game stopped: ${previous.workers} workers, ${previous.audio} audio contexts`); } catch {}
    const languages = await (await fetch('/api/languages')).json();
    for (const option of $('language').options) option.disabled = !languages.languages.includes(option.value);
    if (!languages.languages.includes(gameLanguage)) gameLanguage = languages.languages.includes('ru') ? 'ru' : languages.languages[0];
    $('language').value = gameLanguage;
    window.applyPageLanguage(gameLanguage);
    const response = await fetch('/api/files?lang=' + gameLanguage);
    if (!response.ok) throw new Error(ui('Сервер не отвечает', 'The server is not responding'));
    inventory = await response.json();
    try { networkInfo = await (await fetch('/api/network')).json(); } catch { networkInfo = {available:false}; }
    updateNetworkUI();
    if (inventory.missing.length) throw new Error(ui('Не хватает: ', 'Missing files: ') + inventory.missing.join(', '));
    const maps = inventory.files.filter(f => f.path.toLowerCase().endsWith('.h3m')).length;
    $('inventory').textContent = `${maps} карт для одиночных приключений. Сохранения доступны после возвращения на сайт.`;
    const ready = await checkBeforeLaunch();
    status(ready ? ui('Можно начинать.', 'Ready to play.') : ui('Исправь замечания выше и повтори проверку.', 'Resolve the issues above and check again.'), 0);
    busy(!ready);
    $('create').disabled = !ready || !networkInfo.available || !networkInfo.can_host;
    $('join').disabled = !ready || !networkInfo.available;
    $('start').onclick = () => { $('mode').value='solo';void start(false); };
    if (resume && ready) { $('mode').value='solo';void start(false); }
  } catch (error) { status(error.message); }
})();

$('preflight-retry').onclick = () => location.reload();

$('language').onchange = () => {
  window.heroesPreferences.setItem('heroes3.language', $('language').value);
  location.reload();
};

$('fullscreen').onclick = () => $('game').requestFullscreen?.().catch(error => log(error.message));
