/* LexMonitor – utilidades, festivos, términos, radicado y almacenamiento */
(function(){
const LM = window.LM = window.LM || {};
const pad = n => String(n).padStart(2,'0');
LM.iso = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
LM.parse = s => { const [y,m,d] = String(s).slice(0,10).split('-').map(Number); return new Date(y,m-1,d); };
LM.addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
LM.today = () => { const t = new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); };
LM.diffDays = (a,b) => Math.round((LM.parse(b)-LM.parse(a))/864e5);
const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIA = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
LM.MES = MES; LM.DIA = DIA;
LM.fmt = s => { if(!s) return '—'; const d = typeof s==='string'?LM.parse(s):s; return d.getDate()+' '+MES[d.getMonth()].slice(0,3)+' '+d.getFullYear(); };
LM.fmtLong = s => { const d = typeof s==='string'?LM.parse(s):s; return DIA[d.getDay()]+' '+d.getDate()+' de '+MES[d.getMonth()]+' de '+d.getFullYear(); };
LM.esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
LM.uid = () => Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
LM.money = n => '$ '+Number(n||0).toLocaleString('es-CO');

/* ---- Festivos de Colombia (Ley 51 de 1983 "Ley Emiliani") ---- */
function easter(y){ // algoritmo de Meeus/Butcher (gregoriano)
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
  h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
  month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1; return new Date(y,month-1,day);
}
LM.easter = easter;
const nextMonday = d => { const x=new Date(d); const w=x.getDay(); if(w!==1) x.setDate(x.getDate()+((8-w)%7)); return x; };
const cache = {};
LM.holidays = function(y){
  if(cache[y]) return cache[y];
  const H = [];
  const add=(d,n)=>H.push({date:LM.iso(d),name:n});
  add(new Date(y,0,1),'Año Nuevo'); add(new Date(y,4,1),'Día del Trabajo'); add(new Date(y,6,20),'Independencia');
  add(new Date(y,7,7),'Batalla de Boyacá'); add(new Date(y,11,8),'Inmaculada Concepción'); add(new Date(y,11,25),'Navidad');
  [[0,6,'Reyes Magos'],[2,19,'San José'],[5,29,'San Pedro y San Pablo'],[7,15,'Asunción de la Virgen'],[9,12,'Día de la Raza'],[10,1,'Todos los Santos'],[10,11,'Independencia de Cartagena']]
    .forEach(([m,d,n])=>add(nextMonday(new Date(y,m,d)),n));
  const E = easter(y);
  add(LM.addDays(E,-3),'Jueves Santo'); add(LM.addDays(E,-2),'Viernes Santo');
  add(LM.addDays(E,43),'Ascensión del Señor'); add(LM.addDays(E,64),'Corpus Christi'); add(LM.addDays(E,71),'Sagrado Corazón');
  H.sort((a,b)=>a.date<b.date?-1:1); return cache[y]=H;
};
LM.holidayName = iso => { const h = LM.holidays(+iso.slice(0,4)).find(x=>x.date===iso); return h?h.name:null; };

/* Vacancia judicial: configurable (por defecto 20 dic – 10 ene, Decreto 1265 de 1970; y lunes a miércoles santos) */
LM.vacancia = function(iso){
  const cfg = (LM.state && LM.state.config) || {};
  const d = LM.parse(iso), y=d.getFullYear(), md = iso.slice(5);
  const ini = cfg.vacIni||'12-20', fin = cfg.vacFin||'01-10';
  if(md>=ini || md<=fin) return 'Vacancia judicial colectiva';
  if(cfg.vacSanta!==false){ const E=easter(y); for(let k=-6;k<=-4;k++) if(LM.iso(LM.addDays(E,k))===iso) return 'Vacancia de Semana Santa'; }
  return null;
};
LM.dayInfo = function(iso){
  const d = LM.parse(iso), w=d.getDay();
  if(w===0||w===6) return {habil:false,why:w===0?'Domingo':'Sábado'};
  const h = LM.holidayName(iso); if(h) return {habil:false,why:'Festivo: '+h};
  const v = LM.vacancia(iso); if(v) return {habil:false,why:v};
  return {habil:true};
};
LM.isHabil = iso => LM.dayInfo(iso).habil;
LM.nextHabil = iso => { let d=LM.parse(iso); while(!LM.isHabil(LM.iso(d))) d=LM.addDays(d,1); return LM.iso(d); };
/* Suma n días hábiles: el término empieza a correr el día hábil siguiente al hecho */
LM.addHabiles = function(iso,n,log){
  let d=LM.parse(iso), c=0, skipped=[];
  while(c<n){ d=LM.addDays(d,1); const s=LM.iso(d), inf=LM.dayInfo(s); if(inf.habil) c++; else skipped.push({date:s,why:inf.why}); }
  if(log) log.skipped = skipped; return LM.iso(d);
};
LM.addMonths = function(iso,n){ const d=LM.parse(iso); const day=d.getDate(); const t=new Date(d.getFullYear(),d.getMonth()+n,1);
  const last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate(); t.setDate(Math.min(day,last)); return LM.iso(t); };
LM.habilesEntre = function(a,b){ let n=0,d=LM.parse(a); const e=LM.parse(b); while(d<e){ d=LM.addDays(d,1); if(LM.isHabil(LM.iso(d))) n++; } return n; };

/* Catálogo de términos. verified=true: tomado de norma citada; false: editable/validar con el abogado */
LM.TERMS = [
 {id:'cad-nrd',name:'Caducidad – Nulidad y restablecimiento del derecho',unit:'meses',n:4,base:'Día siguiente a la comunicación, notificación, ejecución o publicación del acto',norma:'Art. 164 num. 2 lit. d) CPACA',verified:true,calendar:true},
 {id:'cad-rd',name:'Caducidad – Reparación directa',unit:'años',n:2,base:'Día siguiente a la ocurrencia de la acción u omisión (o a su conocimiento)',norma:'Art. 164 num. 2 lit. i) CPACA',verified:true,calendar:true},
 {id:'not-199',name:'Notificación electrónica (se entiende surtida)',unit:'habiles',n:2,base:'Envío del mensaje de datos; los términos corren desde el día siguiente',norma:'Art. 199 CPACA (mod. art. 48 Ley 2080 de 2021)',verified:true},
 {id:'traslado-demanda',name:'Traslado de la demanda',unit:'habiles',n:30,base:'Día siguiente a la notificación surtida',norma:'Art. 172 CPACA',verified:false},
 {id:'apel-sent',name:'Apelación de sentencia',unit:'habiles',n:10,base:'Día siguiente a la notificación',norma:'Art. 247 CPACA',verified:false},
 {id:'apel-auto',name:'Apelación de auto',unit:'habiles',n:3,base:'Día siguiente a la notificación',norma:'Art. 244 CPACA',verified:false},
 {id:'reposicion',name:'Recurso de reposición',unit:'habiles',n:3,base:'Día siguiente a la notificación',norma:'Art. 242 CPACA / art. 318 CGP',verified:false},
 {id:'impugna-tutela',name:'Impugnación fallo de tutela',unit:'habiles',n:3,base:'Notificación del fallo',norma:'Art. 31 Decreto 2591 de 1991',verified:false},
 {id:'peticion',name:'Respuesta a derecho de petición',unit:'habiles',n:15,base:'Día siguiente a la radicación',norma:'Art. 14 CPACA (Ley 1755 de 2015)',verified:false},
 {id:'custom',name:'Término personalizado',unit:'habiles',n:5,base:'Definido por el usuario',norma:'—',verified:false}
];
/* Cálculo de un término; devuelve fecha de vencimiento y traza */
LM.computeTerm = function(t,startIso,opts){
  opts=opts||{}; const steps=[]; let start=startIso;
  if(opts.notifElectronica && t.id!=='not-199'){ const s=LM.addHabiles(startIso,2); steps.push('Notificación electrónica surtida el '+LM.fmtLong(s)+' (art. 199: 2 días hábiles tras el envío).'); start=s; }
  let end, log={};
  if(t.unit==='habiles'){ end=LM.addHabiles(start,t.n,log); steps.push(t.n+' días hábiles contados desde el día siguiente al '+LM.fmt(start)+'.'); if(log.skipped.length) steps.push('Se excluyeron '+log.skipped.length+' días no hábiles: '+log.skipped.filter(x=>!/Sábado|Domingo/.test(x.why)).map(x=>LM.fmt(x.date)+' ('+x.why+')').join('; ')+(log.skipped.some(x=>/Sábado|Domingo/.test(x.why))?' y fines de semana.':'')); }
  else if(t.unit==='calendario'){ end=LM.iso(LM.addDays(LM.parse(start),t.n)); steps.push(t.n+' días calendario.'); }
  else { const months = t.unit==='años'?t.n*12:t.n; end=LM.addMonths(start,months); steps.push(t.n+' '+t.unit+' calendario contados desde el '+LM.fmt(start)+' → '+LM.fmt(end)+'.');
    // El término por meses/años vence el mismo día del mes; si es inhábil se corre al siguiente hábil (art. 62 Ley 4 de 1913 / art. 118 CGP)
    if(!LM.isHabil(end)){ const n2=LM.nextHabil(end); steps.push(LM.fmt(end)+' no es hábil ('+LM.dayInfo(end).why+'); se traslada al '+LM.fmt(n2)+'.'); end=n2; } }
  return {end,steps,habilesRestantes: LM.today()<=LM.parse(end)?LM.habilesEntre(LM.iso(LM.today()),end):0};
};

/* ---- Radicado de 23 dígitos (estructura de la Rama Judicial) ---- */
const DEPTOS={'05':'Antioquia','08':'Atlántico','11':'Bogotá D.C.','13':'Bolívar','15':'Boyacá','17':'Caldas','18':'Caquetá','19':'Cauca','20':'Cesar','23':'Córdoba','25':'Cundinamarca','27':'Chocó','41':'Huila','44':'La Guajira','47':'Magdalena','50':'Meta','52':'Nariño','54':'Norte de Santander','63':'Quindío','66':'Risaralda','68':'Santander','70':'Sucre','73':'Tolima','76':'Valle del Cauca','81':'Arauca','85':'Casanare','86':'Putumayo','88':'San Andrés','91':'Amazonas','94':'Guainía','95':'Guaviare','97':'Vaupés','99':'Vichada'};
const MUNIS={'11001':'Bogotá D.C.','15001':'Tunja','15238':'Duitama','15759':'Sogamoso','15176':'Chiquinquirá','25307':'Girardot','25899':'Zipaquirá','25269':'Facatativá','25754':'Soacha','05001':'Medellín','76001':'Cali','08001':'Barranquilla','68001':'Bucaramanga'};
const ENTIDAD={'03':'Consejo de Estado','23':'Tribunal Administrativo','33':'Juzgado Administrativo','31':'Juzgado del Circuito','40':'Juzgado Municipal','22':'Tribunal Superior','02':'Corte Constitucional'};
const ESPEC={'33':'Contencioso administrativo','15':'Consejo de Estado – asuntos constitucionales / Sala Plena','24':'Consejo de Estado – Sección Primera','25':'Consejo de Estado – Sección Segunda','26':'Consejo de Estado – Sección Tercera','27':'Consejo de Estado – Sección Cuarta','28':'Consejo de Estado – Sección Quinta','05':'Laboral','03':'Civil','04':'Penal','10':'Familia'};
const SECCION={'1':'Sección Primera','2':'Sección Segunda','3':'Sección Tercera','4':'Sección Cuarta','5':'Sección Quinta'};
LM.parseRadicado = function(raw){
  const r = String(raw||'').replace(/\D/g,'');
  const errors=[];
  if(r.length!==23) errors.push('Debe tener exactamente 23 dígitos (tiene '+r.length+').');
  if(errors.length) return {ok:false,errors,clean:r};
  const p={depto:r.slice(0,2),municipio:r.slice(0,5),entidad:r.slice(5,7),especialidad:r.slice(7,9),despacho:r.slice(9,12),anio:r.slice(12,16),consecutivo:r.slice(16,21),instancia:r.slice(21,23)};
  if(!DEPTOS[p.depto]) errors.push('Código de departamento '+p.depto+' no reconocido (DIVIPOLA).');
  const y=+p.anio, cy=LM.today().getFullYear(); if(y<1990||y>cy) errors.push('Año de radicación '+p.anio+' fuera de rango (1990–'+cy+').');
  if(p.consecutivo==='00000') errors.push('El consecutivo no puede ser 00000.');
  if(!ENTIDAD[p.entidad]) errors.push('Código de entidad '+p.entidad+' no está en el catálogo de la maqueta.');
  const labels={depto:DEPTOS[p.depto]||'¿?',municipio:MUNIS[p.municipio]||'Municipio '+p.municipio.slice(2),entidad:ENTIDAD[p.entidad]||'¿?',especialidad:ESPEC[p.especialidad]||'Código '+p.especialidad,
    despacho:+p.despacho===0?'Despacho 000 (reparto de corporación)':'Despacho '+(+p.despacho),anio:p.anio,consecutivo:String(+p.consecutivo),instancia:p.instancia==='00'?'Primera / única instancia':'Instancia '+p.instancia};
  return {ok:errors.length===0,errors,clean:r,parts:p,labels,formatted:[r.slice(0,5),r.slice(5,7),r.slice(7,9),r.slice(9,12),r.slice(12,16),r.slice(16,21),r.slice(21)].join('-')};
};
LM.fmtRad = r => { r=String(r||'').replace(/\D/g,''); return r.length===23?[r.slice(0,5),r.slice(5,7),r.slice(7,9),r.slice(9,12),r.slice(12,16),r.slice(16,21),r.slice(21)].join('-'):r; };

/* ---- Almacenamiento: localStorage (datos) + IndexedDB (archivos adjuntos) ---- */
const KEY='lexmonitor.v1';
LM.save = function(){ try{ localStorage.setItem(KEY,JSON.stringify(LM.state)); }catch(e){ LM.toast && LM.toast('No se pudo guardar: '+e.message); }
  try{ if(window.LexShared&&LM.state) LexShared.syncFromLex(LM.state); }catch(e){ console.warn('Sincronización con portal: '+e.message); } };
LM.load = function(){ try{ const s=localStorage.getItem(KEY); return s?JSON.parse(s):null; }catch(e){ return null; } };
LM.reset = function(){ LM.state = LM.demoData(); LM.save(); };
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise((res,rej)=>{ if(!window.indexedDB) return rej(new Error('Sin IndexedDB'));
  const q=indexedDB.open('lexmonitor-files',1); q.onupgradeneeded=()=>q.result.createObjectStore('files'); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); return dbp; }
LM.filePut = async (id,blob)=>{ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction('files','readwrite'); t.objectStore('files').put(blob,id); t.oncomplete=res; t.onerror=()=>rej(t.error); }); };
LM.fileGet = async id=>{ const d=await db(); return new Promise((res,rej)=>{ const q=d.transaction('files').objectStore('files').get(id); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); }); };
LM.fileDel = async id=>{ const d=await db(); return new Promise(res=>{ const t=d.transaction('files','readwrite'); t.objectStore('files').delete(id); t.oncomplete=res; }); };
if(window.LexShared){ LM.filePut=(id,b)=>LexShared.filePut(id,b); LM.fileGet=id=>LexShared.fileGet(id); }
LM.download = function(name,content,type){ const b=content instanceof Blob?content:new Blob([content],{type:type||'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); };
})();
