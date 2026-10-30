'use strict';
(() => {
  const get=id=>document.getElementById(id),panel=get('maps-panel'),picker=get('map-files'),add=get('maps-add'),refresh=get('maps-refresh'),message=get('maps-status'),list=get('maps-list');
  const api=window.HeroesMaps,tr=(ru,en)=>document.documentElement.lang==='en'?en:ru;
  const library=get('maps-library'),exportButton=get('maps-export'),download=get('maps-download');
  let downloadURL;
  function release(){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=undefined;download.hidden=true;download.removeAttribute('href');}
  let working=false,pending,loaded=false;
  const confirmation=get('maps-confirmation');
  function notify(state,text){
    message.dataset.state=state;
    message.setAttribute('aria-live',state==='error'?'assertive':'polite');
    const labels={error:tr('Ошибка','Error'),success:tr('Готово','Done'),warning:tr('Обрати внимание','Please note'),info:tr('Карты','Maps')};
    message.textContent=text?labels[state]+'. '+text:'';
    if(text && state!=='info')message.scrollIntoView?.({block:'nearest',behavior:'auto'});
  }
  function dismiss(){pending=undefined;confirmation.hidden=true;}
  function controls(){add.disabled=exportButton.disabled=refresh.disabled=get('maps-confirm').disabled=get('maps-cancel').disabled=working;for(const button of list.querySelectorAll('button'))button.disabled=working;panel.setAttribute('aria-busy',String(working));}
  async function withDB(action){const database=await openDB();try{return await action(database);}finally{database.close();}}
  async function render(){
    const rows=await withDB(api.list);loaded=true;list.replaceChildren();
    for(const row of rows){
      const item=document.createElement('li'),text=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('span'),button=document.createElement('button');
      name.textContent=row.name;detail.textContent=`${row.format} · ${row.dimension} × ${row.dimension} · ${(row.bytes/1048576).toLocaleString(document.documentElement.lang,{maximumFractionDigits:2})} ${tr('МиБ','MiB')}`;
      text.append(name,detail);button.type='button';button.textContent=tr('Удалить','Remove');button.setAttribute('aria-label',tr('Удалить карту ','Remove map ')+row.name);
      button.onclick=()=>{pending=row;get('maps-confirm-text').textContent=tr(`Удалить «${row.name}» из своих карт? Сохранённые партии останутся; для некоторых из них может понадобиться снова добавить карту.`,`Remove “${row.name}” from your maps? Saved games will remain; some may require adding the map again.`);confirmation.hidden=false;get('maps-cancel').focus();};
      item.append(text,button);list.append(item);
    }
    get('maps-count').textContent=rows.length?tr(`Своих карт: ${rows.length} из 64.`,`Custom maps: ${rows.length} of 64.`):tr('Своих карт пока нет.','No custom maps yet.');
  }
  async function run(action){if(working)return;working=true;controls();try{await action();}catch(error){
    const messages={empty:tr('В выбранных файлах нет карт. Добавь .h3m или ZIP с коллекцией карт.','No maps found. Choose .h3m files or a ZIP containing maps.'),version:tr('Этот формат резервной копии карт пока не поддерживается.','This map backup format is not supported.'),type:tr('Выбери файлы .h3m или ZIP с коллекцией карт.','Choose .h3m files or a ZIP containing maps.'),format:tr('Поддерживаются карты RoE, Armageddon’s Blade и Shadow of Death. Карты HotA, WoG и модификаций пока не добавляются.','Supported maps: RoE, Armageddon’s Blade and Shadow of Death. HotA, WoG and mod maps are not supported here.'),invalid:tr('Не удалось прочитать карту или архив: файл повреждён либо имеет неподходящий формат.','Could not read the map or archive: the file is damaged or has an unsupported format.'),large:tr('Лимит — 64 карты / 64 МиБ данных, до 8 МиБ на карту. Выбери до 16 файлов или архивов за раз; слишком большие распакованные карты не поддерживаются.','Limit: 64 maps / 64 MiB of data, up to 8 MiB per map. Select up to 16 files or archives at once; oversized decompressed maps are not supported.'),capacity:tr('Лимит коллекции — 64 карты или 64 МиБ. Удали ненужные карты и попробуй снова.','The collection limit is 64 maps or 64 MiB. Remove unused maps and try again.')};
    notify('error',messages[error.message]||tr('Не удалось обработать карты. Проверь доступ к хранилищу и свободное место.','Could not process maps. Check storage access and available space.'));
  }finally{working=false;controls();picker.value='';}}
  add.onclick=()=>picker.click();
  picker.onchange=()=>{const files=[...picker.files||[]];if(!files.length)return;dismiss();release();void run(async()=>{
    notify('info',tr('Проверяем файлы карт…','Validating map files…'));const rows=await api.parseFiles(files),result=await withDB(database=>api.importRows(database,rows));await render();
    library.open=true;
    notify(result.added?'success':'warning',tr(`Добавлено: ${result.added}. Уже были добавлены: ${result.duplicate}. Карты появятся в выборе сценария при следующем запуске.`,`Added: ${result.added}. Already imported: ${result.duplicate}. Maps will appear in the scenario selector the next time you launch.`));
  });};
  exportButton.onclick=()=>run(async()=>{
    release();dismiss();notify('info',tr('Готовим архив коллекции…','Preparing your map collection backup…'));
    let rows=await withDB(api.readMaps);
    if(!rows.length){notify('warning',tr('Пока нет своих карт для экспорта. Сначала добавь карты.','No custom maps to export yet. Add maps first.'));return;}
    const bytes=await api.makeArchive(rows);rows=null;
    downloadURL=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
    const date=new Date(),stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    download.href=downloadURL;download.download='heroes3-maps-'+stamp+'.zip';download.hidden=false;
    download.textContent=tr('Скачать коллекцию ещё раз','Download collection again');download.click();
    notify('success',tr('Архив готов. Сохрани его в «Файлы». На другом устройстве открой «Свои карты → Добавить карты» и выбери этот ZIP.','Backup ready. Save it to Files. On another device, open Your maps → Add maps and choose this ZIP.'));
  });
  get('maps-cancel').onclick=()=>{dismiss();add.focus();};
  get('maps-confirm').onclick=()=>{const row=pending;if(!row)return;release();void run(async()=>{await withDB(database=>api.remove(database,row.id));dismiss();await render();notify('success',tr('Карта удалена. Сохранённые партии не изменены.','Map removed. Saved games are unchanged.'));});};
  function update(){dismiss();void run(async()=>{await render();notify('info','');});}
  refresh.onclick=update;library.addEventListener('toggle',()=>{if(library.open && !loaded)update();});
  get('start').addEventListener('click',event=>{if(working){event.preventDefault();event.stopImmediatePropagation();}else {dismiss();release();}},{capture:true});
  window.addEventListener('pagehide',release);
})();
