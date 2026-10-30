/* Opens a reviewable GitHub draft. No report is sent automatically. */
'use strict';
(() => {
  const endpoint = 'https://github.com/JevgeniSoonberg/heroes3-browser/issues/new';
  function reportURL() {
    const english = document.documentElement.lang === 'en';
    const text = (ru, en) => english ? en : ru;
    const build = window.HEROES_BUILD || {};
    const details = [
      text('## Что произошло', '## What happened'), '',
      text('Опиши проблему здесь.', 'Describe the problem here.'), '',
      text('## Как повторить', '## Steps to reproduce'), '', '1. ', '2. ', '',
      text('## Что ожидалось', '## Expected behavior'), '', '',
      text('## Устройство и браузер', '## Device and browser'), '',
      text('Модель устройства (заполни): ', 'Device model (please fill in): '),
      text('Сборка: ', 'Build: ') + (build.version || 'unknown'),
      text('Движок: ', 'Engine: ') + (build.engine || 'unknown'),
      text('Язык игры: ', 'Game language: ') + (english ? 'English' : 'Русский'),
      'Browser: ' + navigator.userAgent,
      'Platform: ' + navigator.platform,
      'Touch points: ' + navigator.maxTouchPoints,
      'Viewport: ' + window.innerWidth + ' × ' + window.innerHeight,
      'Site: ' + location.origin + location.pathname,
      '', text('Обращение будет публичным. Не добавляй личные данные. Скриншот можно приложить вручную.', 'This report will be public. Do not include personal information. You can attach a screenshot manually.'),
    ];
    const url = new URL(endpoint);
    url.searchParams.set('title', text('Проблема: ', 'Bug: '));
    url.searchParams.set('body', details.join('\n'));
    return url.href;
  }
  document.querySelectorAll('[data-report-problem]').forEach(link => {
    // Refresh on activation, after a language change or window resize.
    link.addEventListener('click', () => { link.href = reportURL(); });
    link.addEventListener('contextmenu', () => { link.href = reportURL(); });
    link.addEventListener('auxclick', () => { link.href = reportURL(); });
    link.href = reportURL();
  });
})();
