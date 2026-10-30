/* Small capability probes only: never allocate the game's WASM memory here. */
'use strict';
window.heroesPreferences = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
window.heroesPreflight = (() => {
  async function workerProbe() {
    const memory = new WebAssembly.Memory({initial:1, maximum:1, shared:true});
    const url = URL.createObjectURL(new Blob([
      'onmessage=e=>{Atomics.store(new Int32Array(e.data),0,7);postMessage("ok")}'
    ], {type:'text/javascript'}));
    let worker;
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { reject(new Error('timeout')); }, 8000);
        const fail = () => { clearTimeout(timer); reject(new Error('worker')); };
        try {
          worker = new Worker(url);
          worker.onerror = fail;
          worker.onmessage = event => {
            clearTimeout(timer);
            if (event.data === 'ok' && Atomics.load(new Int32Array(memory.buffer), 0) === 7) resolve();
            else reject(new Error('shared memory'));
          };
          worker.postMessage(memory.buffer);
        } catch { fail(); }
      });
    } finally { worker?.terminate(); URL.revokeObjectURL(url); }
  }
  async function storageProbe(openStorage) {
    const database = await openStorage();
    try {
      await new Promise((resolve, reject) => {
        const tx = database.transaction('assets', 'readwrite');
        const timer = setTimeout(() => { tx.abort(); }, 8000);
        const store = tx.objectStore('assets');
        const key = 'preflight:' + Date.now() + ':' + Math.random();
        store.put(new Uint8Array([7]), key);
        const read = store.get(key);
        read.onsuccess = () => { if (read.result?.[0] !== 7) tx.abort(); };
        store.delete(key);
        tx.oncomplete = () => { clearTimeout(timer); resolve(); };
        tx.onabort = tx.onerror = () => { clearTimeout(timer); reject(tx.error || new Error('storage')); };
      });
    } finally { database.close(); }
  }
  async function check({openStorage, requiredBytes = 0}) {
    const errors = [], warnings = [];
    if (!window.isSecureContext) errors.push(['Нужен безопасный адрес сайта. Открой игру по HTTPS; на компьютере также подходит localhost.', 'A secure address is required. Open the game over HTTPS; localhost also works on a computer.']);
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') errors.push(['Браузер не разрешил совместную память. Открой сайт напрямую в отдельной вкладке. Если это не помогло, сообщи о проблеме: нужно проверить настройки сайта или браузера.', 'Shared memory is unavailable. Open the site directly in a separate tab. If this persists, report the problem so the site or browser settings can be checked.']);
    if (typeof WebAssembly === 'undefined' || typeof WebAssembly.Memory !== 'function' || typeof Atomics === 'undefined' || typeof Worker === 'undefined') errors.push(['Браузер не поддерживает необходимые функции игры. Попробуй обновить браузер или открыть сайт на другом устройстве.', 'This browser lacks features required by the game. Try updating the browser or opening the site on another device.']);
    else if (!errors.length) {
      try { await workerProbe(); }
      catch { errors.push(['Не удалось запустить игровой поток. Открой сайт в обычной вкладке браузера, обнови страницу и попробуй снова.', 'A game worker could not start. Open the site in a regular browser tab, refresh and try again.']); }
    }
    try {
      const canvas = document.createElement('canvas');
      if (!canvas.getContext('2d')) throw new Error('canvas');
    } catch { errors.push(['Отрисовка игры недоступна. Перезапусти браузер или попробуй другой.', 'Game rendering is unavailable. Restart the browser or try another one.']); }
    try { await storageProbe(openStorage); }
    catch { errors.push(['Хранилище игры недоступно для записи. Разреши этому сайту хранить данные, закрой другие вкладки с игрой и повтори проверку. Не удаляй данные сайта без копии сохранений.', 'Game storage cannot be written. Allow this site to store data, close other game tabs and check again. Do not delete site data without a backup of your saves.']); }
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (Number.isFinite(estimate?.quota) && Number.isFinite(estimate?.usage) && estimate.quota - estimate.usage < requiredBytes)
        warnings.push(['По оценке браузера свободного места может не хватить для новых файлов игры. Освободи место на устройстве; уже загруженные файлы могут быть доступны из кэша.', 'The browser estimates there may not be enough storage for new game files. Free some space on the device; previously cached files may still be available.']);
    } catch { /* Storage estimates are optional and never block launching. */ }
    return {errors, warnings};
  }
  return {check};
})();
