(() => {
  const $ = (selector,root=document) => root.querySelector(selector);
  const $$ = (selector,root=document) => [...root.querySelectorAll(selector)];
  const closeDropdowns = except => $$('.nav-trigger').forEach(button => {
    if(button===except)return; button.setAttribute('aria-expanded','false');document.getElementById(button.getAttribute('aria-controls')).hidden=true;
  });
  $$('.nav-trigger').forEach(button=>button.addEventListener('click',()=>{
    const opened=button.getAttribute('aria-expanded')==='true';closeDropdowns();button.setAttribute('aria-expanded',String(!opened));document.getElementById(button.getAttribute('aria-controls')).hidden=opened;
  }));
  $$('.nav-group').forEach(group=>group.addEventListener('keydown',event=>{
    const button=$('.nav-trigger',group),panel=document.getElementById(button.getAttribute('aria-controls'));
    const links=$$('a',panel),index=links.indexOf(document.activeElement);
    if(event.target===button&&['ArrowDown','ArrowUp'].includes(event.key)){
      event.preventDefault();closeDropdowns(button);button.setAttribute('aria-expanded','true');panel.hidden=false;
      (event.key==='ArrowUp'?links.at(-1):links[0])?.focus();
    }else if(!panel.hidden&&index>=0&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?links.length-1:(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
      links[next].focus();
    }
  }));
  document.addEventListener('click',event=>{if(!event.target.closest('.nav-group'))closeDropdowns();});
  document.addEventListener('focusin',event=>{const group=event.target.closest('.nav-group');closeDropdowns(group?$('.nav-trigger',group):null);});
  const menu=$('#mobile-menu'),toggle=$('.menu-toggle');
  function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Меню');document.body.classList.remove('menu-open');}
  toggle.addEventListener('click',()=>{const opened=toggle.getAttribute('aria-expanded')==='true';if(opened)closeMenu();else{menu.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Закрыть меню');document.body.classList.add('menu-open');}});
  $$('a',menu).forEach(a=>a.addEventListener('click',closeMenu));
  matchMedia('(min-width:1024px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){const active=$('.nav-trigger[aria-expanded="true"]');if(active){closeDropdowns();active.focus();}if(!menu.hidden){closeMenu();toggle.focus();}}
    if(event.key==='Tab'&&!menu.hidden){const all=[toggle,...$$('a,button',menu)];const first=all[0],last=all[all.length-1];if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}}
  });
  const dialog=$('.inquiry-dialog');let returnFocus=null;
  $$('[data-inquiry]').forEach(button=>button.addEventListener('click',()=>{returnFocus=button;closeMenu();closeDropdowns();const task=$('[name="task"]',dialog);if(button.dataset.inquiry)task.value=`Интересует: ${button.dataset.inquiry}. `;$('.form-result',dialog).hidden=true;dialog.showModal();}));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{if(returnFocus?.offsetParent)returnFocus.focus();else toggle.focus();});
  $$('.inquiry-form').forEach(form=>{
    const result=$('.form-result',form);
    function error(name,message){const field=$(`[name="${name}"]`,form);field.setAttribute('aria-invalid',String(!!message));document.getElementById(`${form.id}-${name}-error`).textContent=message;}
    form.addEventListener('input',event=>{const field=event.target;if(['name','contact','task','consent'].includes(field.name))error(field.name,'');result.hidden=true;});
    form.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(form);const name=String(data.get('name')||'').trim(),contact=String(data.get('contact')||'').trim(),task=String(data.get('task')||'').trim();const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);const validPhone=/^[+\d\s()-]+$/.test(contact)&&contact.replace(/\D/g,'').length>=10&&contact.replace(/\D/g,'').length<=15;
      const errors={name:name.length<2?'Введите имя — не менее двух символов.':'',contact:!validEmail&&!validPhone?'Укажите корректный телефон или email.':'',task:task.length<10?'Опишите задачу — не менее 10 символов.':'',consent:!data.get('consent')?'Подтвердите ознакомление с политикой.':''};Object.entries(errors).forEach(([n,m])=>error(n,m));const first=Object.keys(errors).find(n=>errors[n]);if(first){result.hidden=true;$(`[name="${first}"]`,form).focus();return;}
      result.innerHTML='<strong>Поля заполнены. Обращение не отправлено.</strong><br>Это локальный прототип без сервера. Данные не сохранены. Свяжитесь с LifeBatt: <a href="tel:+74957715400">+7 (495) 771-54-00</a> или <a href="mailto:7715400@mail.ru">7715400@mail.ru</a>.';result.hidden=false;result.focus();
    });
  });
  const search=$('#catalog-search');if(search){
    const category=$('#catalog-category'),cards=$$('#catalog-grid .product-card'),chips=$$('[data-kind-filter]');let kind='all';
    function norm(value){return value.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[–—-]/g,' ').trim();}
    function update(sync=true){const terms=norm(search.value).split(/\s+/).filter(Boolean);let count=0;cards.forEach(card=>{const haystack=norm(card.dataset.search);const visible=(kind==='all'||card.dataset.kind===kind)&&(!category.value||card.dataset.category===category.value)&&terms.every(term=>haystack.includes(term));card.hidden=!visible;if(visible)count++;});$('#catalog-count').textContent=`Найдено направлений: ${count}`;$('#catalog-empty').hidden=count!==0;chips.forEach(c=>{const active=c.dataset.kindFilter===kind;c.setAttribute('aria-pressed',String(active));c.classList.toggle('active',active);});if(sync){const params=new URLSearchParams();if(search.value.trim())params.set('q',search.value.trim());if(kind!=='all')params.set('type',kind);if(category.value)params.set('category',category.value);history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);}}
    function restore(){const params=new URLSearchParams(location.search);search.value=params.get('q')||'';kind=['product','industry','service'].includes(params.get('type'))?params.get('type'):'all';category.value=params.get('category')||'';update(false);}
    search.addEventListener('input',()=>update());category.addEventListener('change',()=>update());chips.forEach(c=>c.addEventListener('click',()=>{kind=c.dataset.kindFilter;update();}));$('#reset-filters').addEventListener('click',()=>{kind='all';search.value='';category.value='';update();});window.addEventListener('popstate',restore);restore();
  }
})();
