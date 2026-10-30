'use strict';
(() => {
  const api=window.HeroesSaveTransfer;
  const exportButton=document.getElementById('export-saves'),importButton=document.getElementById('import-saves');
  const picker=document.getElementById('save-files'),message=document.getElementById('saves-status'),download=document.getElementById('save-download');
  let working=false,downloadURL;
  const tr=(ru,en)=>document.documentElement.lang==='en'?en:ru;
  function release(){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=undefined;download.hidden=true;download.removeAttribute('href');}
  function report(text){message.textContent=text;}
  async function database(){const value=await openDB();try{await migrateEnglishSaves(value);return value;}catch(error){value.close();throw error;}}
  async function summary(){const value=await database();try{const count=await api.countSaves(value);report(count?tr(`Сохранений в браузере: ${count}.`,`Saves in this browser: ${count}.`):tr('Пока нет сохранений. Сохрани партию в игре и вернись сюда.','No saves yet. Save a game, then return here.'));}finally{value.close();}}
  async function run(action){
    if(working)return;working=true;exportButton.disabled=importButton.disabled=true;
    try{await action();}catch(error){
      const messages={
        empty:tr('В выбранных файлах нет сохранений VCMI.','No VCMI saves found in the selected files.'),
        invalid:tr('Не удалось прочитать сохранения. Выбери ZIP из этой сборки или файлы .vsgm1 / .vcgm1.','Could not read the saves. Choose a ZIP from this build or .vsgm1 / .vcgm1 files.'),
        duplicate:tr('В архиве есть повторяющиеся имена. Импорт отменён.','The archive contains duplicate names. Nothing was imported.'),
        version:tr('Этот формат резервной копии пока не поддерживается.','This backup format is not supported.'),
        'too-large':tr('Выбранные сохранения слишком большие. Лимит — 32 МБ данных за один перенос.','The selected saves are too large. Transfer up to 32 MB at a time.'),
        storage:tr('Не удалось записать данные в браузер. Проверь свободное место и разрешение на хранение.','Could not write to browser storage. Check available space and storage permissions.')
      };
      report(messages[error.message] || tr('Не удалось обработать файл. Существующие сохранения не изменены.','Could not process the file. Existing saves were not changed.'));
    }finally{working=false;exportButton.disabled=importButton.disabled=false;picker.value='';}
  }
  exportButton.onclick=()=>run(async()=>{
    release();report(tr('Готовим архив…','Preparing your backup…'));
    const value=await database();let rows;
    try{rows=await api.readSaves(value);}finally{value.close();}
    if(!rows.length){await summary();return;}
    const bytes=api.makeArchive(rows);rows=null;
    downloadURL=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
    const date=new Date();const stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    download.href=downloadURL;download.download=`heroes3-saves-${stamp}.zip`;download.hidden=false;
    download.textContent=tr('Скачать архив ещё раз','Download backup again');download.click();
    report(tr('Архив готов. Сохрани его в «Файлы» или отправь на другое устройство.','Backup ready. Save it to Files or send it to another device.'));
  });
  importButton.onclick=()=>picker.click();
  picker.onchange=()=>{const files=Array.from(picker.files||[]);if(!files.length)return;void run(async()=>{
    release();report(tr('Проверяем сохранения…','Checking saves…'));
    const rows=await api.parseFiles(files),value=await database();let result;
    try{result=await api.importRows(value,rows);}finally{value.close();}
    report(tr(`Импортировано сохранений: ${result.saves}.`+(result.renamed?' Совпадающие имена получили пометку (imported).':''),`Imported saves: ${result.saves}.`+(result.renamed?' Matching names were kept as separate (imported) copies.':'')));
  });};
  document.getElementById('start').addEventListener('click',event=>{if(working){event.preventDefault();event.stopImmediatePropagation();return;}release();},{capture:true});
  window.addEventListener('pagehide',release);
  void summary().catch(()=>report(tr('Не удалось прочитать сохранения из браузера.','Could not read browser saves.')));
})();
