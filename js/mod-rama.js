/* Rama Judicial: Consulta de Procesos Nacional Unificada (CPNU) – consulta por radicado o nombre, sujetos, actuaciones,
   importación a la línea de tiempo y verificación de novedades. Consultas SOLO a demanda del usuario (sin robots ni
   consultas programadas: las condiciones de uso de la Rama Judicial prohíben consultas automatizadas). */
(function(){
const LM=window.LM, V=LM.views, E=LM.esc;
const API='https://consultaprocesos.ramajudicial.gov.co:448/api/v2', WEB='https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion';
const KR='lm_rama_via'; /* última vía que funcionó: directa | proxy */
const lsg=(k,d)=>{ try{ return localStorage.getItem(k)||d; }catch(e){ return d; } }, lss=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const day=s=>s?String(s).slice(0,10):'';
async function tfetch(u,o,ms){ const ac=new AbortController(), t=setTimeout(()=>ac.abort(),ms); try{ return await fetch(u,Object.assign({signal:ac.signal},o||{})); }finally{ clearTimeout(t); } }
async function viaDirecta(path){ const r=await tfetch(API+path,{headers:{Accept:'application/json'}},9000); return r; }
async function viaProxy(path){ const c=LM.gemCode&&LM.gemCode(); if(!c) { const e=new Error('Sin código de prueba para usar el servidor intermedio'); e.nocode=true; throw e; }
  return await tfetch(LM.PROXY_URL+'/rama'+path,{headers:{'X-Codigo':c}},30000); }
/* GET con estrategia: vía recordada → la otra. Devuelve JSON o lanza error (con .manual=true si ninguna vía funcionó) */
LM.ramaGet=async function(path){ const order=lsg(KR,'directa')==='proxy'?[viaProxy,viaDirecta]:[viaDirecta,viaProxy]; let last;
  for(const f of order){ try{ const r=await f(path); let j=null; try{ j=await r.json(); }catch(e){}
      if(j&&j.error&&j.error.lexmonitor){ last=new Error(j.error.message); if(r.status===401||r.status===403||r.status===429) continue; continue; }
      if(!r.ok){ const m=(j&&(j.Message||j.message))||('HTTP '+r.status); const e=new Error(m); e.rama=true; e.status=r.status; throw e; }
      lss(KR,f===viaProxy?'proxy':'directa'); LM.ramaVia=f===viaProxy?'servidor intermedio LexMonitor':'conexión directa'; return j; }
    catch(e){ if(e.rama) throw e; last=e; } }
  const e=new Error('No fue posible conectarse con la Consulta de Procesos de la Rama Judicial'+(last&&!last.nocode?' ('+(last.name==='AbortError'?'tiempo agotado':last.message)+')':'')+'. Use el modo manual: abra la consulta oficial y pegue las actuaciones.'); e.manual=true; throw e; };
LM.ramaBuscarRad=async rad=>{ const j=await LM.ramaGet('/Procesos/Consulta/NumeroRadicacion?numero='+rad+'&SoloActivos=false&pagina=1'); return j.procesos||[]; };
LM.ramaBuscarNombre=async (nombre,tipo,activos,pag)=>{ const j=await LM.ramaGet('/Procesos/Consulta/NombreRazonSocial?nombre='+encodeURIComponent(nombre)+'&tipoPersona='+tipo+'&SoloActivos='+(activos?'true':'false')+'&codificacionDespacho=&pagina='+(pag||1)); return j; };
LM.ramaFicha=async function(id){ const det=await LM.ramaGet('/Proceso/Detalle/'+id); const suj=await LM.ramaGet('/Proceso/Sujetos/'+id+'?pagina=1');
  let acts=[]; for(let p=1;p<=10;p++){ const a=await LM.ramaGet('/Proceso/Actuaciones/'+id+'?pagina='+p); acts=acts.concat(a.actuaciones||[]); const pg=a.paginacion||{}; if(!pg.cantidadPaginas||p>=pg.cantidadPaginas) break; }
  return {idProceso:id,detalle:det||{},sujetos:(suj&&suj.sujetos)||[],actuaciones:acts}; };
const tipoDe=t=>{ t=(t||'').toLowerCase(); return /audiencia/.test(t)?'audiencia':/notific|estado|edicto|traslado secretarial/.test(t)?'notificacion':/auto|sentencia|fallo|provid|decreta|admite|inadmite|rechaza|resuelve/.test(t)?'providencia':/memorial|recibe|escrito|recurso|contestaci/.test(t)?'memorial':/reparto|radicaci/.test(t)?'radicacion':'otro'; };
const nivelDe=t=>/sentencia|fallo|auto|audiencia|traslado|requiere|inadmite|rechaza/i.test(t||'')?'alta':'media';
LM.ramaAct=a=>({id:'r'+a.idRegActuacion,ramaId:a.idRegActuacion,cons:a.consActuacion,fecha:day(a.fechaActuacion),tipo:tipoDe(a.actuacion),titulo:String(a.actuacion||'Actuación').trim(),
  detalle:String(a.anotacion||'').trim()+(a.fechaInicial?' (Término: '+day(a.fechaInicial)+' a '+day(a.fechaFinal)+')':''),fuente:'Rama Judicial (CPNU)',inicio:day(a.fechaInicial),fin:day(a.fechaFinal)});
const clave=a=>a.ramaId?('id'+a.ramaId):(a.fecha+'|'+(a.titulo||'').toLowerCase().trim());
/* Fusiona las actuaciones de la ficha con el proceso; devuelve las nuevas */
LM.ramaMerge=function(p,ficha){ p.actuaciones=p.actuaciones||[]; const have=new Set(p.actuaciones.map(clave)); const nuevas=[];
  ficha.actuaciones.map(a=>a.idRegActuacion?LM.ramaAct(a):a).sort((a,b)=>a.fecha<b.fecha?-1:1).forEach(a=>{ if(!have.has(clave(a))&&!have.has(a.fecha+'|'+a.titulo.toLowerCase())){ p.actuaciones.push(a); nuevas.push(a); have.add(clave(a)); } });
  /* Términos que reporta el despacho → eventos de vencimiento en la agenda */
  p.eventos=p.eventos||[]; nuevas.forEach(a=>{ if(a.fin&&a.fin>=LM.iso(LM.today())&&!p.eventos.some(e=>e.ramaId===a.ramaId)) p.eventos.push({id:LM.uid(),fecha:a.fin,tipo:'vencimiento',titulo:'Vence término: '+a.titulo,preparada:false,ramaId:a.ramaId}); });
  const ult=ficha.actuaciones.slice().sort((a,b)=>(day(b.fechaActuacion||b.fecha)>day(a.fechaActuacion||a.fecha))?1:-1)[0];
  p.rama=Object.assign(p.rama||{},{idProceso:ficha.idProceso||null,consultado:new Date().toISOString(),ultima:ult?{id:ult.idRegActuacion||null,fecha:day(ult.fechaActuacion||ult.fecha),titulo:ult.actuacion||ult.titulo}:null,total:ficha.actuaciones.length});
  return nuevas; };
LM.ramaAlertas=function(p,nuevas){ const now=new Date(), hh=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  nuevas.slice(-10).forEach(a=>LM.state.alertas.push({id:LM.uid(),fecha:LM.iso(LM.today())+'T'+hh,procesoId:p.id,titulo:'Rama Judicial · nueva actuación: '+a.titulo,texto:(a.fecha?LM.fmt(a.fecha)+' · ':'')+(a.detalle||'').slice(0,300),leida:false,nivel:nivelDe(a.titulo),fuente:'Rama Judicial (CPNU)'})); };
/* Crea o actualiza un proceso de LexMonitor a partir de la ficha */
LM.ramaImport=function(ficha,rad){ const S=LM.state, d=ficha.detalle||{}; rad=rad||d.llaveProceso; let p=S.procesos.find(x=>(x.radicado||'').replace(/\D/g,'')===rad); const nuevo=!p;
  const suj=ficha.sujetos||[], by=re=>suj.filter(s=>re.test(s.tipoSujeto||'')).map(s=>String(s.nombreRazonSocial||'').trim()).join('; ');
  if(nuevo){ p={id:'p'+LM.uid(),radicado:rad,medio:(d.claseProceso||'').trim()||'Por definir',despacho:(d.despacho||'').trim(),ponente:(d.ponente||'').trim()||'—',clienteId:'',demandante:by(/demandante|accionante|convocante/i),demandado:by(/demandado|accionado|convocado/i),
      estado:'Activo',etapa:(d.ubicacion?'Ubicación: '+d.ubicacion:'Por definir'),cuantia:0,fechaHecho:'',resumen:(d.contenidoRadicacion||'').trim(),actuaciones:[],eventos:[],documentos:[],notas:'',apoderado:S.config.abogado||'',jurisprudencia:[],publicar:false,resumenCliente:''};
    S.procesos.push(p); }
  else { if(!p.despacho&&d.despacho) p.despacho=d.despacho.trim(); if((!p.ponente||p.ponente==='—')&&d.ponente) p.ponente=d.ponente.trim(); }
  p.ramaSujetos=suj.map(s=>({tipo:s.tipoSujeto,nombre:String(s.nombreRazonSocial||'').trim()}));
  const nuevas=LM.ramaMerge(p,ficha); if(!nuevo) LM.ramaAlertas(p,nuevas); LM.save(); return {p,nuevo,nuevas}; };
/* Verificación de novedades para un proceso guardado: compara con la última actuación guardada */
LM.ramaVerificar=async function(p){ const rad=(p.radicado||'').replace(/\D/g,''); if(rad.length!==23) throw new Error('El radicado de '+(p.radicado||'este proceso')+' no tiene 23 dígitos.');
  let id=p.rama&&p.rama.idProceso; if(!id){ const L=await LM.ramaBuscarRad(rad); if(!L.length) throw new Error('La Rama Judicial no devolvió procesos para '+LM.fmtRad(rad)+' (puede estar en SAMAI, ser reservado o no existir).'); id=L[0].idProceso; }
  const prev=p.rama&&p.rama.ultima; const f=await LM.ramaFicha(id); const nuevas=LM.ramaMerge(p,f); LM.ramaAlertas(p,nuevas); LM.save(); return {nuevas,prev,ultima:p.rama.ultima}; };
/* Modo manual: texto pegado desde la consulta oficial → actuaciones. Formatos: "AAAA-MM-DD | Actuación | Anotación" o tabla copiada (fecha dd/mm/aaaa o aaaa-mm-dd al inicio). */
LM.ramaParseManual=function(txt){ const out=[]; String(txt||'').replace(/\r/g,'').split('\n').forEach(l=>{ l=l.trim(); if(!l) return;
    let m=l.match(/^(\d{4})-(\d{2})-(\d{2})\s*[|\t;]\s*(.+)$/)||l.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[|\t;]?\s*(.+)$/); if(!m) return;
    const f=m[1].length===4?m[1]+'-'+m[2]+'-'+m[3]:m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'); const parts=m[4].split(/\s*[|\t]\s*/).filter(Boolean);
    const dates=parts.filter(x=>/^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(x)); const txts=parts.filter(x=>!dates.includes(x));
    out.push({fecha:f,actuacion:txts[0]||'Actuación',anotacion:txts.slice(1).join(' · ')}); });
  return out.map(a=>({id:LM.uid(),fecha:a.fecha,tipo:tipoDe(a.actuacion),titulo:a.actuacion,detalle:a.anotacion,fuente:'Rama Judicial (manual)'})); };
function sujHtml(L){ return L.length?'<table><tr><th>Tipo</th><th>Nombre o razón social</th></tr>'+L.map(s=>'<tr><td>'+E(s.tipoSujeto||s.tipo||'')+'</td><td>'+E(String(s.nombreRazonSocial||s.nombre||'').trim())+'</td></tr>').join('')+'</table>':'<p class="small muted">Sin sujetos públicos.</p>'; }
function actsHtml(L){ return '<div class="list">'+L.map(a=>'<div class="item"><div class="row between"><b>'+E(a.actuacion)+'</b><span class="chip">'+LM.fmt(day(a.fechaActuacion))+'</span></div>'+(a.anotacion?'<div class="small">'+E(a.anotacion)+'</div>':'')+(a.fechaInicial?'<div class="small muted">Término: '+LM.fmt(day(a.fechaInicial))+' → '+LM.fmt(day(a.fechaFinal))+'</div>':'')+'</div>').join('')+'</div>'; }
V.rama=function(el,args){ const S=LM.state; const pre=(args&&args[0]||'').replace(/\D/g,'');
  const conRad=S.procesos.filter(p=>(p.radicado||'').replace(/\D/g,'').length===23);
  el.innerHTML='<h2>🏛 Rama Judicial</h2><p class="small muted">Consulta de Procesos Nacional Unificada (CPNU) de la Rama Judicial: juzgados y tribunales (incluidos los administrativos). Los procesos del Consejo de Estado y de algunos tribunales con SAMAI se consultan en SAMAI. Cada consulta se hace solo cuando usted pulsa un botón.</p>'+
   '<div class="card"><h2>Buscar</h2><div class="row" role="tablist"><button class="btn sm primary" data-m="rad">Por radicado</button><button class="btn sm" data-m="nom">Por nombre o razón social</button><button class="btn sm" data-m="man">Modo manual</button></div><div id="rm-form" style="margin-top:.6rem"></div></div><div id="rm-res"></div>'+
   '<div class="card" style="margin-top:1rem"><div class="row between"><h2>Verificar novedades</h2><button class="btn primary" id="rm-all"'+(conRad.length?'':' disabled')+'>⟳ Verificar procesos importados</button></div><p class="small muted">Compara la última actuación guardada de cada proceso con la Rama Judicial y crea alertas por cada actuación nueva.</p><div class="list" id="rm-list">'+
   (conRad.filter(p=>p.rama).map(p=>'<div class="item row between"><div><b class="mono">'+LM.fmtRad(p.radicado)+'</b><div class="small">'+E(p.despacho||'')+'</div><div class="small muted">Última guardada: '+(p.rama.ultima?LM.fmt(p.rama.ultima.fecha)+' · '+E(p.rama.ultima.titulo||''):'—')+' · consultado '+new Date(p.rama.consultado).toLocaleString('es-CO')+'</div></div><div class="row"><a class="btn sm" href="#/proceso/'+p.id+'">Ver</a><button class="btn sm" data-ver="'+p.id+'">⟳ Verificar</button></div></div>').join('')||'<p class="small muted">Aún no hay procesos importados desde la Rama Judicial.</p>')+'</div></div>';
  const form=el.querySelector('#rm-form'), res=el.querySelector('#rm-res');
  const busy=(b,t)=>{ b.disabled=true; const o=b.textContent; b.textContent='⏳ '+(t||'Consultando…'); return ()=>{ b.disabled=false; b.textContent=o; }; };
  const fail=e=>{ res.innerHTML='<div class="card err" style="margin-top:1rem"><b>'+E(e.message)+'</b>'+(e.manual?'<p class="small">Si su red no permite la conexión directa (puerto 448) y no tiene un código de prueba, use <b>Modo manual</b>: <a href="'+WEB+'" target="_blank" rel="noopener">abrir la consulta oficial</a>, copiar las actuaciones y pegarlas.</p><button class="btn sm" id="rm-gom">Ir al modo manual</button>':'')+'</div>'; const g=res.querySelector('#rm-gom'); g&&(g.onclick=()=>mode('man')); };
  async function ficha(id,rad){ res.innerHTML='<div class="card" style="margin-top:1rem">⏳ Cargando detalle, sujetos y actuaciones…</div>';
    try{ const f=await LM.ramaFicha(id), d=f.detalle; const ex=S.procesos.find(x=>(x.radicado||'').replace(/\D/g,'')===(rad||d.llaveProceso));
      res.innerHTML='<div class="card" style="margin-top:1rem"><div class="row between"><div><h2 class="mono">'+LM.fmtRad(d.llaveProceso||rad)+'</h2><div class="small">'+E(d.despacho||'')+'</div></div><span class="chip info">vía '+E(LM.ramaVia||'')+'</span></div>'+
        '<div class="grid g2 small" style="margin:.5rem 0"><div><span class="muted">Clase:</span> '+E(d.claseProceso||'—')+'</div><div><span class="muted">Tipo:</span> '+E(d.tipoProceso||'—')+'</div><div><span class="muted">Ponente:</span> '+E(d.ponente||'—')+'</div><div><span class="muted">Ubicación:</span> '+E(d.ubicacion||'—')+'</div><div><span class="muted">Radicado el:</span> '+LM.fmt(day(d.fechaProceso))+'</div><div><span class="muted">Actualizado en la Rama:</span> '+E((d.ultimaActualizacion||'').replace('T',' ').slice(0,16))+'</div></div>'+
        (d.esPrivado?'<p class="chip warn">Proceso reservado: la Rama no publica sujetos ni actuaciones.</p>':'')+
        '<div class="row"><button class="btn primary" id="rm-imp">'+(ex?'⟳ Actualizar en LexMonitor':'⬇ Importar a LexMonitor')+'</button>'+(ex?'<a class="btn" href="#/proceso/'+ex.id+'">Ver proceso</a>':'')+'</div>'+
        '<h3>Sujetos ('+f.sujetos.length+')</h3>'+sujHtml(f.sujetos)+'<h3>Actuaciones ('+f.actuaciones.length+')</h3>'+actsHtml(f.actuaciones)+'</div>';
      res.querySelector('#rm-imp').onclick=()=>{ const r=LM.ramaImport(f,(d.llaveProceso||rad).replace(/\D/g,'')); LM.toast(r.nuevo?'✅ Proceso importado con '+r.nuevas.length+' actuaciones':'✅ Actualizado: '+r.nuevas.length+' actuaciones nuevas'+(r.nuevas.length?' (alertas creadas)':'')); location.hash='#/proceso/'+r.p.id; }; }
    catch(e){ fail(e); } }
  function lista(L,title){ res.innerHTML='<div class="card" style="margin-top:1rem"><h2>'+E(title)+'</h2><div class="list">'+L.map((p,i)=>'<div class="item"><div class="row between"><b class="mono">'+LM.fmtRad(p.llaveProceso)+'</b><button class="btn sm primary" data-i="'+i+'">Ver ficha</button></div><div class="small">'+E(p.despacho||'')+' · '+E(p.departamento||'')+'</div><div class="small muted">'+E((p.sujetosProcesales||'').slice(0,260))+'</div><div class="small muted">Radicado '+LM.fmt(day(p.fechaProceso))+' · última actuación '+LM.fmt(day(p.fechaUltimaActuacion))+(p.esPrivado?' · <b>reservado</b>':'')+'</div></div>').join('')+'</div></div>';
    res.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{ const p=L[+b.dataset.i]; ficha(p.idProceso,p.llaveProceso); }); }
  function mode(m){ el.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('primary',b.dataset.m===m)); res.innerHTML='';
    if(m==='rad'){ form.innerHTML='<label>Radicado (23 dígitos)<input id="rm-rad" inputmode="numeric" maxlength="40" placeholder="25000233600020260055100" value="'+pre+'"></label>'+(conRad.length?'<label>…o elija un proceso guardado<select id="rm-sel"><option value="">—</option>'+conRad.map(p=>'<option value="'+p.radicado.replace(/\D/g,'')+'">'+LM.fmtRad(p.radicado)+' · '+E((p.demandante||'').slice(0,40))+'</option>').join('')+'</select></label>':'')+'<button class="btn primary" id="rm-go">🔎 Consultar</button>';
      const s=form.querySelector('#rm-sel'); s&&(s.onchange=()=>{ form.querySelector('#rm-rad').value=s.value; });
      form.querySelector('#rm-go').onclick=async ev=>{ const rad=form.querySelector('#rm-rad').value.replace(/\D/g,''); if(rad.length!==23){ LM.toast('El radicado debe tener 23 dígitos (tiene '+rad.length+')'); return; }
        const done=busy(ev.target); try{ const L=await LM.ramaBuscarRad(rad); if(!L.length) res.innerHTML='<div class="card" style="margin-top:1rem">La Rama Judicial no devolvió procesos para '+LM.fmtRad(rad)+'. Si es del Consejo de Estado o de un tribunal con SAMAI, consúltelo en SAMAI.</div>'; else if(L.length===1) await ficha(L[0].idProceso,rad); else lista(L,L.length+' registros para el radicado (varias instancias)'); }catch(e){ fail(e); } done(); };
      if(pre.length===23) form.querySelector('#rm-go').click(); }
    if(m==='nom'){ form.innerHTML='<div class="grid g2"><label>Nombre o razón social<input id="rm-nom" placeholder="MUNICIPIO DE TABIO"></label><label>Tipo de persona<select id="rm-tp"><option value="jur">Jurídica</option><option value="nat">Natural</option></select></label></div><label class="row"><input type="checkbox" id="rm-act" checked> Solo procesos con actuaciones en los últimos 30 días (más rápido)</label><button class="btn primary" id="rm-go">🔎 Buscar</button><p class="small muted">La Rama rechaza búsquedas con más de 1.000 resultados: sea específico.</p>';
      let pag=1; const go=async (b)=>{ const n=form.querySelector('#rm-nom').value.trim(); if(n.length<4){ LM.toast('Escriba al menos 4 caracteres'); return; } const done=busy(b);
        try{ const j=await LM.ramaBuscarNombre(n,form.querySelector('#rm-tp').value,form.querySelector('#rm-act').checked,pag); const pg=j.paginacion||{}; lista(j.procesos||[],(pg.cantidadRegistros||0)+' procesos · página '+pag+' de '+(pg.cantidadPaginas||1));
          if(pg.cantidadPaginas>pag){ const c=res.querySelector('.card'); c.insertAdjacentHTML('beforeend','<button class="btn" id="rm-more">Página siguiente →</button>'); c.querySelector('#rm-more').onclick=e=>{ pag++; go(e.target); }; } }catch(e){ fail(e); } done(); };
      form.querySelector('#rm-go').onclick=e=>{ pag=1; go(e.target); }; }
    if(m==='man'){ form.innerHTML='<p class="small">Respaldo cuando la consulta automática no está disponible: 1) <a href="'+WEB+'" target="_blank" rel="noopener">Abra la consulta oficial</a> y busque el radicado. 2) Copie las filas de actuaciones. 3) Péguelas aquí (una por línea: <span class="mono">AAAA-MM-DD | Actuación | Anotación</span>, o la tabla copiada con la fecha al inicio).</p><label>Radicado (23 dígitos)<input id="rm-mrad" inputmode="numeric" value="'+pre+'"></label><label>Actuaciones<textarea id="rm-mtx" rows="7" placeholder="2026-10-16 | Al despacho por reparto | Ingresa por reparto…"></textarea></label><button class="btn primary" id="rm-mgo">⬇ Importar / actualizar</button>';
      form.querySelector('#rm-mgo').onclick=()=>{ const rad=form.querySelector('#rm-mrad').value.replace(/\D/g,''); if(rad.length!==23){ LM.toast('El radicado debe tener 23 dígitos'); return; } const A=LM.ramaParseManual(form.querySelector('#rm-mtx').value); if(!A.length){ LM.toast('No se reconoció ninguna actuación (falta la fecha al inicio de la línea)'); return; }
        const r=LM.ramaImport({idProceso:null,detalle:{llaveProceso:rad},sujetos:[],actuaciones:A},rad); LM.toast((r.nuevo?'✅ Proceso creado':'✅ Proceso actualizado')+': '+r.nuevas.length+' actuaciones nuevas'); location.hash='#/proceso/'+r.p.id; }; } }
  el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>mode(b.dataset.m)); mode('rad');
  const ver=async (p,b)=>{ const done=b?busy(b,'Verificando…'):null; try{ const r=await LM.ramaVerificar(p); LM.toast(r.nuevas.length?'🔔 '+LM.fmtRad(p.radicado).slice(0,17)+'…: '+r.nuevas.length+' actuaciones nuevas':'Sin novedades en '+LM.fmtRad(p.radicado).slice(0,17)+'…'); return r.nuevas.length; }catch(e){ LM.toast('⚠ '+e.message); return 0; }finally{ done&&done(); } };
  el.querySelectorAll('[data-ver]').forEach(b=>b.onclick=async ()=>{ await ver(LM.proc(b.dataset.ver),b); V.rama(el,args); LM.refreshChrome(); });
  el.querySelector('#rm-all').onclick=async e=>{ const L=conRad.filter(p=>p.rama); if(!L.length){ LM.toast('Primero importe procesos desde la Rama Judicial'); return; } const done=busy(e.target,'Verificando…'); let n=0; for(const p of L){ n+=await ver(p); } done(); LM.toast(n?'🔔 '+n+' actuaciones nuevas en total':'Sin novedades'); V.rama(el,args); LM.refreshChrome(); };
};
})();
