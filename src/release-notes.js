/* The first entry is the current build. Add future releases at the top. */
'use strict';
(() => {
  const releases = [
    {
      version:'0.2.0', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Первый публичный выпуск','First public source release'],
      groups:[{title:['Выпуск','Release'],items:[
        ['Подготовлены исходники, документация на русском и английском, инструкция самостоятельной сборки, лицензии и автоматические проверки проекта.','Source code, Russian and English documentation, self-hosted build instructions, licenses and automated project checks are available.'],
        ['Завершена предрелизная проверка: автоматические сценарии и два ручных прогона на компьютере и iPad прошли.','Pre-release validation is complete: automated scenarios and both manual desktop/iPad runs passed.']
      ]}]
    },
    {
      version:'0.1.12', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Проверка перед выпуском','Pre-release checks'],
      groups:[{title:['Исправления','Fixes'],items:[
        ['Убран системный фильтр выбора файлов сохранений, который может блокировать отдельные .vsgm1 / .vcgm1 на iPad. Формат файлов по-прежнему проверяется после выбора.','Removed the native save picker filter that can disable individual .vsgm1 / .vcgm1 files on iPad. File formats are still checked after selection.']
      ]},{title:['Проверки','Checks'],items:[
        ['Автоматически проверены хранение и перенос данных, кэш, ошибки загрузки, управление и диалоги. Добавлена общая проверка переноса сейвов и карт между независимыми хранилищами.','Automated checks cover storage and transfers, the cache, download errors, controls and dialogs. Added a combined save and map transfer check across independent storage profiles.']
      ]}]
    },
    {
      version:'0.1.11', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Помощь по игре','Help and troubleshooting'],
      groups:[{title:['Возможности','Features'],items:[
        ['Компактная ссылка «Помощь» в футере открывает ответы о хранении и переносе сейвов, своих картах, ошибке памяти и восстановлении загрузки.','A compact Help link in the footer opens answers about save storage and transfers, custom maps, memory errors and download recovery.'],
        ['Все ответы доступны на русском и английском, в том числе пошаговый перенос партии и коллекции карт.','All answers are available in Russian and English, including step-by-step saved-game and map collection transfers.']
      ]}]
    },
    {
      version:'0.1.10', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Перенос коллекции карт','Transfer your map collection'],
      groups:[{title:['Возможности','Features'],items:[
        ['Экспорт своих карт в ZIP и импорт коллекции на другом устройстве. Отдельные .h3m и обычные ZIP с картами тоже поддерживаются.','Export custom maps as a ZIP and import the collection on another device. Individual .h3m files and ordinary ZIP archives containing maps are also supported.'],
        ['Исходные имена и содержимое сохраняются. Повторные карты пропускаются, одноимённые карты с разным содержимым остаются отдельными.','Original filenames and contents are preserved. Duplicate maps are skipped; maps with matching names and different contents remain separate.']
      ]}]
    },
    {
      version:'0.1.9', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Восстановление загрузки','Download recovery'],
      groups:[{title:['Улучшения','Improvements'],items:[
        ['До трёх попыток скачивания ресурса при обрыве, тайм-ауте или ошибке проверки. Готовые файлы сохраняются в кэше.','Up to three attempts per resource on connection failures, timeouts or failed checks. Completed files remain cached.'],
        ['Ресурсы опубликованной игры проверяются по SHA-256; повреждённый файл перекачивается отдельно.','Published game resources are checked with SHA-256; a damaged file is downloaded separately.'],
        ['После ошибки кнопка «Повторить» возвращает к запуску с сохранением кэша, своих карт и сейвов.','After an error, Try again resumes launch while keeping the cache, custom maps and saves.']
      ]}]
    },
    {
      version:'0.1.8', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Игровые возможности и сведения о проекте','Game features and project information'],
      groups:[{title:['Улучшения','Improvements'],items:[
        ['Свои карты вынесены в отдельный блок с видимой кнопкой добавления и раскрываемой коллекцией.','Custom maps now have a dedicated section with a visible import button and expandable collection.'],
        ['Журналы перенесены в футер. История изменений открывается в окне с выбором версии, журнал запуска — в отдельном окне.','Logs moved to the footer. The changelog opens in a version selector dialog, and the launch log has its own dialog.']
      ]}]
    },
    {
      version:'0.1.7', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Свои карты','Your maps'],
      groups:[{title:['Возможности','Features'],items:[
        ['Локальный импорт карт .h3m RoE, AB и SoD. Карты появляются в обычном меню сценариев и доступны в обоих языках игры.','Import local .h3m RoE, AB and SoD maps. They appear in the original scenario menu and are available in both game languages.'],
        ['Проверка формата и целостности gzip, защита от повторного импорта, удаление с подтверждением. Свои карты хранятся отдельно от ресурсов и сохранений.','Format and gzip integrity checks, duplicate detection and confirmed removal. Custom maps are stored separately from cached resources and saves.']
      ]}]
    },
    {
      version:'0.1.6', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Ровные стрелки раскрывающихся разделов','Consistent disclosure arrows'],
      groups:[{title:['Исправления','Fixes'],items:[
        ['Текстовый символ стрелки заменён центрированной векторной иконкой, которая не зависит от шрифта устройства.','Replaced the text arrow with a centered vector icon independent of the device font.']
      ]}]
    },
    {
      version:'0.1.5', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Главная страница стала читабельнее','A more readable homepage'],
      groups:[{title:['Улучшения','Improvements'],items:[
        ['Увеличены шрифты, контраст текста и размеры кнопок. Раскрывающиеся разделы выделены карточками с пояснениями и заметными стрелками.','Larger type, stronger text contrast and bigger buttons. Expandable sections now have distinct cards, descriptions and visible arrows.'],
        ['Управление описано в четвёртом блоке об игре. Сетка и инструменты адаптированы к телефону, планшету и компьютеру.','Controls are explained in the fourth game feature. The layout and tools adapt to phones, tablets and computers.']
      ]}]
    },
    {
      version:'0.1.4', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Управление скачанными данными','Downloaded game data'],
      groups:[{title:['Возможности','Features'],items:[
        ['Раздел «Данные игры» показывает кэш русского и английского языков, общие ресурсы и общий размер.','Game data shows Russian and English caches, shared resources and the total size.'],
        ['Можно очистить файлы выбранного языка или все скачанные ресурсы. Очистка требует подтверждения и не затрагивает сохранения.','Clear one language or all downloaded resources. Clearing requires confirmation and leaves saves untouched.'],
        ['Размеры определяются без загрузки больших архивов из хранилища в оперативную память.','Sizes are calculated without loading large cached archives into RAM.']
      ]}]
    },
    {
      version:'0.1.3', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Проверка перед запуском','Pre-launch checks'],
      groups:[{title:['Улучшения','Improvements'],items:[
        ['Перед запуском проверяются безопасный адрес, совместная память, игровой поток, отрисовка и запись в хранилище.','Before launch, checks cover secure access, shared memory, a game worker, rendering and writable storage.'],
        ['При проблеме показаны причина и дальнейшие действия. Низкая оценка свободного места предупреждает, но не блокирует игру.','Problems show an explanation and next steps. A low storage estimate warns without blocking play.'],
        ['Проверка не выделяет игровую память и не изменяет сохранения.','The checks do not allocate game memory or modify saves.']
      ]}]
    },
    {
      version:'0.1.2', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Обратная связь','Problem reports'],
      groups:[{title:['Возможности','Features'],items:[
        ['Кнопка «Сообщить о проблеме» на главной и во время загрузки открывает черновик GitHub Issues с версией сборки, языком игры и сведениями о браузере.','Report a problem on the homepage or loading screen opens a GitHub Issues draft with the build version, game language and browser details.'],
        ['Текст можно проверить и изменить перед отправкой. Сохранения и журнал запуска автоматически не прикладываются.','Review and edit the draft before submitting. Saves and the launch log are not attached automatically.']
      ]}]
    },
    {
      version:'0.1.1', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Понятная загрузка игры','Clearer game loading'],
      groups:[{title:['Улучшения','Improvements'],items:[
        ['Пять этапов запуска: хранилище, движок, файлы игры, сохранения и главное меню.','Five launch stages: storage, engine, game files, saves and the main menu.'],
        ['Объём загрузки и чтение из кэша видны отдельно. Экран загрузки остаётся до готовности меню.','Download size and device-cache reads are shown explicitly. The loading screen stays visible until the menu is ready.']
      ]}]
    },
    {
      version:'0.1.0', date:'2026-10-30', engine:'VCMI 1.6.5',
      title:['Первый выпуск с номером версии','First versioned release'],
      groups:[
        {title:['Возможности','Features'],items:[
          ['Русская и английская версии игры и главной страницы.','Russian and English game data and homepage.'],
          ['Одиночные сценарии и кэш ресурсов для более быстрого повторного запуска.','Single-player scenarios and cached resources for faster repeat launches.'],
          ['Сенсорные жесты, экранные кнопки и облегчённый режим 800 × 600 на iPad.','Touch gestures, on-screen controls and an 800 × 600 rendering profile on iPad.'],
          ['Общие сохранения для обоих языков, экспорт и импорт ZIP.','Shared saves across both languages, with ZIP export and import.']
        ]},
        {title:['Исправления','Fixes'],items:[
          ['Выход из игры возвращает на главную страницу.','Exiting the game returns to the homepage.'],
          ['Обход ошибки памяти Safari при повторном запуске на iPad через короткий служебный переход.','A brief helper-page transition works around the Safari memory issue when restarting on iPad.'],
          ['При импорте одноимённые сохранения получают новое имя без перезаписи существующих.','Imported saves with matching names are renamed without overwriting existing files.']
        ]},
        {title:['Ограничения','Limitations'],items:[
          ['Мультиплеер, HotA и HD Mod не включены. Кампании ещё не проверены полностью.','Multiplayer, HotA and HD Mod are not included. Campaigns have not been fully tested.'],
          ['Сохранения хранятся в браузере. Для переноса на другое устройство используй экспорт и импорт.','Saves are stored in your browser. Use export and import to move them to another device.']
        ]}
      ]
    }
  ];
  const current=releases[0];
  window.HEROES_BUILD=Object.freeze({version:current.version,date:current.date,engine:current.engine});
  const english=()=>document.documentElement.lang==='en';
  function textElement(tag,values,className) {
    const element=document.createElement(tag);
    element.textContent=values[english()?1:0];
    element.setAttribute('data-ru',values[0]);element.setAttribute('data-en',values[1]);
    if(className)element.className=className;
    return element;
  }
  const label=document.getElementById('build-version');
  label.textContent=(english()?'Build ':'Сборка ')+current.version;
  label.setAttribute('data-ru','Сборка '+current.version);label.setAttribute('data-en','Build '+current.version);
  document.getElementById('build-engine').textContent=current.engine;
  const versions=document.getElementById('release-versions'),picker=document.getElementById('release-select'),content=document.getElementById('release-content');
  const buttons=[];let selected=0;
  function select(index) {
    if(!Number.isInteger(index) || index<0 || index>=releases.length)return;
    selected=index;picker.value=String(index);
    for(let i=0;i<buttons.length;i++){
      buttons[i].setAttribute('aria-selected',String(i===index));buttons[i].tabIndex=i===index?0:-1;
    }
    const release=releases[index],article=document.createElement('article');article.className='release-entry';article.id='release-detail';article.tabIndex=0;
    article.setAttribute('role','tabpanel');article.setAttribute('aria-labelledby','release-version-'+index);
    article.append(textElement('h2',[release.version+' · '+release.title[0],release.version+' · '+release.title[1]]));
    const date=document.createElement('time');date.dateTime=release.date;
    const value=new Date(release.date+'T12:00:00Z');
    const dates=['ru-RU','en-GB'].map(locale=>new Intl.DateTimeFormat(locale,{dateStyle:'long',timeZone:'UTC'}).format(value));
    date.textContent=dates[english()?1:0];date.setAttribute('data-ru',dates[0]);date.setAttribute('data-en',dates[1]);article.append(date);
    for(const group of release.groups) {
      article.append(textElement('h3',group.title));
      const ul=document.createElement('ul');for(const item of group.items)ul.append(textElement('li',item));article.append(ul);
    }
    content.replaceChildren(article);content.scrollTop=0;
  }
  releases.forEach((release,index)=>{
    const button=document.createElement('button');button.type='button';button.id='release-version-'+index;button.textContent=release.version;
    button.setAttribute('role','tab');button.setAttribute('aria-controls','release-detail');button.addEventListener('click',()=>select(index));
    buttons.push(button);versions.append(button);
    const option=document.createElement('option');option.value=String(index);option.textContent=release.version;picker.append(option);
  });
  versions.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowDown')next=(selected+1)%releases.length;
    else if(event.key==='ArrowUp')next=(selected+releases.length-1)%releases.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=releases.length-1;
    else return;
    event.preventDefault();select(next);buttons[next].focus();
  });
  picker.addEventListener('change',()=>select(Number(picker.value)));
  window.HeroesReleaseNotes={select};select(0);
})();
