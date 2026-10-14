/* Sección propia «🤖 Asistente IA» (#/asistente/<proceso>/<modo>/<instrucción>). El asistente de revisión pasa a #/revision */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc;
/* Menú: «Asistente» (revisión) → «Revisión» en #/revision; nuevo «Asistente IA» */
const i=LM.NAV.findIndex(n=>n.id==='asistente'); if(i>=0) LM.NAV[i]={id:'revision',ic:'🧭',t:'Revisión'};
const j=LM.NAV.findIndex(n=>n.id==='agenda'); LM.NAV.splice(j+1,0,{id:'asistente',ic:'🤖',t:'Asistente IA'});
V.revision=V.asistente;
const GEN=['contestacion','reposicion','apelacion','tutela','concepto'];
function iaStatus(){ const k=LM.gemKey&&LM.gemKey(); if(!k) return '<div class="card row between" style="margin:.6rem 0"><span><span class="chip warn">Sin clave de API</span> Los resultados serán de ejemplo (simulación).</span><a class="btn sm primary" href="#/config">⚙ Configurar clave</a></div>';
  let ok=null; try{ const o=JSON.parse(localStorage.getItem('lm_gemini_ok')||'null'); ok=o&&o.m; }catch(e){}
  const m=LM.gemModel(); return '<div class="card row between" style="margin:.6rem 0"><span><span class="chip ok">IA conectada</span> <span class="small">Google Gemini · modelo: <b>'+E(m==='auto'?'Automático':m)+'</b>'+(ok?' · último que respondió: '+E(ok):'')+'</span></span><a class="small" href="#/config">Configuración</a></div>'; }
V.asistente=function(el,args){ const S=LM.state; let pid=args[0]&&LM.proc(args[0])?args[0]:S.procesos[0].id; let mode=args[1]==='gen'?'generar':'analizar';
  let key=args[2]&&LM.PROMPTS.some(x=>x[0]===args[2])?args[2]:'comparar'; let gk=args[1]==='gen'&&args[2]?args[2]:null; if(gk&&LM.PROMPTS.some(x=>x[0]===gk)) gk='p:'+gk;
  const card=(m,ic,t,d)=>'<button class="card ia-big'+(mode===m?' on':'')+'" data-big="'+m+'" type="button"><span class="ia-ic" aria-hidden="true">'+ic+'</span><b>'+t+'</b><span class="small muted">'+d+'</span></button>';
  el.innerHTML='<h1>🤖 Asistente IA</h1><p class="small muted">Analice documentos o genere escritos con inteligencia artificial a partir de los datos de sus procesos. Revise siempre el resultado.</p>'+iaStatus()+
   '<div class="grid g2 ia-bigs">'+card('analizar','🔍','Analizar / comparar documentos','Compare dos documentos, detecte contradicciones, resuma o haga fichas a partir de textos o archivos.')+card('generar','✍','Generar documento','Redacte un escrito (petición, recurso, tutela…) con los datos del proceso.')+'</div>'+
   '<div id="ia-host"></div>'+
   '<details class="card" id="ia-lib" style="margin-top:1rem"'+(args[3]==='lib'?' open':'')+'><summary><b>📚 Biblioteca de instrucciones ('+LM.PROMPTS.length+')</b> <span class="small muted">— elija una para usarla o cópiela para otra herramienta</span></summary>'+
   '<div class="list" id="plist" style="margin-top:.6rem">'+LM.PROMPTS.map(x=>'<button class="btn'+(x[0]===key&&mode==='analizar'?' primary':'')+'" data-pk="'+x[0]+'" style="justify-content:flex-start">'+(GEN.includes(x[0])?'✍ ':'🔍 ')+E(x[1])+'</button>').join('')+'</div>'+
   '<label for="ia-p">Proceso</label><select id="ia-p">'+S.procesos.map(p=>'<option value="'+p.id+'"'+(p.id===pid?' selected':'')+'>'+LM.fmtRad(p.radicado).slice(0,24)+' · '+E(p.medio)+'</option>').join('')+'</select>'+
   '<label class="row" style="font-weight:500"><input type="checkbox" id="ia-fill" checked> Rellenar con los datos del proceso</label><label class="row" style="font-weight:500"><input type="checkbox" id="ia-anon" checked> Anonimizar cliente y radicado</label>'+
   '<div class="row between"><h3 id="ia-t" style="margin:.4rem 0"></h3><button class="btn sm" id="ia-copy">📋 Copiar instrucción</button></div><textarea id="ia-out" class="prompt-out" aria-label="Instrucción (editable)"></textarea>'+
   '<div class="card conf small" style="margin-top:.6rem"><b>🔒 Confidencialidad.</b> Anonimice los datos de los clientes antes de usar una IA externa. El secreto profesional y la Ley 1581 de 2012 siguen aplicando.</div></details>';
  const $=s=>el.querySelector(s);
  const url=()=>history.replaceState(null,'','#/asistente/'+pid+'/'+(mode==='generar'?'gen':'an')+'/'+(mode==='generar'?(gk||''):key));
  const gen=()=>{ const p=LM.proc(pid); $('#ia-t').textContent=LM.PROMPTS.find(x=>x[0]===key)[1]; $('#ia-out').value=LM.buildPrompt(key,p,{fill:$('#ia-fill').checked,anon:$('#ia-anon').checked}); };
  gen();
  const box=(LM.iaAttach(el,()=>key,()=>pid,()=>$('#ia-out').value,()=>LM.PROMPTS.find(x=>x[0]===key)[1],{mode,gk,gp:pid,hideModes:true}),el.querySelector('#ia-run'));
  $('#ia-host').appendChild(box); box.style.marginTop='1rem';
  const setMode=m=>{ mode=m; el.querySelectorAll('[data-big]').forEach(b=>b.classList.toggle('on',b.dataset.big===m)); url(); };
  el.querySelectorAll('[data-big]').forEach(b=>b.onclick=()=>{ setMode(b.dataset.big); box._set(mode,null,pid); box.scrollIntoView({behavior:'smooth',block:'start'}); });
  el.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>{ key=b.dataset.pk; el.querySelectorAll('[data-pk]').forEach(x=>x.classList.toggle('primary',x===b)); gen();
    if(GEN.includes(key)){ gk='p:'+key; setMode('generar'); box._set('generar',gk,pid); } else { setMode('analizar'); box._set('analizar',null,pid); }
    LM.toast('Instrucción: '+LM.PROMPTS.find(x=>x[0]===key)[1]); box.scrollIntoView({behavior:'smooth',block:'start'}); });
  $('#ia-p').onchange=e=>{ pid=e.target.value; gen(); box._set(null,null,pid); url(); };
  el.querySelectorAll('#ia-fill,#ia-anon').forEach(x=>x.onchange=gen);
  $('#ia-copy').onclick=()=>{ const t=$('#ia-out'); (navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>LM.toast('Instrucción copiada ✓'),()=>{ t.select(); try{document.execCommand('copy');LM.toast('Instrucción copiada ✓');}catch(e){LM.toast('Seleccione y copie manualmente');} }); };
};
/* Borradores: sin pestaña IA; rutas antiguas @ia → Asistente IA; botón «Mejorar con Asistente IA» */
const origB=V.borradores; V.borradores=function(el,args){
  if(args[1]==='@ia'){ const k=args[2]||''; location.replace('#/asistente/'+(args[0]||'')+'/'+(GEN.includes(k)?'gen':'an')+'/'+k); return; }
  origB(el,args); el.querySelectorAll('a[href*="/@ia"]').forEach(a=>a.remove());
  const w=el.querySelector('#b-word'); if(w){ w.insertAdjacentHTML('afterend','<button class="btn" id="b-ai">🤖 Mejorar con Asistente IA</button>');
    el.querySelector('#b-ai').onclick=()=>{ location.hash='#/asistente/'+el.querySelector('#b-p').value+'/gen/tpl:'+el.querySelector('#b-t').value; }; } };
})();
