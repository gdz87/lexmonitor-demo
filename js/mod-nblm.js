/* 📒 NotebookLM: exportar expediente (.docx) y abrir/guardar enlace del cuaderno */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc, NB='https://notebooklm.google.com/';
const AYUDA='<p class="small muted">Suba el expediente exportado como <b>fuente</b> en NotebookLM para hacerle preguntas o generar resúmenes en audio.</p><div class="card conf small"><b>🔒 Datos de clientes.</b> NotebookLM es un servicio externo de Google. Anonimice el expediente salvo que la firma haya autorizado su uso con datos reales (secreto profesional, Ley 1581 de 2012).</div>';
function md(p,anon){ const c=LM.cli(p.clienteId)||{}; const L=[];
  L.push('# Expediente: '+p.medio,'');
  L.push('## Datos del proceso','- Radicado: '+LM.fmtRad(p.radicado),'- Medio de control: '+(p.medio||''),'- Despacho: '+(p.despacho||''),'- Ponente: '+(p.ponente||''),'- Estado: '+(p.estado||'')+' · Etapa: '+(p.etapa||''),p.cuantia?'- Cuantía: '+LM.money(p.cuantia):'','');
  L.push('## Partes','- Demandante: '+(p.demandante||''),'- Demandado: '+(p.demandado||''),'- Cliente: '+(c.nombre||'')+(c.doc?' ('+c.doc+')':''),'');
  if(p.resumen||p.hechos) L.push('## Resumen de hechos',p.resumen||'',p.hechos||'','');
  const A=(p.actuaciones||[]).slice().sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
  L.push('## Actuaciones (línea de tiempo)'); A.forEach(a=>L.push('- **'+String(a.fecha).slice(0,10)+'** — '+a.titulo+(a.detalle?': '+a.detalle:''))); if(!A.length) L.push('Sin actuaciones registradas.'); L.push('');
  const Ev=(p.eventos||[]); const Al=(LM.state.alertas||[]).filter(a=>a.procesoId===p.id);
  L.push('## Términos, agenda y alertas'); Ev.forEach(e=>L.push('- '+e.fecha+(e.hora?' '+e.hora:'')+' · '+e.tipo+': '+e.titulo+(e.norma?' ('+e.norma+')':''))); Al.forEach(a=>L.push('- Alerta '+String(a.fecha).slice(0,10)+': '+a.titulo+(a.texto?' — '+a.texto:''))); if(!Ev.length&&!Al.length) L.push('Sin términos ni alertas.'); L.push('');
  L.push('## Notas internas',p.notas||'Sin notas.','');
  const J=p.jurisprudencia||[]; L.push('## Fichas de jurisprudencia'); if(!J.length) L.push('Sin fichas.');
  J.forEach(j=>{ L.push('### '+[j.corporacion,j.sala,j.radicado,j.fecha].filter(Boolean).join(' · ')); [['hechos','Hechos'],['problema','Problema jurídico'],['consideraciones','Consideraciones'],['regla','Regla'],['observaciones','Observaciones']].forEach(([k,t])=>j[k]&&L.push('**'+t+':** '+j[k])); L.push(''); });
  let s=L.filter(x=>x!==null).join('\n');
  if(anon){ [[c.nombre,'[CLIENTE]'],[c.doc,'[DOC-CLIENTE]'],[c.email,'[CORREO]'],[c.tel,'[TEL]'],[LM.fmtRad(p.radicado),'[RADICADO]'],[p.radicado,'[RADICADO]']].forEach(([a,b])=>{ if(a) s=s.split(a).join(b); }); }
  return s; }
LM.nbExport=function(pid){ LM.modal('<h2>📒 Exportar expediente para NotebookLM</h2>'+AYUDA+'<label class="row" style="font-weight:500;margin-top:.6rem"><input type="checkbox" id="nb-an" checked> Anonimizar cliente, documento, contacto y radicado</label><div class="row" style="justify-content:flex-end;margin-top:1rem"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="nb-go">⬇ Descargar .docx</button></div>',(m,close)=>{
  m.querySelector('#nb-go').onclick=async()=>{ const p=LM.proc(pid), an=m.querySelector('#nb-an').checked; close();
    try{ await LM.exportWord(md(p,an),'Expediente_NotebookLM_'+(an?'anonimo':String(p.radicado).slice(-9))); }catch(e){ LM.download('Expediente_'+p.id+'.md',md(p,an),'text/markdown'); LM.toast('Se descargó en .md'); } }; }); };
LM.nbOpen=function(pid){ const p=LM.proc(pid);
  LM.modal('<h2>📒 Abrir en NotebookLM</h2>'+AYUDA+'<label for="nb-url">Enlace del cuaderno de este proceso</label><input id="nb-url" type="url" placeholder="https://notebooklm.google.com/notebook/..." value="'+E(p.notebook||'')+'"><div class="row" style="justify-content:flex-end;margin-top:1rem;flex-wrap:wrap"><button class="btn" id="nb-sv">💾 Guardar enlace</button><button class="btn primary" id="nb-op">'+(p.notebook?'Abrir cuaderno':'Abrir NotebookLM')+'</button></div>',(m,close)=>{
    m.querySelector('#nb-sv').onclick=()=>{ const u=m.querySelector('#nb-url').value.trim(); if(u&&!/^https:\/\/notebooklm\.google\.com\//.test(u)) return LM.toast('El enlace debe empezar por https://notebooklm.google.com/'); p.notebook=u; LM.save(); LM.toast(u?'Enlace guardado ✓':'Enlace quitado'); close(); };
    m.querySelector('#nb-op').onclick=()=>{ window.open(p.notebook||NB,'_blank','noopener'); }; }); };
const btns=pid=>'<button class="btn sm" data-nbx="'+pid+'">📒 Exportar expediente para NotebookLM</button><button class="btn sm" data-nbo="'+pid+'">📒 Abrir en NotebookLM</button>';
const wire=(el,getPid)=>{ el.querySelectorAll('[data-nbx]').forEach(b=>b.onclick=()=>LM.nbExport(getPid(b))); el.querySelectorAll('[data-nbo]').forEach(b=>b.onclick=()=>LM.nbOpen(getPid(b))); };
const oP=V.proceso; V.proceso=function(el,args){ oP(el,args); const e=el.querySelector('#edit'); const p=LM.proc(args[0]); if(!e||!p) return;
  e.parentNode.insertAdjacentHTML('afterend','<div class="row no-print" style="margin-top:.5rem;flex-wrap:wrap">'+btns(p.id)+'</div>'); wire(el,b=>b.dataset.nbx||b.dataset.nbo); };
const oA=V.asistente; V.asistente=function(el,args){ oA(el,args); const h=el.querySelector('.ia-bigs'); if(!h) return;
  h.insertAdjacentHTML('afterend','<div class="card" style="margin-top:.7rem"><b>📒 Estudiar el caso en NotebookLM</b>'+AYUDA+'<div class="row" style="flex-wrap:wrap">'+btns('')+'</div><p class="small muted">Se usa el proceso elegido en la Biblioteca de instrucciones.</p></div>');
  wire(el,()=>{ const s=el.querySelector('#ia-p'); return s?s.value:LM.state.procesos[0].id; }); };
})();
