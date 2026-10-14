/* Datos de demostración 100% FICTICIOS. Fechas relativas a hoy para que la demo siempre tenga alertas vigentes. */
(function(){
const LM=window.LM;
LM.demoData=function(){
  const T=LM.today(); const D=n=>LM.iso(LM.addDays(T,n));
  const clientes=[
    {id:'c1',nombre:'Inversiones Alto Ricaurte S.A.S. (ficticio)',tipo:'Persona jurídica',doc:'NIT 900.000.001-0',email:'gerencia@ejemplo-altoricaurte.test',tel:'300 000 0001',ciudad:'Tunja'},
    {id:'c2',nombre:'Mariela Toquica Fonseca (ficticia)',tipo:'Persona natural',doc:'C.C. 00.000.002',email:'mariela.t@ejemplo.test',tel:'300 000 0002',ciudad:'Duitama'},
    {id:'c3',nombre:'Consorcio Vías del Sugamuxi (ficticio)',tipo:'Consorcio',doc:'NIT 900.000.003-1',email:'contacto@ejemplo-sugamuxi.test',tel:'300 000 0003',ciudad:'Sogamoso'},
    {id:'c4',nombre:'Familia Rincón Ávila (ficticia)',tipo:'Grupo familiar',doc:'C.C. 00.000.004 y otros',email:'rincon.avila@ejemplo.test',tel:'300 000 0004',ciudad:'Chiquinquirá'},
    {id:'c5',nombre:'Hernán Pulido Suesca (ficticio)',tipo:'Persona natural',doc:'C.C. 00.000.005',email:'hpulido@ejemplo.test',tel:'300 000 0005',ciudad:'Bogotá D.C.'},
    {id:'c6',nombre:'Cooperativa Agraria del Valle de Tenza (ficticia)',tipo:'Persona jurídica',doc:'NIT 900.000.006-2',email:'juridica@ejemplo-tenza.test',tel:'300 000 0006',ciudad:'Garagoa'}
  ];
  const A=(dias,tipo,titulo,detalle,extra)=>Object.assign({id:LM.uid(),fecha:D(dias),tipo,titulo,detalle,fuente:'SAMAI (simulado)'},extra||{});
  const procesos=[
   {id:'p1',radicado:'15001233300020250012300',medio:'Nulidad y restablecimiento del derecho',despacho:'Tribunal Administrativo de Boyacá – Sala de Decisión',ponente:'Magistrado(a) ponente ficticio(a) N.º 3',clienteId:'c1',demandante:'Inversiones Alto Ricaurte S.A.S. (ficticio)',demandado:'Municipio ficticio de San Ricaurte',estado:'Activo',etapa:'Contestación de la demanda',cuantia:185000000,fechaHecho:D(-260),
    resumen:'Nulidad de la resolución que impuso multa por supuesta infracción urbanística y restablecimiento (devolución de lo pagado).',
    actuaciones:[A(-200,'radicacion','Radicación de la demanda','Reparto al despacho 000 del Tribunal.'),A(-160,'providencia','Auto admite demanda','Se ordena notificar a la entidad y al Ministerio Público.'),A(-150,'notificacion','Notificación electrónica a la entidad','Mensaje enviado al buzón judicial de la entidad.'),A(-40,'memorial','Contestación de la demanda','La entidad propone excepciones de caducidad y falta de legitimación.'),A(-5,'providencia','Auto fija fecha de audiencia inicial','Audiencia inicial (art. 180 CPACA).')],
    eventos:[{id:'e1',fecha:D(9),tipo:'audiencia',titulo:'Audiencia inicial (art. 180 CPACA)',hora:'09:00',preparada:false}]},
   {id:'p2',radicado:'15001333300220240034500',medio:'Reparación directa',despacho:'Juzgado 2.º Administrativo del Circuito de Tunja',ponente:'Juez(a) ficticio(a)',clienteId:'c4',demandante:'Familia Rincón Ávila (ficticia)',demandado:'Departamento ficticio de Altoandes – Secretaría de Infraestructura',estado:'Activo',etapa:'Pruebas',cuantia:420000000,fechaHecho:D(-700),
    resumen:'Daños por accidente en vía departamental sin señalización (hechos ficticios).',
    actuaciones:[A(-480,'radicacion','Radicación de la demanda',''),A(-430,'providencia','Admite demanda',''),A(-300,'memorial','Contestación',''),A(-120,'audiencia','Audiencia inicial','Se decretan pruebas: dictamen pericial y testimonios.'),A(-95,'memorial','Aporte de dictamen pericial','')],
    eventos:[{id:'e2',fecha:D(2),tipo:'vencimiento',titulo:'Vence término para objetar dictamen contrario',preparada:true},{id:'e3',fecha:D(21),tipo:'audiencia',titulo:'Audiencia de pruebas (art. 181)',hora:'14:30',preparada:false}]},
   {id:'p3',radicado:'25000233600020230098700',medio:'Controversias contractuales',despacho:'Tribunal Administrativo de Cundinamarca – Sección Tercera',ponente:'Magistrado(a) ficticio(a) Subsección B',clienteId:'c3',demandante:'Consorcio Vías del Sugamuxi (ficticio)',demandado:'Instituto ficticio de Vías Regionales',estado:'Activo',etapa:'Alegatos',cuantia:2350000000,fechaHecho:D(-1100),
    resumen:'Desequilibrio económico del contrato de obra y liquidación unilateral.',
    actuaciones:[A(-900,'radicacion','Radicación',''),A(-850,'providencia','Admisión',''),A(-600,'audiencia','Audiencia inicial',''),A(-420,'audiencia','Audiencia de pruebas',''),A(-220,'providencia','Corre traslado para alegar','')],
    eventos:[]},
   {id:'p4',radicado:'11001032800020260004500',medio:'Nulidad electoral',despacho:'Consejo de Estado – Sección Quinta',ponente:'Consejero(a) ficticio(a)',clienteId:'c5',demandante:'Hernán Pulido Suesca (ficticio)',demandado:'Acto de elección ficticio – Concejo Municipal',estado:'Activo',etapa:'Admisión',cuantia:0,fechaHecho:D(-35),
    resumen:'Nulidad del acto de elección de personero por presunta irregularidad en el concurso (ficticio).',
    actuaciones:[A(-20,'radicacion','Radicación de la demanda',''),A(-1,'providencia','Auto inadmite demanda','Concede 3 días para corregir.')],
    eventos:[{id:'e4',fecha:LM.addHabiles(D(-1),3),tipo:'vencimiento',titulo:'Vence término para corregir la demanda',preparada:false}]},
   {id:'p5',radicado:'15238400300120260021800',medio:'Acción de tutela',despacho:'Juzgado 1.º Civil Municipal de Duitama (tutela)',ponente:'Juez(a) ficticio(a)',clienteId:'c2',demandante:'Mariela Toquica Fonseca (ficticia)',demandado:'EPS ficticia Salud Andina',estado:'Activo',etapa:'Fallo de primera instancia',cuantia:0,fechaHecho:D(-25),
    resumen:'Tutela por negación de procedimiento médico. Fallo desfavorable; evaluar impugnación.',
    actuaciones:[A(-14,'radicacion','Radicación de la tutela',''),A(-13,'providencia','Admite y vincula',''),A(-2,'providencia','Fallo niega amparo',''),A(-1,'notificacion','Notificación del fallo por correo','')],
    eventos:[{id:'e5',fecha:LM.addHabiles(D(-1),3),tipo:'vencimiento',titulo:'Vence término para impugnar fallo de tutela',preparada:false}]},
   {id:'p6',radicado:'15001333300520220011200',medio:'Nulidad y restablecimiento del derecho',despacho:'Juzgado 5.º Administrativo del Circuito de Tunja',ponente:'Juez(a) ficticio(a)',clienteId:'c2',demandante:'Mariela Toquica Fonseca (ficticia)',demandado:'Entidad territorial ficticia – Fondo de prestaciones',estado:'Activo',etapa:'Sentencia de primera instancia',cuantia:68000000,fechaHecho:D(-1500),
    resumen:'Reliquidación de pensión (laboral administrativo). Sin movimiento reciente.',
    actuaciones:[A(-1200,'radicacion','Radicación',''),A(-1150,'providencia','Admite',''),A(-900,'audiencia','Audiencia inicial',''),A(-260,'providencia','Al despacho para sentencia','')],
    eventos:[]},
   {id:'p7',radicado:'15759333300120250007800',medio:'Reparación directa',despacho:'Juzgado 1.º Administrativo de Sogamoso',ponente:'Juez(a) ficticio(a)',clienteId:'c6',demandante:'Cooperativa Agraria del Valle de Tenza (ficticia)',demandado:'Nación ficticia – Ministerio de Infraestructura Rural',estado:'Pre-demanda',etapa:'Conciliación extrajudicial',cuantia:310000000,fechaHecho:D(-700),
    resumen:'Pérdida de cosechas por obra pública. Pendiente radicar demanda; revisar caducidad (2 años).',
    actuaciones:[A(-90,'memorial','Solicitud de conciliación extrajudicial','Procuraduría delegada (ficticia).'),A(-30,'audiencia','Audiencia de conciliación fallida','Se expide constancia.')],
    eventos:[]},
   {id:'p8',radicado:'25000234100020240055500',medio:'Nulidad y restablecimiento del derecho',despacho:'Tribunal Administrativo de Cundinamarca – Sección Primera',ponente:'Magistrado(a) ficticio(a)',clienteId:'c1',demandante:'Inversiones Alto Ricaurte S.A.S. (ficticio)',demandado:'Superintendencia ficticia de Comercio Regional',estado:'Activo',etapa:'Apelación',cuantia:95000000,fechaHecho:D(-800),
    resumen:'Sanción administrativa. Sentencia de primera instancia parcialmente favorable.',
    actuaciones:[A(-640,'radicacion','Radicación',''),A(-600,'providencia','Admite',''),A(-60,'providencia','Sentencia de primera instancia','Accede parcialmente.'),A(-75,'audiencia','Audiencia de alegatos y juzgamiento','Registrada después de la sentencia (posible error de carga).'),A(-50,'memorial','Recurso de apelación','')],
    eventos:[]},
   {id:'p9',radicado:'15001233300020219999',medio:'Nulidad simple',despacho:'Tribunal Administrativo de Boyacá',ponente:'—',clienteId:'c6',demandante:'Cooperativa Agraria del Valle de Tenza (ficticia)',demandado:'Corporación ficticia ambiental regional',estado:'Activo',etapa:'Admisión',cuantia:0,fechaHecho:D(-400),
    resumen:'Nulidad de acuerdo ambiental. Radicado cargado incompleto (ejemplo para el asistente).',
    actuaciones:[A(-45,'radicacion','Radicación','')],eventos:[]},
   {id:'p10',radicado:'11001032500020250031000',medio:'Nulidad y restablecimiento del derecho',despacho:'Consejo de Estado – Sección Segunda',ponente:'Consejero(a) ficticio(a)',clienteId:'c5',demandante:'Hernán Pulido Suesca (ficticio)',demandado:'Entidad nacional ficticia de Servicio Civil',estado:'Terminado',etapa:'Archivo',cuantia:52000000,fechaHecho:D(-1300),
    resumen:'Proceso terminado con sentencia favorable ejecutoriada.',
    actuaciones:[A(-1000,'radicacion','Radicación',''),A(-300,'providencia','Sentencia favorable',''),A(-240,'providencia','Constancia de ejecutoria',''),A(-200,'providencia','Archivo','')],eventos:[]}
  ];
  procesos.forEach(p=>{p.ficticio=true;p.documentos=[];p.notas='';});
  const alertas=[
   {id:'a1',fecha:D(0)+'T07:05',procesoId:'p4',titulo:'Nueva actuación: Auto inadmite demanda',texto:'El despacho inadmitió la demanda y concedió 3 días para corregir.',leida:false,nivel:'alta'},
   {id:'a2',fecha:D(0)+'T07:05',procesoId:'p5',titulo:'Notificación de fallo de tutela',texto:'Fallo niega amparo. Corre término de impugnación.',leida:false,nivel:'alta'},
   {id:'a3',fecha:D(-5)+'T12:00',procesoId:'p1',titulo:'Auto fija fecha de audiencia inicial',texto:'Audiencia inicial programada.',leida:false,nivel:'media'},
   {id:'a4',fecha:D(-40)+'T12:00',procesoId:'p1',titulo:'Contestación de la demanda registrada',texto:'La entidad propuso excepciones.',leida:true,nivel:'baja'}
  ];
  return {version:1,config:{appName:'LexMonitor',firma:'Firma de abogados (nombre por definir)',abogado:'Abogado(a) titular',tp:'T.P. 000.000 (ficticia)',email:'notificaciones@firma-ejemplo.test',ciudad:'Tunja',theme:'auto',canales:{email:true,whatsapp:true,push:false},horario:{inicio:'07:00',fin:'19:00',frecuencia:3,diasHabiles:true},vacIni:'12-20',vacFin:'01-10',vacSanta:true,inactividadDias:180},
    clientes,procesos,alertas,simLog:[],createdAt:new Date().toISOString()};
};
})();
