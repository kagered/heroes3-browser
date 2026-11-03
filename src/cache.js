'use strict';
(() => {
  const panel = document.getElementById('cache-panel');
  const message = document.getElementById('cache-status');
  const confirmation = document.getElementById('cache-confirmation');
  const confirmButton = document.getElementById('cache-confirm');
  const cancelButton = document.getElementById('cache-cancel');
  const buttons = [...panel.querySelectorAll('[data-cache-clear]')];
  const api = window.HeroesCache;
  const tr = (ru,en) => document.documentElement.lang === 'en' ? en : ru;
  let working = false, pending, sizes, counts;
  const names = {ru:['русской версии','Russian game files'],en:['английской версии','English game files'],all:['всех скачанных ресурсов','all downloaded resources']};
  function notify(text,state='info'){message.dataset.state=state;message.setAttribute('aria-live',state==='error'?'assertive':'polite');message.textContent=text;}
  function controls() {
    for (const button of buttons) {
      const scope = button.dataset.cacheClear;
      const count = scope === 'all' ? Object.values(counts || {}).reduce((sum,group) => sum + group.count,0) : counts?.[scope]?.count;
      button.disabled = working || !count;
    }
    confirmButton.disabled = cancelButton.disabled = working;
    document.getElementById('cache-refresh').disabled = working;
    panel.setAttribute('aria-busy', String(working));
  }
  async function loadCatalog() {
    if (window.HEROES_STATIC) return api.catalog(window.HEROES_STATIC.inventories);
    const inventories = {};
    const results = await Promise.allSettled(['ru','en'].map(async language => {
      const response = await fetch('/api/files?lang=' + language);
      if (!response.ok) throw new Error('inventory');
      inventories[language] = await response.json();
    }));
    // Missing catalogs are shown as unknown sizes, never guessed.
    for (const result of results) if (result.status === 'rejected') console.warn('Cache size catalog unavailable');
    return api.catalog(inventories);
  }
  function format(group) {
    if (!group.count) return tr('Не загружено','Not downloaded');
    const amount = (group.bytes / 1048576).toLocaleString(document.documentElement.lang,{maximumFractionDigits:1});
    return (group.unknown && group.bytes === 0 ? '' : amount + tr(' МиБ',' MiB')) +
      (group.unknown ? tr(`${group.bytes ? ' + ' : ''}файлы без сведений о размере (${group.unknown})`, `${group.bytes ? ' + ' : ''}files of unknown size (${group.unknown})`) : '');
  }
  async function refresh() {
    sizes ||= await loadCatalog();
    const database = await openDB();
    try { counts = await api.summary(database, sizes); }
    finally { database.close(); }
    for (const scope of ['ru','en','shared']) document.getElementById('cache-size-' + scope).textContent = format(counts[scope]);
    const total = Object.values(counts).reduce((sum,group) => ({bytes:sum.bytes+group.bytes,count:sum.count+group.count,unknown:sum.unknown+group.unknown}),{bytes:0,count:0,unknown:0});
    document.getElementById('cache-total').textContent = format(total);
  }
  async function run(action) {
    if (working) return;
    working = true; controls();
    try { await action(); }
    catch {
      counts = undefined;
      notify(tr('Не удалось обработать кэш. Закрой другие вкладки с игрой и повтори попытку. Сохранения не затрагиваются.','Could not access the cache. Close other game tabs and try again. Saves are not affected.'),'error');
    } finally { working = false; controls(); }
  }
  function dismiss() { pending = undefined; confirmation.hidden = true; }
  for (const button of buttons) button.onclick = () => {
    pending = button.dataset.cacheClear;
    document.getElementById('cache-confirm-text').textContent = tr(
      `Удалить файлы ${names[pending][0]}? При следующем запуске нужные файлы загрузятся заново. Сохранения останутся.`,
      `Remove ${names[pending][1]}? Required files will load again the next time you play. Your saves will stay.`);
    confirmation.hidden = false;
    cancelButton.focus();
  };
  cancelButton.onclick = () => { const previous = pending; dismiss();buttons.find(button => button.dataset.cacheClear === previous)?.focus(); };
  confirmButton.onclick = () => {
    const scope = pending;
    if (!scope || working) return;
    void run(async () => {
      notify(tr('Очищаем скачанные ресурсы…','Clearing downloaded resources…'));
      const database = await openDB();
      try { await api.clear(database, scope); }
      finally { database.close(); }
      dismiss();
      await refresh();
      notify(tr('Скачанные ресурсы удалены. Сохранения остались на месте.','Downloaded resources removed. Your saves are still here.'),'success');
      document.getElementById('cache-refresh').focus();
    });
  };
  function update() { dismiss();void run(async () => { notify(tr('Проверяем скачанные файлы…','Checking downloaded files…'));await refresh();notify(''); }); }
  panel.addEventListener('toggle', () => { if (panel.open) update(); });
  document.getElementById('cache-refresh').onclick = update;
  document.getElementById('start').addEventListener('click', event => {
    if (working) { event.preventDefault();event.stopImmediatePropagation(); }
    else dismiss();
  }, {capture:true});
  controls();
})();
