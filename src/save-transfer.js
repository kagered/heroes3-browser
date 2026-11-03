'use strict';
(() => {
  const api=window.HeroesSaveTransfer;
  const exportButton=document.getElementById('export-saves'),importButton=document.getElementById('import-saves');
  const picker=document.getElementById('save-files'),message=document.getElementById('saves-status'),download=document.getElementById('save-download'),downloads=document.getElementById('save-downloads');
  let working=false,downloadURLs=[];
  const tr=(ru,en)=>document.documentElement.lang==='en'?en:ru;
  function release(){for(const url of downloadURLs)URL.revokeObjectURL(url);downloadURLs=[];download.hidden=true;download.removeAttribute('href');downloads.replaceChildren();downloads.hidden=true;}
  function report(text,state='info'){
    message.dataset.state=state;message.setAttribute('aria-live',state==='error'?'assertive':'polite');
    const labels={error:tr('Ошибка','Error'),warning:tr('Обрати внимание','Please note'),success:tr('Готово','Done')};
    message.textContent=(labels[state]?labels[state]+'. ':'')+text;
    if(state==='error' || state==='warning')message.scrollIntoView?.({block:'nearest',behavior:'auto'});
  }
  async function database(){const value=await openDB();try{await migrateEnglishSaves(value);return value;}catch(error){value.close();throw error;}}
  async function summary(){const value=await database();try{const count=await api.countSaves(value);if(!working && !message.textContent)report(count?tr(`Сохранений в браузере: ${count}.`,`Saves in this browser: ${count}.`):tr('Пока нет сохранений. Сохрани партию в игре и вернись сюда.','No saves yet. Save a game, then return here.'),'summary');}finally{value.close();}}
  async function run(action,operation){
    if(working)return;working=true;exportButton.disabled=importButton.disabled=true;
    try{await action();}catch(error){
      const messages={
        empty:tr('В выбранных файлах нет сохранений VCMI.','No VCMI saves found in the selected files.'),
        invalid:tr('Не удалось прочитать сохранения. Выбери ZIP из этой сборки или файлы .vsgm1 / .vcgm1.','Could not read the saves. Choose a ZIP from this build or .vsgm1 / .vcgm1 files.'),
        duplicate:tr(operation==='export'?'У сохранений совпадают имена без учёта регистра. Переименуй одну из партий в игре и повтори экспорт.':'В архиве есть повторяющиеся имена. Импорт отменён.',operation==='export'?'Some save names differ only in letter case. Rename one in the game and export again.':'The archive contains duplicate names. Nothing was imported.'),
        version:tr('Этот формат резервной копии пока не поддерживается.','This backup format is not supported.'),
        'too-large':tr('В одной части больше 128 МиБ сохранений после распаковки. Выбери меньший архив или меньше отдельных файлов.','One part contains more than 128 MiB of saves after extraction. Choose a smaller archive or fewer loose files.'),
        'input-too-large':tr('Один архив или группа отдельных файлов больше 144 МиБ. Выбери меньший архив или меньше отдельных файлов.','An archive or group of loose files exceeds 144 MiB. Choose a smaller archive or fewer loose files.'),
        'too-many':tr('В одной части можно перенести до 512 файлов сохранений. Выбери меньший архив или меньше отдельных файлов.','Each part supports up to 512 save files. Choose a smaller archive or fewer loose files.'),
        'save-too-large':tr('Одна партия занимает больше 128 МиБ. Её экспорт пока не поддерживается. Остальные сохранения не изменены.','A single game exceeds 128 MiB. Exporting it is not supported yet. Existing saves were not changed.'),
        storage:tr(operation==='export'?'Не удалось прочитать сохранения для экспорта. Закрой другие вкладки с игрой и повтори попытку.':'Не удалось записать данные в браузер. Проверь свободное место и разрешение на хранение.',operation==='export'?'Could not read saves for export. Close other game tabs and try again.':'Could not write to browser storage. Check available space and storage permissions.')
      };
      if(operation==='export')release();
      if(error.importResult?.completed){
        report(tr(`Импортировано сохранений: ${error.importResult.saves}. Обработка остановлена${error.importFile?' на «'+error.importFile+'»':''}. Уже добавленные сохранения остались в браузере. `,`Imported saves: ${error.importResult.saves}. Processing stopped${error.importFile?' at “'+error.importFile+'”':''}. Successfully imported saves are still in this browser. `)+(messages[error.message] || tr('Не удалось прочитать следующую часть.','Could not read the next part.')),'error');return;
      }
      report(messages[error.message] || tr(operation==='export'?'Не удалось подготовить архив. Сохранения не изменены.':'Не удалось импортировать файл. Существующие сохранения не изменены.',operation==='export'?'Could not prepare the backup. Saves were not changed.':'Could not import the file. Existing saves were not changed.'),'error');
    }finally{working=false;exportButton.disabled=importButton.disabled=false;picker.value='';}
  }
  exportButton.onclick=()=>run(async()=>{
    release();report(tr('Готовим архив…','Preparing your backup…'));
    const value=await database();let result;
    try{result=await api.readSaveBatches(value,async(rows,part)=>{
      report(tr(`Готовим часть ${part}…`,`Preparing part ${part}…`));
      const bytes=api.makeArchive(rows);
      downloadURLs.push(URL.createObjectURL(new Blob([bytes],{type:'application/zip'})));
    });}finally{value.close();}
    if(!result.parts){report(tr('Пока нет сохранений для экспорта. Сохрани партию в игре и вернись сюда.','No saves to export yet. Save a game, then return here.'),'warning');return;}
    const date=new Date();const stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    function configure(link,index){
      link.href=downloadURLs[index];link.download=`heroes3-saves-${stamp}${result.parts>1?'-part-'+(index+1):''}.zip`;
      link.textContent=result.parts===1?tr('Скачать архив ещё раз','Download backup again'):tr(`Скачать часть ${index+1} из ${result.parts}`,`Download part ${index+1} of ${result.parts}`);
    }
    configure(download,0);download.hidden=false;
    for(let i=1;i<result.parts;i++){const item=document.createElement('li'),link=document.createElement('a');configure(link,i);item.append(link);downloads.append(item);}
    downloads.hidden=result.parts===1;download.click();
    report(result.parts===1?tr('Архив готов. Сохрани его в «Файлы» или отправь на другое устройство.','Backup ready. Save it to Files or send it to another device.'):tr(`Коллекция разделена на части: ${result.parts}. Скачай каждую часть по ссылкам ниже; на другом устройстве выбери все части для импорта.`,`Your collection was split into ${result.parts} archives. Download every part below, then select all parts together for import on the other device.`),result.parts===1?'success':'warning');
  },'export');
  importButton.onclick=()=>picker.click();
  picker.onchange=()=>{const files=Array.from(picker.files||[]);if(!files.length)return;void run(async()=>{
    release();report(tr('Проверяем сохранения…','Checking saves…'));
    const value=await database();let result;
    try{result=await api.importFiles(value,files,(part,total,name)=>report(tr(`Импортируем ${part} из ${total}${name?': '+name:''}…`,`Importing ${part} of ${total}${name?': '+name:''}…`)));}finally{value.close();}
    report(tr(`Импортировано сохранений: ${result.saves}.`+(result.renamed?' Совпадающие имена получили пометку (imported).':''),`Imported saves: ${result.saves}.`+(result.renamed?' Matching names were kept as separate (imported) copies.':'')),'success');
  },'import');};
  document.getElementById('start').addEventListener('click',event=>{if(working){event.preventDefault();event.stopImmediatePropagation();return;}release();},{capture:true});
  window.addEventListener('pagehide',release);
  void summary().catch(()=>report(tr('Не удалось прочитать сохранения из браузера.','Could not read browser saves.'),'error'));
})();
