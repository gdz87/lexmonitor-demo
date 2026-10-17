/* LexMonitor – núcleo: navegación, vistas, avisos, modales, tema */
(function(){
const LM=window.LM, $=s=>document.querySelector(s);
LM.$=$; LM.views={};
LM.NAV=[
 {id:'tablero',ic:'▦',t:'Tablero',main:true},{id:'procesos',ic:'📁',t:'Procesos',main:true},{id:'alertas',ic:'🔔',t:'SAMAI',bt:'Consulta',main:true},
 {id:'agenda',ic:'📅',t:'Agenda',main:true},{id:'bandeja',ic:'📥',t:'Bandeja inteligente'},{id:'terminos',ic:'⏱',t:'Términos'},{id:'rama',ic:'🏛',t:'Rama Judicial'},{id:'siugj',ic:'⚖',t:'SIUGJ laboral'},{id:'radicacion',ic:'📤',t:'Radicación laboral'},{id:'antecedentes',ic:'🔎',t:'Consultas y antecedentes'},{id:'asistente',ic:'🧭',t:'Asistente'},
 {id:'solicitudes',ic:'📨',t:'Solicitudes del portal'},{id:'clientes',ic:'👥',t:'Clientes'},{id:'borradores',ic:'📝',t:'Borradores'},{id:'reportes',ic:'📊',t:'Reportes'},
 {id:'notificaciones',ic:'💬',t:'Canales'},{id:'config',ic:'⚙',t:'Configuración'}
];
LM.toast=function(msg){ const w=$('#toasts'); const d=document.createElement('div'); d.className='toast'; d.textContent=msg; w.appendChild(d); setTimeout(()=>d.remove(),3200); };
LM.modal=function(html,onMount){ const bg=document.createElement('div'); bg.className='modal-bg'; bg.innerHTML='<div class="modal" role="dialog" aria-modal="true">'+html+'</div>';
  const close=()=>{bg.remove();document.removeEventListener('keydown',k);}; const k=e=>{if(e.key==='Escape')close();};
  bg.addEventListener('click',e=>{ if(e.target===bg||e.target.closest('[data-close]')) close(); }); document.addEventListener('keydown',k);
  document.body.appendChild(bg); const f=bg.querySelector('input,select,textarea,button'); f&&f.focus(); onMount&&onMount(bg.querySelector('.modal'),close); return close; };
LM.proc=id=>LM.state.procesos.find(p=>p.id===id);
LM.cli=id=>LM.state.clientes.find(c=>c.id===id)||{nombre:'—'};
LM.allEvents=function(){ const out=[]; LM.state.procesos.forEach(p=>(p.eventos||[]).forEach(e=>out.push(Object.assign({proceso:p},e)))); return out.sort((a,b)=>a.fecha<b.fecha?-1:1); };
LM.applyTheme=function(){ const t=LM.state.config.theme; const dark=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme=dark?'dark':'light'; };
LM.refreshChrome=function(){ $('#appName').textContent=LM.state.config.appName||'LexMonitor'; document.title=(LM.state.config.appName||'LexMonitor')+' · Maqueta';
  const ns=window.LexShared?LexShared.countNuevas():0; const n=LM.state.alertas.filter(a=>!a.leida).length+ns; const b=$('#alertBadge'); b.textContent=n; b.classList.toggle('hide',!n);
  $('#btnAlerts').setAttribute('aria-label','Alertas ('+n+' sin leer, '+ns+' solicitudes nuevas del portal)');
  document.querySelectorAll('[data-nav=solicitudes] .nb').forEach(x=>x.remove()); if(ns) document.querySelectorAll('[data-nav=solicitudes]').forEach(a=>a.insertAdjacentHTML('beforeend','<span class="chip danger nb">'+ns+'</span>')); };
/* Migración de datos guardados por versiones anteriores */
LM.migrate=function(st){ if((st.version||1)>=2) return st; const PUB=(window.LexShared&&LexShared.DEMO_PUB)||{};
  st.procesos.forEach(p=>{ if(p.apoderado===undefined) p.apoderado=st.config.abogado||''; p.jurisprudencia=p.jurisprudencia||[]; if(p.publicar===undefined){ const d=PUB[p.id]; p.publicar=!!d; p.resumenCliente=d?d.resumen:''; (p.actuaciones||[]).forEach(a=>{ if(d&&d.acts[a.titulo]){ a.publicar=true; a.resumenCliente=d.acts[a.titulo]; } }); } });
  const demo=LM.demoData(); st.procesos.forEach(p=>{ if(p.id==='p1'&&!p.jurisprudencia.length){ const dp=demo.procesos.find(x=>x.id==='p1'); p.jurisprudencia=dp.jurisprudencia; } });
  st.version=2; return st; };
/* Menú agrupado: el grupo se asigna por id al dibujar (incluye entradas que agregan otros módulos) */
LM.NAV_GRUPOS=[['General',['tablero','procesos','agenda','terminos']],['Consulta judicial',['alertas','rama','siugj','radicacion','antecedentes']],['Correo y clientes',['bandeja','solicitudes','clientes','notificaciones']],['IA y documentos',['asistente','revision','borradores','reportes']],['Ajustes',['config']]];
LM.CONSULTA=['alertas','rama','siugj','samai','consulta'];
function buildNav(){
  const link=(n,cls,short)=>'<a href="#/'+n.id+'" data-nav="'+n.id+'" class="'+(cls||'')+'"><span class="ic" aria-hidden="true">'+n.ic+'</span><span>'+(short&&n.bt||n.t)+'</span></a>';
  const G=LM.NAV_GRUPOS, gi=id=>{ const i=G.findIndex(g=>g[1].includes(id)); return i<0?G.length:i; };
  const ord=LM.NAV.map((n,i)=>[n,i]).sort((a,b)=>gi(a[0].id)-gi(b[0].id)||a[1]-b[1]).map(x=>x[0]);
  const grouped=(hcls)=>{ let cur=-1, h=''; ord.forEach(n=>{ const g=gi(n.id); if(g!==cur){ cur=g; h+='<div class="'+hcls+'" role="presentation">'+(G[g]?G[g][0]:'Otros')+'</div>'; } h+=link(n); }); return h; };
  $('#sidenav').innerHTML=grouped('navgrp');
  $('#bottomnav').innerHTML=LM.NAV.filter(n=>n.main).map(n=>link(n,'',true)).join('')+'<a href="#" id="navMore"><span class="ic">⋯</span><span>Más</span></a>';
  $('#sheetLinks').innerHTML=grouped('navgrp sheetgrp');
  const open=v=>{$('#sheet').classList.toggle('open',v);$('#sheetBg').classList.toggle('open',v);};
  $('#navMore').onclick=e=>{e.preventDefault();open(true);}; $('#btnMenu').onclick=()=>open(true); $('#sheetBg').onclick=()=>open(false);
  $('#sheetLinks').addEventListener('click',()=>open(false));
  $('#btnAlerts').onclick=()=>{ location.hash=(window.LexShared&&LexShared.countNuevas()&&!LM.state.alertas.some(a=>!a.leida))?'#/solicitudes':'#/alertas'; };
  $('#btnTheme').onclick=()=>{ const cur=document.documentElement.dataset.theme; LM.state.config.theme=cur==='dark'?'light':'dark'; LM.save(); LM.applyTheme(); LM.toast('Modo '+(LM.state.config.theme==='dark'?'oscuro':'claro')+' activado'); };
}
LM.route=function(){
  const h=location.hash.replace(/^#\/?/,'')||'tablero'; const [name,...args]=h.split('/');
  const v=LM.views[name]||LM.views.tablero; const navId=name==='proceso'?'procesos':name==='samai'?'alertas':name;
  const inC=LM.CONSULTA.includes(navId); document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===navId||(inC&&a.dataset.nav==='alertas'&&a.closest('#bottomnav'))));
  const el=$('#view'); try{ el.innerHTML=''; v(el,args.map(decodeURIComponent)); }catch(e){ console.error(e); el.innerHTML='<div class="card err">Error al cargar el módulo: '+LM.esc(e.message)+'</div>'; }
  LM.refreshChrome(); window.scrollTo(0,0);
};
LM.boot=function(){
  LM.state=LM.load()||LM.demoData(); if(!LM.state.config) LM.state=LM.demoData(); LM.migrate(LM.state); LM.save();
  if(window.LexShared) LexShared.onChange(()=>{ LM.refreshChrome(); const h=location.hash; const typing=document.activeElement&&/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName);
    if(!document.querySelector('.modal-bg')&&!typing&&(/^#\/(solicitudes|tablero)?$/.test(h)||h==='')) LM.route(); else if(/^#\/solicitudes/.test(h)) LM.toast('📨 Hay cambios en las solicitudes del portal'); });
  LM.applyTheme(); buildNav(); window.addEventListener('hashchange',LM.route); LM.route();
  if(LM.startScheduler) LM.startScheduler();
  if('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.LM_SINGLE){ const had=!!navigator.serviceWorker.controller; let shown=false;
    const banner=()=>{ if(shown||!had) return; shown=true; const d=document.createElement('div'); d.className='update-bar'; d.setAttribute('role','alert'); d.innerHTML='🔄 Hay una versión nueva <button class="btn sm primary" id="upd-go">Actualizar</button>'; document.body.appendChild(d); d.querySelector('#upd-go').onclick=()=>location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange',banner);
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{ const chk=()=>reg.update().catch(()=>{}); document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') chk(); }); setInterval(chk,30*60*1000);
      reg.addEventListener('updatefound',()=>{ const w=reg.installing; w&&w.addEventListener('statechange',()=>{ if(w.state==='installed'&&navigator.serviceWorker.controller) w.postMessage('skip'); }); }); }).catch(()=>{}); }
};
})();
