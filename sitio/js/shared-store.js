/* LexMonitor · Almacén compartido LexMonitor <-> Sitio web / Portal del cliente (DEMO, datos ficticios).
   Ambos se publican bajo el mismo origen y comparten este almacén en localStorage (y adjuntos en IndexedDB).
   En producción se reemplaza por un servidor con API y autenticación real (Fase 2).

   Esquema (localStorage['lexportal.v1']):
   { version:1, updatedAt,
     firma:     {nombre, abogado, email},
     clientes:  [{id, nombre, doc, docNorm}]                     // solo clientes con procesos publicados o acceso
     procesos:  [{id, clienteId, radicado, medio, despacho, estado, etapa, resumenCliente, actualizado}]  // SOLO los marcados "Publicar en portal"
     publicaciones: [{id, procesoId, fecha, titulo, resumen}]    // SOLO actuaciones publicadas con resumen para el cliente
     eventos:   [{id, procesoId, fecha, hora, titulo}]           // próximas fechas de procesos publicados
     accesos:   [{clienteId, docNorm, codigo, creado, activo}]   // generados en LexMonitor > Clientes
     solicitudes:[{id, fecha, origen:'contacto'|'portal'|'asistente', clienteId, procesoId, nombre, email, tel,
                   asunto, mensaje, adjuntos:[{id,nombre,size,tipo}], autorizacionDatos:true, estado:'nueva'|'en_tramite'|'respondida',
                   respuesta, respondidaEn, leidaCliente}] }
   Regla: LexMonitor escribe clientes/procesos/publicaciones/eventos/firma (proyección); ambos escriben solicitudes; LexMonitor escribe accesos. */
(function(){
const KEY='lexportal.v1', CH='lexmonitor-shared';
const S=window.LexShared={KEY};
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const rel=n=>{const t=new Date();t.setHours(0,0,0,0);t.setDate(t.getDate()+n);return iso(t);};
S.uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
S.normDoc=s=>String(s||'').replace(/\D/g,'');
/* Resúmenes para el cliente de los datos de ejemplo (los usa también LexMonitor para marcar lo publicado) */
S.DEMO_PUB={
 p1:{resumen:'Demandamos la multa urbanística que le impusieron. El juzgado aceptó estudiar el caso y la entidad ya respondió. Lo siguiente es la audiencia inicial.',
     acts:{'Auto admite demanda':'El Tribunal aceptó estudiar su demanda (la "admitió"). Es un paso normal del inicio del proceso.',
           'Contestación de la demanda':'La entidad respondió la demanda y se opone. Lo revisaremos y lo discutiremos en la audiencia.',
           'Auto fija fecha de audiencia inicial':'El Tribunal fijó la fecha de la primera audiencia. Le contaremos cómo prepararnos.'}},
 p6:{resumen:'Pedimos que se corrija el cálculo de su pensión. El proceso ya pasó por las etapas principales y está esperando que el juez dicte sentencia.',
     acts:{'Admite':'El juzgado aceptó estudiar su demanda.','Al despacho para sentencia':'El expediente está en manos del juez para que escriba la sentencia. No requiere acción suya por ahora.'}},
 p5:{resumen:'La acción de tutela contra la EPS fue negada en primera instancia. Estamos evaluando impugnar (pedir que un juez superior la revise).',
     acts:{'Fallo niega amparo':'El juez negó la tutela. Estamos revisando la decisión para impugnarla dentro del plazo.'}}
};
S.DEMO_ACCESS=[{clienteId:'c2',docNorm:'00000002',doc:'C.C. 00.000.002',codigo:'DEMO-4821'},{clienteId:'c1',docNorm:'9000000010',doc:'NIT 900.000.001-0',codigo:'DEMO-7350'}];
function seed(){
  const P=(id,cli,rad,medio,desp,etapa)=>({id,clienteId:cli,radicado:rad,medio,despacho:desp,estado:'Activo',etapa,resumenCliente:S.DEMO_PUB[id].resumen,actualizado:rel(0)});
  const pubs=[];const add=(pid,d,t)=>pubs.push({id:S.uid(),procesoId:pid,fecha:rel(d),titulo:t,resumen:S.DEMO_PUB[pid].acts[t]});
  add('p1',-160,'Auto admite demanda');add('p1',-40,'Contestación de la demanda');add('p1',-5,'Auto fija fecha de audiencia inicial');
  add('p6',-1150,'Admite');add('p6',-260,'Al despacho para sentencia');add('p5',-2,'Fallo niega amparo');
  return {version:1,updatedAt:new Date().toISOString(),seed:true,
   firma:{nombre:'Firma de abogados (nombre por definir)',abogado:'Abogado(a) titular',email:'notificaciones@firma-ejemplo.test'},
   clientes:[{id:'c1',nombre:'Inversiones Alto Ricaurte S.A.S. (ficticio)',doc:'NIT 900.000.001-0',docNorm:'9000000010'},{id:'c2',nombre:'Mariela Toquica Fonseca (ficticia)',doc:'C.C. 00.000.002',docNorm:'00000002'}],
   procesos:[P('p1','c1','15001233300020250012300','Nulidad y restablecimiento del derecho','Tribunal Administrativo de Boyacá – Sala de Decisión','Contestación de la demanda'),
     P('p6','c2','15001333300520220011200','Nulidad y restablecimiento del derecho','Juzgado 5.º Administrativo del Circuito de Tunja','Sentencia de primera instancia'),
     P('p5','c2','15238400300120260021800','Acción de tutela','Juzgado 1.º Civil Municipal de Duitama (tutela)','Fallo de primera instancia')],
   publicaciones:pubs,
   eventos:[{id:'e1',procesoId:'p1',fecha:rel(9),hora:'09:00',titulo:'Audiencia inicial (art. 180 CPACA)'}],
   accesos:S.DEMO_ACCESS.map(a=>({clienteId:a.clienteId,docNorm:a.docNorm,codigo:a.codigo,creado:rel(-3),activo:true})),
   solicitudes:[{id:'s-demo1',fecha:rel(-2)+'T10:15',origen:'portal',clienteId:'c2',procesoId:'p6',nombre:'Mariela Toquica Fonseca (ficticia)',email:'mariela.t@ejemplo.test',tel:'',asunto:'¿Debo llevar algún documento?',mensaje:'Buenos días, ¿necesitan algún documento adicional para la sentencia? (mensaje ficticio)',adjuntos:[],autorizacionDatos:true,estado:'respondida',respuesta:'Por ahora no se necesita nada. Le avisaremos apenas el juez dicte sentencia. (respuesta ficticia)',respondidaEn:rel(-1)+'T16:40',leidaCliente:true},
     {id:'s-demo2',fecha:rel(0)+'T08:05',origen:'contacto',clienteId:'',procesoId:'',nombre:'Persona interesada (ficticia)',email:'interesado@ejemplo.test',tel:'300 000 0099',asunto:'Consulta sobre una sanción de tránsito',mensaje:'Me impusieron una sanción y quiero saber si se puede demandar. (mensaje ficticio)',adjuntos:[],autorizacionDatos:true,estado:'nueva',respuesta:'',respondidaEn:''}]};
}
S.load=function(){ try{ const s=localStorage.getItem(KEY); if(s){ const d=JSON.parse(s); if(d&&d.version) return d; } }catch(e){} const d=seed(); S.save(d,true); return d; };
let bc=null; try{ if('BroadcastChannel' in window) bc=new BroadcastChannel(CH); }catch(e){}
S.save=function(d,silent){ d.updatedAt=new Date().toISOString(); try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){ return false; } if(!silent&&bc) try{ bc.postMessage({t:'changed',at:d.updatedAt}); }catch(e){} return true; };
S.update=function(fn){ const d=S.load(); const r=fn(d); S.save(d); return r; };
S.reset=function(){ const d=seed(); S.save(d); return d; };
const subs=[]; S.onChange=fn=>subs.push(fn);
const fire=()=>subs.forEach(f=>{ try{ f(S.load()); }catch(e){ console.error(e); } });
window.addEventListener('storage',e=>{ if(e.key===KEY) fire(); });
if(bc) bc.onmessage=()=>fire();
/* Solicitudes */
S.addSolicitud=function(o){ return S.update(d=>{ const s=Object.assign({id:'s'+S.uid(),fecha:new Date().toISOString().slice(0,16),origen:'contacto',clienteId:'',procesoId:'',nombre:'',email:'',tel:'',asunto:'',mensaje:'',adjuntos:[],autorizacionDatos:false,estado:'nueva',respuesta:'',respondidaEn:''},o); const t=new Date(); s.fecha=iso(t)+'T'+pad(t.getHours())+':'+pad(t.getMinutes()); d.solicitudes.unshift(s); return s; }); };
S.countNuevas=d=>(d||S.load()).solicitudes.filter(s=>s.estado==='nueva').length;
/* Acceso al portal */
S.genCode=()=>{ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c=''; for(let i=0;i<6;i++) c+=A[Math.floor(Math.random()*A.length)]; return c.slice(0,3)+'-'+c.slice(3); };
S.login=function(doc,codigo){ const d=S.load(), n=S.normDoc(doc), c=String(codigo||'').trim().toUpperCase();
  const a=d.accesos.find(x=>x.activo&&x.docNorm===n&&x.codigo.toUpperCase()===c); if(!a) return null; return d.clientes.find(x=>x.id===a.clienteId)||{id:a.clienteId,nombre:'Cliente'}; };
/* Proyección desde LexMonitor: solo lo marcado para el portal */
S.syncFromLex=function(st){ const d=S.load(); const C=st.config||{}; const hoy=iso(new Date());
  const pubP=st.procesos.filter(p=>p.publicar);
  const accIds=new Set(d.accesos.map(a=>a.clienteId)); pubP.forEach(p=>accIds.add(p.clienteId));
  d.firma={nombre:C.firma||'',abogado:C.abogado||'',email:C.email||''};
  d.clientes=st.clientes.filter(c=>accIds.has(c.id)).map(c=>({id:c.id,nombre:c.nombre,doc:c.doc,docNorm:S.normDoc(c.doc)}));
  d.accesos.forEach(a=>{ const c=d.clientes.find(x=>x.id===a.clienteId); if(c) a.docNorm=c.docNorm; });
  d.procesos=pubP.map(p=>({id:p.id,clienteId:p.clienteId,radicado:p.radicado,medio:p.medio,despacho:p.despacho,estado:p.estado,etapa:p.etapa,resumenCliente:p.resumenCliente||'',actualizado:hoy}));
  d.publicaciones=[]; pubP.forEach(p=>(p.actuaciones||[]).filter(a=>a.publicar&&a.resumenCliente).forEach(a=>d.publicaciones.push({id:a.id,procesoId:p.id,fecha:a.fecha,titulo:a.titulo,resumen:a.resumenCliente})));
  d.eventos=[]; pubP.forEach(p=>(p.eventos||[]).filter(e=>e.fecha>=hoy&&e.tipo!=='tarea').forEach(e=>d.eventos.push({id:e.id,procesoId:p.id,fecha:e.fecha,hora:e.hora||'',titulo:e.titulo})));
  delete d.seed; const before=localStorage.getItem(KEY); const tmp=JSON.stringify(Object.assign({},d,{updatedAt:''})); const prev=before?JSON.stringify(Object.assign(JSON.parse(before),{updatedAt:''})):'';
  if(tmp!==prev) S.save(d); };
/* Adjuntos: misma base IndexedDB que LexMonitor ('lexmonitor-files') */
let dbp=null; function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{ if(!window.indexedDB) return rej(new Error('Sin IndexedDB')); const q=indexedDB.open('lexmonitor-files',1); q.onupgradeneeded=()=>q.result.createObjectStore('files'); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); return dbp; }
const put=async(id,val)=>{ const d=await db(); return new Promise((res,rej)=>{ let t; try{ t=d.transaction('files','readwrite'); t.objectStore('files').put(val,id); }catch(e){ return rej(e); } t.oncomplete=res; t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error||new Error('abort')); }); };
/* Algunos navegadores (p. ej. Safari en modo privado) no guardan Blob en IndexedDB: se guarda como ArrayBuffer */
S.filePut=async(id,blob)=>{ try{ await put(id,blob); }catch(e){ const buf=await new Response(blob).arrayBuffer(); await put(id,{buf,type:blob.type||'application/octet-stream'}); } };
S.fileGet=async id=>{ const d=await db(); return new Promise((res,rej)=>{ const q=d.transaction('files').objectStore('files').get(id); q.onsuccess=()=>{ const r=q.result; res(r&&r.buf?new Blob([r.buf],{type:r.type}):r); }; q.onerror=()=>rej(q.error); }); };
})();
