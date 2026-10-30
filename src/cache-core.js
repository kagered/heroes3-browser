/* Only the assets store is accessed. Save and migration stores are never opened. */
'use strict';
window.HeroesCache = (() => {
  const scopes = ['ru', 'en', 'shared'];
  function scopeOf(key) {
    if (typeof key !== 'string') return 'shared';
    const url = key.slice(key.indexOf(':') + 1);
    const match = url.match(/^\/game-data\/(ru|en)\//) || url.match(/^\/game-data\/[^?]+\?lang=(ru|en)$/);
    return match ? match[1] : 'shared';
  }
  function catalog(inventories) {
    const sizes = new Map([['engine-1.6.5:vendor/vcmi.data', 7919378], ['engine-1.6.5:vendor/vcmi.data.js', 64017], ['engine-1.6.5:vendor/vcmiclient.wasm', 9039947]]);
    for (const language of ['ru', 'en']) {
      for (const file of inventories[language]?.files || []) {
        if (!Number.isSafeInteger(file.size) || file.size < 0) continue;
        const version = file.path.startsWith('Mp3/') ? 'engine-1.6.5' : String(file.version || file.size);
        sizes.set(version + ':/game-data/' + language + '/' + file.path, file.size);
        sizes.set(version + ':/game-data/' + file.path + '?lang=' + language, file.size);
      }
    }
    return sizes;
  }
  function summary(database, sizes) {
    return new Promise((resolve, reject) => {
      const result = Object.fromEntries(scopes.map(scope => [scope, {bytes:0, count:0, unknown:0}]));
      const tx = database.transaction('assets', 'readonly');
      // Key cursors never deserialize the large cached archives into RAM.
      const request = tx.objectStore('assets').openKeyCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const group = result[scopeOf(cursor.key)];
        group.count++;
        if (sizes.has(cursor.key)) group.bytes += sizes.get(cursor.key);
        else group.unknown++;
        cursor.continue();
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('cache'));
    });
  }
  function clear(database, scope) {
    if (!['all', ...scopes].includes(scope)) return Promise.reject(new Error('scope'));
    return new Promise((resolve, reject) => {
      const tx = database.transaction('assets', 'readwrite');
      const store = tx.objectStore('assets');
      if (scope === 'all') store.clear();
      else {
        const request = store.openKeyCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (scopeOf(cursor.key) === scope) store.delete(cursor.primaryKey);
          cursor.continue();
        };
      }
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('cache'));
    });
  }
  return {catalog, summary, clear};
})();
