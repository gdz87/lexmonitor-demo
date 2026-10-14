/* Asistente virtual por reglas e intenciones (sin IA externa). Información general, no asesoría jurídica. */
(function(){
const SH=window.LexShared, C=window.SITIO_CONFIG, $=s=>document.querySelector(s);
const DISC='Información general, no es asesoría jurídica.';
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9ñ ]/g,' ').replace(/\s+/g,' ').trim();
const has=(t,...ws)=>ws.some(w=>t.includes(w));
/* Intenciones: [id, prueba, respuesta (texto o función)] — el orden importa */
const INT=[
 ['estado',t=>has(t,'como va','estado de mi','mi proceso','mis procesos','en que va','que ha pasado','novedad','avance'),()=>estado()],
 ['fecha',t=>has(t,'proxima fecha','proxima audiencia','cuando es','fecha de','audiencia','proximas fechas'),()=>proxima()],
 ['nrd',t=>has(t,'nulidad y restablecimiento','nulidad','restablecimiento'),'La nulidad y restablecimiento del derecho es el medio de control para pedirle al juez que anule una decisión de una entidad pública (un acto administrativo) que le causó un perjuicio, y que le restablezca su derecho (por ejemplo, devolver lo pagado o reintegrar a un cargo). Tiene un plazo de caducidad de 4 meses como regla general (art. 164 CPACA).'],
 ['caducidad',t=>has(t,'caducidad','caduca','plazo para demandar','tiempo para demandar','prescri'),'La caducidad es el plazo máximo que fija la ley para presentar una demanda; si se vence, ya no se puede demandar. Como regla general son 4 meses para la nulidad y restablecimiento del derecho y 2 años para la reparación directa (art. 164 CPACA). Hay reglas especiales sobre desde cuándo se cuenta y situaciones que lo suspenden, como la conciliación previa; por eso es importante consultar pronto.'],
 ['reparacion',t=>has(t,'reparacion directa','indemnizacion','dano','accidente'),'La reparación directa sirve para pedir que el Estado indemnice un daño que causó por una acción, una omisión, una obra o una operación administrativa. Como regla general, el plazo para demandar es de 2 años (art. 164 CPACA).'],
 ['demora',t=>has(t,'cuanto se demora','cuanto demora','cuanto tarda','cuanto tiempo','demora','tarda'),'Depende del tipo de proceso, del despacho y de su carga de trabajo. Un proceso contencioso administrativo suele tomar varios años en total, pero no es posible garantizar un tiempo. En el portal verá cada avance que publique su abogado.'],
 ['despacho',t=>has(t,'al despacho','despacho para'),'«Al despacho» significa que el expediente pasó al juez o magistrado para que tome una decisión (un auto o la sentencia). Normalmente usted no tiene que hacer nada; puede tardar un tiempo según la carga del despacho.'],
 ['admisorio',t=>has(t,'admisorio','admite','admision','admitio'),'El «auto admisorio» es la decisión con la que el juez acepta tramitar la demanda porque cumple los requisitos, y ordena notificarla a la entidad demandada. Es una buena señal: el proceso arrancó formalmente.'],
 ['inadmite',t=>has(t,'inadmite','inadmision','inadmitio'),'«Inadmitir» significa que el juez pidió corregir algo de la demanda dentro de un plazo corto. Su abogado se encarga de la corrección; si se corrige a tiempo, el proceso sigue.'],
 ['traslado',t=>has(t,'traslado'),'Un «traslado» es el periodo en que se da a conocer un escrito o una prueba a la otra parte para que se pronuncie (por ejemplo, el traslado de la demanda a la entidad o el traslado para alegar). La duración depende del tipo de traslado y la fija la ley (plazo exacto: validar con el abogado).'],
 ['sentencia',t=>has(t,'sentencia','fallo'),'La sentencia es la decisión de fondo del juez. Contra ella normalmente procede el recurso de apelación dentro de un plazo corto que corre desde la notificación; su abogado le explicará los pasos.'],
 ['notificacion',t=>has(t,'notificacion','notificar','estado electronico','estados'),'Notificar es comunicar oficialmente una decisión del despacho. Hoy la mayoría de notificaciones son electrónicas; la notificación por correo se entiende hecha 2 días hábiles después del envío (art. 199 CPACA, modificado por la Ley 2080 de 2021). Este portal no reemplaza las notificaciones oficiales.'],
 ['tutela',t=>has(t,'tutela'),'La acción de tutela protege derechos fundamentales (salud, debido proceso, petición, etc.) cuando no hay otro medio eficaz o hay un perjuicio irremediable. El juez debe decidir en un plazo muy corto que fija la ley (plazo exacto: validar con el abogado).'],
 ['peticion',t=>has(t,'derecho de peticion','peticion'),'El derecho de petición permite pedir información o actuaciones a entidades (y a ciertos particulares), que deben responder dentro del plazo legal (plazo general: validar con el abogado). Si no responden, se puede acudir a la tutela.'],
 ['horario',t=>has(t,'horario','hora de atencion','atienden','abren','direccion','donde quedan','ubicacion','telefono'),()=>'Horario: '+C.horario+'.\nDirección: '+C.direccion+', '+C.ciudad+'.\nTeléfono: '+C.telefono+' · Correo: '+C.email+'.'],
 ['documentos',t=>has(t,'documento','enviar','adjuntar','archivo','papeles','soporte'),()=>Site.session()?'Puede enviar documentos desde «Nueva solicitud» en su portal: escriba el asunto y adjunte los archivos (máx. 5 MB c/u).':'Si es cliente, ingrese al Portal del cliente y use «Nueva solicitud» para adjuntar archivos. Si aún no es cliente, escríbanos por el formulario de contacto y le diremos cómo enviarlos.'],
 ['costo',t=>has(t,'cuanto cuesta','costo','precio','honorario','cobran','valor'),'Los honorarios dependen del caso. Déjenos una solicitud y el abogado le informará las condiciones.'],
 ['abogado',t=>has(t,'hablar con','abogado','llamar','cita','consulta'),null],
 ['saludo',t=>/^(hola|buen(os|as)|hey|saludos)/.test(t),'¡Hola! Soy el asistente virtual de '+C.firma+'. Puedo explicarle términos jurídicos básicos, darle el horario y, si ingresó al portal, contarle cómo va su proceso.'],
 ['gracias',t=>has(t,'gracias','listo','perfecto'),'¡Con gusto! Si necesita algo más, aquí estoy.']
];
const QUICK=['¿Cómo va mi proceso?','¿Cuál es la próxima fecha?','¿Qué es la caducidad?','¿Qué es nulidad y restablecimiento?','¿Qué significa «al despacho»?','¿Cuánto se demora?','Horarios','¿Cómo envío documentos?','Hablar con el abogado'];
let lastQ='';
function needLogin(){ return {t:'Para consultar su proceso necesito que ingrese al Portal del cliente con su documento y código de acceso.',actions:[['Ir al portal',()=>{ location.hash='#/portal'; }]]}; }
function estado(){ const cli=Site.session(); if(!cli) return needLogin(); const {procs}=Site.clientData(cli);
  if(!procs.length) return 'Su abogado aún no ha publicado procesos en el portal. Puede dejarle una solicitud.';
  return procs.map(p=>{ const u=p.pubs[0], e=p.evs[0]; return '📁 '+p.medio+' ('+Site.fmtRad(p.radicado).slice(0,17)+'…)\nEtapa: '+p.etapa+'.'+(p.resumenCliente?'\n'+p.resumenCliente:'')+(u?'\nÚltima novedad ('+Site.fmt(u.fecha)+'): '+u.titulo+' — '+u.resumen:'')+(e?'\nPróxima fecha: '+Site.fmt(e.fecha)+(e.hora?' '+e.hora:'')+' — '+e.titulo:''); }).join('\n\n'); }
function proxima(){ const cli=Site.session(); if(!cli) return needLogin(); const {procs}=Site.clientData(cli); const all=[]; procs.forEach(p=>p.evs.forEach(e=>all.push([e,p]))); all.sort((a,b)=>a[0].fecha<b[0].fecha?-1:1);
  if(!all.length) return 'No tiene fechas próximas publicadas. Si espera una, puede preguntarle al abogado.'; const [e,p]=all[0]; return 'Su próxima fecha es el '+Site.fmt(e.fecha)+(e.hora?' a las '+e.hora:'')+': '+e.titulo+' ('+p.medio+').'+(all.length>1?'\nDespués: '+all.slice(1,3).map(([x])=>Site.fmt(x.fecha)+' — '+x.titulo).join('; '):''); }
function offerRequest(q){ const cli=Site.session(); return {t:'No tengo una respuesta segura para eso. ¿Quiere que le deje la pregunta a su abogado como una solicitud?',actions:[[cli?'Sí, crear solicitud':'Sí, ir al formulario',()=>createReq(q)],['No, gracias',()=>bot('Entendido. Puede intentar con otra pregunta.')]]}; }
function createReq(q){ const cli=Site.session(); if(cli){ SH.addSolicitud({origen:'asistente',clienteId:cli.id,nombre:cli.nombre,asunto:'Pregunta desde el asistente virtual',mensaje:q||'(sin texto)',autorizacionDatos:true}); bot('✓ Listo. Su pregunta quedó registrada para el abogado. Verá la respuesta en «Mis solicitudes».'); Site.toast('Solicitud creada ✓'); if(/^#\/portal/.test(location.hash)) Site.route(); }
  else { sessionStorage.setItem('lexportal.prefill',q||''); location.hash='#/contacto'; bot('Abrí el formulario de contacto con su pregunta. Complete sus datos y autorice el tratamiento de datos para enviarla.'); } }
function answer(q){ const t=norm(q); lastQ=q; for(const [id,test,r] of INT){ if(test(t)){ if(id==='abogado') return {t:'Puedo dejarle su mensaje al abogado como una solicitud.',actions:[['Crear solicitud',()=>createReq(q)]]}; return typeof r==='function'?r():r; } } return offerRequest(q); }
function add(cls,txt,actions){ const d=document.createElement('div'); d.className='msg '+cls; d.textContent=txt; if(cls==='bot'){ const s=document.createElement('span'); s.className='disc'; s.textContent=DISC; d.appendChild(s); }
  (actions||[]).forEach(([l,fn])=>{ const b=document.createElement('button'); b.type='button'; b.className='btn sm'; b.textContent=l; b.style.marginRight='.4rem'; b.onclick=()=>{ d.querySelectorAll('button').forEach(x=>x.disabled=true); fn(); }; d.appendChild(b); });
  const log=$('#chatLog'); log.appendChild(d); log.scrollTop=log.scrollHeight; }
function bot(r){ if(typeof r==='string') add('bot',r); else add('bot',r.t,r.actions); }
function ask(q){ q=String(q||'').trim(); if(!q) return; add('me',q); setTimeout(()=>bot(answer(q)),150); }
window.SiteChat={ask,answer,norm};
document.addEventListener('DOMContentLoaded',()=>{ const ch=$('#chat'), fab=$('#chatFab'); let started=false;
  const open=v=>{ ch.hidden=!v; fab.classList.toggle('hide',v); if(v){ if(!started){ started=true; const cli=Site.session(); bot('Hola'+(cli?', '+cli.nombre:'')+'. Soy el asistente virtual de '+C.firma+'. Puedo responder preguntas básicas'+(cli?' y contarle cómo va su proceso':'; si ingresa al portal, también le cuento cómo va su proceso')+'.'); } $('#chatTxt').focus(); } };
  fab.onclick=()=>open(true); $('#chatClose').onclick=()=>{ open(false); fab.focus(); };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!ch.hidden) open(false); });
  $('#chatQuick').innerHTML=QUICK.map(q=>'<button type="button">'+Site.E(q)+'</button>').join(''); $('#chatQuick').querySelectorAll('button').forEach(b=>b.onclick=()=>ask(b.textContent));
  $('#chatForm').onsubmit=e=>{ e.preventDefault(); const i=$('#chatTxt'); ask(i.value); i.value=''; };
});
})();
