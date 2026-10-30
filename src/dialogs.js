'use strict';
(() => {
  const openers=new WeakMap();let previousOverflow='';
  for(const button of document.querySelectorAll('[data-open-dialog]'))button.addEventListener('click',()=>{
    const dialog=document.getElementById(button.dataset.openDialog);
    if(dialog.open)return;
    if(dialog.id==='release-dialog')window.HeroesReleaseNotes.select(0);
    openers.set(dialog,button);previousOverflow=document.body.style.overflow;
    dialog.showModal();document.body.style.overflow='hidden';
  });
  for(const dialog of document.querySelectorAll('.site-dialog')){
    dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;openers.get(dialog)?.focus();});
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const box=dialog.getBoundingClientRect();
      if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)dialog.close();
    });
  }
})();
