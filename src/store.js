(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const normalize=s=>String(s).toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[–—·/\-]/g,' ').replace(/(\d),(\d)/g,'$1.$2').trim();
  const root=$('[data-store-catalog]');
  if(root){
    const controls={q:$('#store-search'),chemistry:$('#store-chemistry'),voltage:$('#store-voltage'),capacity:$('#store-capacity'),sort:$('#store-sort')};
    const cards=$$('[data-store-item]'),buttons=$$('[data-application]');let application='';
    function update(sync=true){
      const terms=normalize(controls.q.value).split(/\s+/).filter(Boolean);let count=0;
      for(const card of cards){const d=card.dataset;card.hidden=!!((application&&d.category!==application)||(controls.chemistry.value&&d.chemistry!==controls.chemistry.value)||(controls.voltage.value&&d.voltage!==controls.voltage.value)||(controls.capacity.value&&d.capacity!==controls.capacity.value)||!terms.every(t=>normalize(d.search).includes(t)));if(!card.hidden)count++;}
      const sorted=[...cards];if(controls.sort.value==='price-asc')sorted.sort((a,b)=>Number(a.dataset.price)-Number(b.dataset.price));else if(controls.sort.value==='price-desc')sorted.sort((a,b)=>Number(b.dataset.price)-Number(a.dataset.price));else if(controls.sort.value==='name')sorted.sort((a,b)=>a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent,'ru'));for(const card of sorted)$('#store-grid').append(card);
      $('#store-count').textContent=`Найдено: ${count} из ${cards.length}`;$('#store-empty').hidden=count!==0;
      for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.application===application));
      if(sync){const params=new URLSearchParams();if(application)params.set('application',application);for(const [key,el] of Object.entries(controls))if(el.value&&el.value!=='default')params.set(key,el.value);history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);}
    }
    function restore(){const params=new URLSearchParams(location.search);application=buttons.some(b=>b.dataset.application===params.get('application'))?params.get('application'):'';for(const [key,el] of Object.entries(controls)){const v=params.get(key)||'';el.value=el.tagName==='SELECT'?[...el.options].some(o=>o.value===v)?v:key==='sort'?'default':'':v;}update(false);}
    for(const [key,el] of Object.entries(controls))el.addEventListener(key==='q'?'input':'change',()=>update());
    buttons.forEach(b=>b.addEventListener('click',()=>{application=b.dataset.application;update();if(matchMedia('(max-width:767px)').matches)$('.store-category-menu').open=false;}));
    function reset(){application='';for(const [key,el] of Object.entries(controls))el.value=key==='sort'?'default':'';update();}
    $('#store-reset').addEventListener('click',reset);$$('[data-store-reset]').forEach(b=>b.addEventListener('click',reset));window.addEventListener('popstate',restore);restore();if(matchMedia('(max-width:767px)').matches)$('.store-category-menu').open=false;
  }
  const data=JSON.parse($('#store-data')?.textContent||'[]'),byId=new Map(data.map(p=>[p.id,p]));
  const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽',key='lifebatt-demo-selection-v1';let selection={},storage=true;
  function clean(value){const result={};if(value&&typeof value==='object'&&!Array.isArray(value))for(const [id,q] of Object.entries(value))if(byId.has(id)&&Number.isInteger(q)&&q>0)result[id]=Math.min(99,q);return result;}
  try{selection=clean(JSON.parse(localStorage.getItem(key)||'{}'));}catch{storage=false;}
  const dialog=$('.selection-dialog');let returnFocus=null,timer;
  function toast(message){const el=$('.store-toast');el.textContent=message;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,3000);}
  function save(){try{localStorage.setItem(key,JSON.stringify(selection));}catch{storage=false;}$('#selection-storage-note').hidden=storage;$('#selection-request').hidden=true;render();}
  function render(){
    $$('[data-selection-count]').forEach(el=>el.textContent=String(Object.values(selection).reduce((a,b)=>a+b,0)));
    const lines=$('#selection-lines');lines.replaceChildren();let total=0;
    for(const [id,q] of Object.entries(selection)){const p=byId.get(id);total+=p.demoPrice*q;const row=document.createElement('div');row.className='selection-line';const title=document.createElement('strong');title.textContent=p.title;const price=document.createElement('p');price.textContent=`${p.sku} · ${money(p.demoPrice)} × ${q} · демо`;const controls=document.createElement('div');controls.className='selection-quantity';
      for(const [label,action,visible] of [[`Уменьшить количество ${p.sku}`,'minus','−'],[`Увеличить количество ${p.sku}`,'plus','+'],[`Удалить ${p.sku}`,'remove','Удалить']]){const b=document.createElement('button');b.type='button';b.textContent=visible;b.setAttribute('aria-label',label);b.dataset.selectionAction=action;b.dataset.id=id;if(action==='plus'&&q>=99)b.disabled=true;controls.append(b);}
      const qty=document.createElement('span');qty.textContent=`${q} шт.`;controls.prepend(qty);row.append(title,price,controls);lines.append(row);
    }
    if(!Object.keys(selection).length){const p=document.createElement('p');p.className='selection-empty';p.textContent='Пока пусто. Добавьте интересующие примеры из каталога.';lines.append(p);}
    $('#selection-summary').hidden=!Object.keys(selection).length;$('#selection-total').textContent=money(total);$('#selection-storage-note').hidden=storage;
  }
  $$('[data-add-selection]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.addSelection;if(!byId.has(id))return;if((selection[id]||0)>=99){toast('В подборе уже 99 единиц этого примера');return;}selection[id]=(selection[id]||0)+1;save();toast('Добавлено в подбор. Заказ не оформлен.');}));
  $$('[data-open-selection]').forEach(b=>b.addEventListener('click',()=>{returnFocus=b;render();dialog.showModal();}));
  $('.selection-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>returnFocus?.focus());
  $('#selection-lines').addEventListener('click',event=>{const b=event.target.closest('[data-selection-action]');if(!b)return;const id=b.dataset.id,action=b.dataset.selectionAction;if(!selection[id])return;if(action==='remove')delete selection[id];else{selection[id]+=action==='plus'?1:-1;if(selection[id]<=0)delete selection[id];selection=clean(selection);}save();const next=$(`[data-selection-action="${action}"][data-id="${id}"]`)||$('.selection-close');next.focus();});
  $('#selection-prepare').addEventListener('click',()=>{const text=['Здравствуйте! Прошу подобрать реальные позиции LifeBatt по следующим демонстрационным примерам:',...Object.entries(selection).map(([id,q])=>`${byId.get(id).sku}: ${byId.get(id).title} — ${q} шт.`),'','Примеры и параметры не подтверждают совместимость. Прошу уточнить модель, характеристики, комплектацию, реальные цены, наличие, гарантию и доставку.','Модель моего оборудования: [указать]','Требования и габариты: [указать]'].join('\n');$('#selection-text').value=text;$('#selection-request').hidden=false;$('#selection-text').focus();});
  $('#selection-download').addEventListener('click',()=>{const blob=new Blob([$('#selection-text').value],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lifebatt-zapros.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  window.addEventListener('storage',event=>{if(event.key===key){try{selection=clean(JSON.parse(event.newValue||'{}'));$('#selection-request').hidden=true;render();}catch{}}});render();
})();
