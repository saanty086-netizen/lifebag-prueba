/* ===== Life Bag - script compartido ===== */
/* Lucide: se llama al final de cada pagina; esta funcion la reutilizan ambas */
function initIcons(){ if(window.lucide) lucide.createIcons(); }

/* ---------- Checklist con persistencia en localStorage (solo armar-kit.html) ---------- */
const CHECKLIST=[
 {t:'Agua',ic:'droplets',hint:'Para el traslado inmediato.',items:['Botellas prácticas y compactas (1 por persona como mínimo)']},
 {t:'Alimentos',ic:'utensils',hint:'No perecederos.',items:['Barras de cereal','Enlatados con abrelatas','Galletitas']},
 {t:'Salud / Botiquín',ic:'briefcase-medical',hint:'',items:['Gasas y apósitos','Desinfectante','Medicación personal indicada por tu profesional de salud','Necesidades de salud de niños y niñas']},
 {t:'Iluminación',ic:'flashlight',hint:'Solo LED. Nada de velas, fósforos ni encendedores.',items:['Linterna LED','Pilas de repuesto']},
 {t:'Documentación',ic:'file-text',hint:'',items:['Copias de DNI y carnets en bolsa hermética']},
 {t:'Higiene',ic:'sparkles',hint:'',items:['Alcohol en gel','Papel higiénico','Toallitas']},
 {t:'Abrigo',ic:'layers',hint:'',items:['Mantas térmicas livianas o mudas compactas']},
 {t:'Comunicación',ic:'smartphone',hint:'',items:['Cargador / powerbank','Libreta con teléfonos clave anotados a mano']},
 {t:'Varios',ic:'key',hint:'',items:['Copia de llaves','Silbato para emergencias']}
];
const KEY='lifebag-checklist-v2';
const cards=document.getElementById('clCards');
if(cards){
  let saved={};
  const storageNote=document.getElementById('clStorage');
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(parsed && typeof parsed==='object' && !Array.isArray(parsed)) saved=parsed;
  }catch(e){ if(storageNote) storageNote.textContent='Podés usar la lista, pero este navegador no pudo recuperar tu avance.'; }
  CHECKLIST.forEach((c,ci)=>{
    const d=document.createElement('details'); d.className='card'; d.open=window.innerWidth>768&&ci<9;
    d.innerHTML='<summary><i data-lucide="'+c.ic+'" class="i"></i><span></span><span class="count"></span><i data-lucide="chevron-down" class="i chev"></i></summary>';
    d.querySelector('summary span').textContent=c.t;
    if(c.hint){const p=document.createElement('p');p.className='hint';p.textContent=c.hint;d.append(p)}
    c.items.forEach((txt,ii)=>{
      const l=document.createElement('label'),cb=document.createElement('input'),s=document.createElement('span');
      cb.type='checkbox'; cb.id='c'+ci+'_'+ii; cb.checked=saved[cb.id]===1 || saved[cb.id]===true; s.textContent=txt;
      l.append(cb,s); d.append(l);
    });
    cards.append(d);
  });
  const boxes=()=>cards.querySelectorAll('input[type=checkbox]');
  const update=()=>{
    const all=[...boxes()],done=all.filter(b=>b.checked).length,pct=Math.round(done/all.length*100),s={};
    all.forEach(b=>{if(b.checked)s[b.id]=1});
    cards.querySelectorAll('details').forEach(d=>{const bs=d.querySelectorAll('input');d.querySelector('.count').textContent=[...bs].filter(b=>b.checked).length+'/'+bs.length});
    document.getElementById('clText').textContent=done+' de '+all.length+' elementos listos';
    document.getElementById('clBar').style.width=pct+'%';
    document.querySelector('.progress').setAttribute('aria-valuenow',pct);
    try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){ if(storageNote) storageNote.textContent='Tu navegador no permite guardar el avance. La lista funciona mientras mantengas esta página abierta.'; }
  };
  cards.addEventListener('change',update);
  document.getElementById('clReset').addEventListener('click',()=>{boxes().forEach(b=>b.checked=false);update()});
  update();
}
initIcons();
