/* Poročila okvar – NNO, TP in skupni SN (DV/KB). Ne posega v bazo okvar. */
(function(){
'use strict';
var root=null,issue=null,data=null;
var STORE='elektro-okvare-porocilo-v1:';
var KINDS={NNO:'NNO – nizkonapetostno omrežje',TP:'TP – transformatorska postaja',SN:'SN – daljnovod / kablovod'};
function E(s){return String(s===null||s===undefined?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function val(v){return String(v===null||v===undefined?'':v)}
function datePart(v){if(!v)return '';var d=new Date(v);if(!isFinite(d.getTime()))return '';return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function timePart(v){if(!v)return '';var d=new Date(v);return isFinite(d.getTime())?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):''}
function dateSl(v){if(!v)return '';var p=v.split('-');return p.length===3?p[2]+'. '+p[1]+'. '+p[0]:v}
function isNNO(name){return /^NNO(\s|$)/i.test(name)}
function guessKind(x){
  var type=val(x.type).toLowerCase(),name=val(x.assetName).toLowerCase();
  if(isNNO(x.assetName)||/\b(nno|nn omrežje|nizkonapetost)/i.test(type))return 'NNO';
  if(/\b(daljnovod|sn vod|sno|dv\/kb|20\s*kv|srednjenapetost)/i.test(type+' '+name)||/^(dv|kb|sn)(\s|[-\/])/i.test(name))return 'SN';
  if(/\btp\b/i.test(type)||/^tp(\s|$)/i.test(name)||/transformatorsk/i.test(type))return 'TP';
  return 'NNO';
}
function defaults(x){
  var name=val(x.assetName),kind=guessKind(x);
  var tpName=name.replace(/^NNO\s+/i,'');
  return {
    kind:kind,date:datePart(x.reportedAt)||datePart(new Date()),from:timePart(x.reportedAt),
    to:timePart(x.resolvedAt),reason:'odprava',area:'Novo mesto',group:'RV Novo mesto',
    tp:kind==='SN'?'':tpName,asset:name,assetCode:val(x.assetCode),
    location:val(x.locationAddress),outlet:'',scope:'cel',sectionFrom:'',sectionTo:'',
    medium: /^KB[\s\/-]/i.test(name)?'KB':'DV',voltage:'20',orderNo:'',
    fault:val(x.faultDetail)||val(x.type),cause:'',
    description:val(x.description),suggestions:'',measures:'',
    responsible:val(x.assignedTo)||val(x.reportedBy),
    notes:val(x.notes)
  };
}
function st(name){return val(data[name])}
function input(label,key,type,extra){
  return '<label class="eor-field"><span>'+E(label)+'</span><input data-eor="'+E(key)+'" type="'+(type||'text')+'" value="'+E(st(key))+'" '+(extra||'')+'></label>';
}
function textarea(label,key){return '<label class="eor-field eor-full"><span>'+E(label)+'</span><textarea data-eor="'+E(key)+'" rows="3">'+E(st(key))+'</textarea></label>'}
function select(label,key,options){return '<label class="eor-field"><span>'+E(label)+'</span><select data-eor="'+E(key)+'">'+options.map(function(o){return '<option value="'+E(o[0])+'"'+(st(key)===o[0]?' selected':'')+'>'+E(o[1])+'</option>'}).join('')+'</select></label>'}
function updateFields(){
  var common=input('Datum motnje','date','date')+input('Od (ura)','from','time')+input('Do (ura)','to','time')+
    select('Vrsta dela','reason',[['odprava','Odprava okvare'],['nega','Nega']])+
    input('DE','area')+input('Skupina','group');
  var subtype='';
  if(data.kind==='NNO'){
    subtype=input('TP – priključeno omrežje','tp')+input('Naziv izvoda','outlet')+
      select('Obseg','scope',[['cel','Cel vod'],['odsek','Odsek voda']])+
      input('Na odseku od','sectionFrom')+input('Na odseku do','sectionTo')+
      input('Vrsta okvare','fault')+input('Vzrok okvare','cause');
  }else if(data.kind==='TP'){
    subtype=input('Naziv TP','tp')+input('Kraj / lokacija TP','location')+
      input('Vrsta okvare','fault')+input('Vzrok okvare','cause');
  }else{
    subtype=select('Vrsta voda','medium',[['DV','Daljnovod (DV)'],['KB','Kablovod (KB)']])+
      input('Naziv voda','asset')+input('Napetost (kV)','voltage')+
      select('Obseg','scope',[['cel','Cel vod'],['odsek','Odsek voda']])+
      input('Na odseku od','sectionFrom')+input('Na odseku do','sectionTo');
  }
  var tail=input('Delovni nalog za varno delo št. (če obstaja)','orderNo')+
      textarea('Kratek opis vzroka okvare in posledic','description')+
      textarea('Predlogi','suggestions')+
      textarea('Izvedeni ukrepi','measures')+
      input('Odgovorna oseba / podpis','responsible');
  document.getElementById('eor-fields').innerHTML=common+subtype+tail;
}
function collect(){
  if(!root)return;
  root.querySelectorAll('[data-eor]').forEach(function(e){data[e.dataset.eor]=e.value});
}
function style(){
var css=[
'#eor-root{position:fixed;inset:0;z-index:200000;background:rgba(4,26,43,.72);display:none;align-items:center;justify-content:center;padding:12px;font-family:Arial,sans-serif;color:#142c3d}',
'#eor-root.eor-open{display:flex}',
'#eor-root .eor-dialog{background:#fff;border-radius:16px;width:min(850px,100%);max-height:95dvh;overflow:auto;box-shadow:0 24px 65px #0005}',
'#eor-root .eor-top{display:flex;align-items:center;gap:10px;justify-content:space-between;background:#0b3a63;color:#fff;padding:14px 18px;position:sticky;top:0;z-index:2}',
'#eor-root .eor-top h2{font-size:18px;margin:0}',
'#eor-root .eor-content{padding:16px 18px}',
'#eor-root .eor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
'#eor-root .eor-field{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;min-width:0}',
'#eor-root .eor-field input,#eor-root .eor-field select,#eor-root .eor-field textarea{box-sizing:border-box;width:100%;min-width:0;border:1px solid #c7d6e0;border-radius:8px;padding:10px;background:#fff;color:#132c3e;font:15px Arial,sans-serif;min-height:41px}',
'#eor-root .eor-field textarea{resize:vertical;line-height:1.4}',
'#eor-root .eor-full{grid-column:1/-1}',
'#eor-root .eor-info{margin:12px 0;padding:12px;border-radius:9px;background:#eff5f9;font-size:13px;line-height:1.55}',
'#eor-root .eor-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;border-top:1px solid #dce5eb;margin-top:15px;padding-top:14px}',
'#eor-root .eor-btn{border:0;border-radius:8px;padding:11px 15px;background:#e8f0f5;color:#0b3a63;font-weight:800;cursor:pointer}',
'#eor-root .eor-btn.eor-primary{background:#0b3a63;color:#fff}',
'@media(max-width:620px){#eor-root{padding:0}#eor-root .eor-dialog{border-radius:0;max-height:100dvh;height:100dvh}#eor-root .eor-grid{grid-template-columns:1fr}#eor-root .eor-content{padding:12px}#eor-root .eor-top{padding:12px}}'
].join('\n');
var node=document.createElement('style');node.textContent=css;document.head.appendChild(node);
}
function ensure(){
  if(root)return;
  style();
  root=document.createElement('div');root.id='eor-root';
  root.innerHTML='<div class="eor-dialog" role="dialog" aria-modal="true" aria-label="Poročilo o okvari">'+
  '<div class="eor-top"><h2>📄 Poročilo o negi in okvari</h2><button class="eor-btn" id="eor-close" type="button">Zapri ✕</button></div>'+
  '<div class="eor-content">'+
  '<div class="eor-info"><b id="eor-issue"></b><div>Polja iz obstoječe okvare so predizpolnjena. Manjkajoče podatke dopolni pred izvozom. Poročila so oblikovana po vzorcih Elektro Ljubljana.</div></div>'+
  '<label class="eor-field" style="margin:0 0 14px"><span>Obrazec</span><select id="eor-kind">'+
  Object.keys(KINDS).map(function(k){return '<option value="'+k+'">'+E(KINDS[k])+'</option>'}).join('')+
  '</select></label><div class="eor-grid" id="eor-fields"></div>'+
  '<div class="eor-info">Osnutek lahko shraniš v brskalnik te naprave. Ne shrani se v skupno bazo Supabase in ni viden na drugih napravah.</div>'+
  '<div class="eor-actions"><button class="eor-btn" id="eor-draft" type="button">💾 Shrani osnutek</button>'+
  '<button class="eor-btn eor-primary" id="eor-print" type="button">📄 Predogled / PDF / tisk</button></div>'+
  '</div></div>';
  document.body.appendChild(root);
  document.getElementById('eor-close').onclick=close;
  document.getElementById('eor-kind').onchange=function(){collect();data.kind=this.value;updateFields()};
  document.getElementById('eor-draft').onclick=function(){
    collect();
    try{localStorage.setItem(STORE+issue.id,JSON.stringify(data));alert('Osnutek je shranjen v tem brskalniku.')}catch(e){alert('Shranjevanje ni uspelo: '+e.message)}
  };
  document.getElementById('eor-print').onclick=function(){collect();preview()};
  root.addEventListener('click',function(e){if(e.target===root)close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&root.classList.contains('eor-open'))close()});
}
function open(x){
  if(!x||!x.id)return;
  ensure();
  issue=x;data=defaults(x);
  try{
    var saved=JSON.parse(localStorage.getItem(STORE+x.id)||'null');
    if(saved&&typeof saved==='object'){Object.keys(data).forEach(function(k){if(Object.prototype.hasOwnProperty.call(saved,k))data[k]=saved[k]})}
  }catch(e){}
  if(!KINDS[data.kind])data.kind=guessKind(x);
  document.getElementById('eor-issue').textContent='Okvara: '+(x.assetName||x.type||'')+' • '+(x.faultDetail||'');
  document.getElementById('eor-kind').value=data.kind;
  updateFields();
  root.classList.add('eor-open');
}
function close(){if(root){root.classList.remove('eor-open')}issue=null;data=null}
function dot(v){return '<span class="eopr-dot">'+(E(v)||'&nbsp;')+'</span>'}
function area(label,val){return '<div class="eopr-area"><b>'+label+':</b><div class="eopr-content">'+(E(val)||'&nbsp;')+'</div><div class="eopr-line"></div><div class="eopr-line"></div></div>'}
function details(d){
  var cause='',intro='',kind=d.kind,dim='';
  if(kind==='NNO'){
    intro='<div class="eopr-title">POROČILO O NEGI IN OKVARI NA NN VODU</div>'+
    '<p>Dne '+dot(dateSl(d.date))+' od '+dot(d.from)+' do '+dot(d.to)+' je bilo moteno zaradi '+dot(d.reason==='nega'?'nege':'odprave okvare')+'</p>'+
    '<p>nizkonapetostno omrežje, priključeno na TP '+dot(d.tp)+' /0,4 kV</p>'+
    '<p>Na izvodu (naziv) '+dot(d.outlet)+'</p>'+
    '<p>'+dot(d.scope==='cel'?'● cel vod / ○ na odseku':'○ cel vod / ● na odseku')+
    ' od '+dot(d.scope==='odsek'?d.sectionFrom:'')+' do '+dot(d.scope==='odsek'?d.sectionTo:'')+'</p>'+
    '<p>je prišlo do sledeče okvare:</p><p>vrsta '+dot(d.fault)+'</p><p>vzroka '+dot(d.cause)+'</p>';
  }else if(kind==='TP'){
    intro='<div class="eopr-title">POROČILO<br>O NEGI IN OKVARI NA TRANSFORMATORSKI POSTAJI</div>'+
    '<p>Dne '+dot(dateSl(d.date))+' od '+dot(d.from)+' do '+dot(d.to)+' je bila motena zaradi '+dot(d.reason==='nega'?'nege':'odprave okvare')+'</p>'+
    '<p>transformatorska postaja</p>'+
    '<p>TP 20/0,4 kV (na) '+dot(d.tp)+(d.location?' – '+dot(d.location):'')+'</p>'+
    '<p>V transformatorski postaji je prišlo do sledeče</p>'+
    '<p>vrste okvare '+dot(d.fault)+'</p><p>vzroka okvare '+dot(d.cause)+'</p>';
  }else{
    intro='<div class="eopr-title">POROČILO O NEGI IN OKVARI NA SN VODU</div>'+
    '<p>Dne '+dot(dateSl(d.date))+' od '+dot(d.from)+' do '+dot(d.to)+' je bil moten zaradi '+dot(d.reason==='nega'?'nege':'odprave okvare')+'</p>'+
    '<p>'+dot(d.medium)+' '+dot(d.voltage)+' kV '+dot(d.asset)+'</p>'+
    '<p>'+dot(d.scope==='cel'?'● cel vod / ○ na odseku':'○ cel vod / ● na odseku')+
    ' od '+dot(d.scope==='odsek'?d.sectionFrom:'')+' do '+dot(d.scope==='odsek'?d.sectionTo:'')+'</p>';
  }
  return intro+'<p>Dela so se izvajala po delovnem nalogu za varno delo št. '+dot(d.orderNo)+' (če je bil delovni nalog potreben)</p>'+
    area(kind==='SN'?'KRATEK OPIS VZROKA IN POSLEDIC':'KRATEK OPIS VZROKA OKVARE IN POSLEDIC',d.description)+
    area('PREDLOGI',d.suggestions)+area('IZVEDENI UKREPI',d.measures);
}

function reportHtml(d){
  // Natisnjena stran je položena v izvornem formatu A4 (595 × 842 točk).
  // Vse tri predloge se opirajo na natanko izvirne nazive, oznake in razporeditev.
  // Logotip je originalna PNG-slika, neposredno iz uporabnikovih PDF-jev.
  var k=d.kind==='TP'?'TP':d.kind==='SN'?'SN':'NNO';
  var originalLogo='data:image/png;base64,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';
  var parts=[];
  function elem(x,y,w,h,html,style){
    parts.push('<div style="position:absolute;left:'+x+'pt;top:'+y+'pt;width:'+w+'pt;'+
      (h?'height:'+h+'pt;':'')+(style||'')+'">'+html+'</div>');
  }
  function label(x,y,w,txt,opt){
    opt=opt||{};
    elem(x,y,w,opt.height||0,E(txt),'font-family:'+(opt.serif?'"Times New Roman",serif':'Arial,sans-serif')+
      ';font-size:'+(opt.size||11.5)+'pt;line-height:'+(opt.line||1.13)+';'+
      (opt.bold?'font-weight:700;':'')+(opt.center?'text-align:center;':''));
  }
  function line(x,y,w){elem(x,y,w,1,'','border-bottom:.6pt dotted #444;');}
  function entry(x,y,w,txt,opts){
    txt=String(txt||'').trim();if(!txt)return;
    opts=opts||{};
    var lines=txt.split('\n');
    elem(x,y,w,opts.height||0,E(txt).replace(/\n/g,'\n'),
      'font: '+(opts.bold?'bold ':'')+(opts.size||10.5)+'pt Arial,sans-serif;'+
      'line-height:'+(opts.line||1.35)+';white-space:pre-wrap;overflow-wrap:anywhere;'+
      (opts.white===false?'':'background:white;')+
      (opts.height?'overflow:hidden;':'') );
  }
  function boxHeading(y,txt){label(14.17,y,565,txt,{bold:true,size:12.49});}
  function section(y,txt,rows,content,contentHeight){
    boxHeading(y,txt);
    rows.forEach(function(z){line(14.17,z,566.6)});
    entry(17,y+25,560,content,{height:contentHeight||Math.max(45,(rows[rows.length-1]||y)-y-27),size:10.5,line:1.45,white:false});
  }
  function originalTop(kind){
    var code={NNO:'OB28 DN036 NA329 01',TP:'OB24 DN036 NA329 01',SN:'OB21 DN036 NA329 01'}[kind];
    var names={NNO:['POROČILO O NEGI IN OKVARI','NNO'],
               TP:['POROČILO O NEGI IN OKVARI TP'],
               SN:['POROČILO O NEGI IN OKVARI SN','DALJNOVODOV IN','KABLOVODOV']}[kind];
    elem(14.17,14.17,566,61,'','border:.65pt solid #333;');
    elem(138.5,14.17,.7,61,'','border-left:.7pt solid #333;');
    elem(382.5,14.17,.7,61,'','border-left:.7pt solid #333;');
    elem(18.75,kind==='SN'?27:26.25,115.5,39,
      '<img src="'+originalLogo+'" style="width:115.5pt;height:'+(kind==='SN'?39:38.25)+'pt;display:block" alt="Elektro Ljubljana">','');
    label(143.85,16.9,236,'Naziv dokumenta:',{serif:true,size:10.5});
    names.forEach(function(n,i){label(143.85,27.4+i*13.25,236,n,{serif:true,size:13,bold:true})});
    label(387,18.8,190,'Šifra: '+code,{serif:true,size:11,bold:true});
    label(387,33.5,180,'Stran: 1 od 1',{serif:true,size:11});
    label(387,48.2,170,'Izvod št.:',{serif:true,size:11});
    if(kind==='SN'){
      label(14.17,99,240,'OE Novo mesto',{size:11.5});
      label(14.17,121,240,'DE: Novo mesto',{size:11.5});
      label(471,99,110,'LIST  1',{size:11.5});
      line(42,113,160);line(43,135,156);line(509,114,55);
    }else{
      label(14.17,89.35,200,'OE',{size:11.5});
      label(14.17,105.84,250,kind==='TP'?'DE …Novo mesto':'DE Novo mesto',{size:11.5});
      label(14.17,122.34,300,kind==='TP'?'SKUPINA …RV Novo mesto':'SKUPINA RV Novo mesto',{size:11.5});
      label(473.4,89.34,90,'LETO',{size:11.5});
      label(473.4,105.1,90,'LIST  1',{size:11.5});
      line(506,102,59);line(515,120,51);
      entry(507,88,58,(d.date||'').slice(0,4),{size:10.5});
    }
  }
  function dateTime(y,formula){
    label(14.17,y,40,'Dne');
    line(39,y+12,142);
    label(formula==='SN'?203:189,y,25,'od');
    line(formula==='SN'?220:205,y+12,formula==='SN'?60:55);
    label(formula==='SN'?284:266,y,25,'do');
    line(formula==='SN'?300:280,y+12,formula==='SN'?46:58);
    label(formula==='SN'?319:298,y-2,32,'........');
    label(formula==='SN'?366:343,y,formula==='SN'?222:241,
      formula==='NNO'?'je bilo moteno zaradi • nege / • odprave okvare':
      formula==='TP'?'je bila motena zaradi • nege / • odprave okvare':
      'je bil moten zaradi • nege / • odprave okvare',{size:11.5});
    entry(40,y-1,138,dateSl(d.date),{size:10.5});
    entry(formula==='SN'?222:206,y-1,54,d.from,{size:10.5});
    entry(formula==='SN'?300:280,y-1,60,d.to,{size:10.5});
    // Izbira se samo označi. Izvirni besedili "nege / odprave okvare" ostaneta.
    var rx=(formula==='SN'?476:453)+(d.reason==='nega'?0:49);
    entry(rx,y-2,12,'✓',{size:10,bold:true,white:false});
  }
  originalTop(k);
  if(k==='NNO'){
    label(119,144,360,'POROČILO O NEGI IN OKVARI NA NN VODU',{size:16.99,bold:true,center:true});
    dateTime(178.6,'NNO');
    label(14.17,200,360,'nizkonapetostno omrežje, priključeno na');
    label(14.17,227.34,27,'TP');line(32,240,210);label(244,227.34,70,'/0,4 kV');line(314,240,267);
    entry(34,225.7,204,String(d.tp||'').replace(/^TP\s+/i,''),{size:10.5});
    label(14.17,253,112,'Na izvodu (naziv)');line(110,265.5,471);
    entry(111,252,469,d.outlet);
    label(14.17,275.3,152,'• cel vod / • na odseku od');line(148,288,260);
    label(415,275.3,23,'do');line(432,288,149);
    entry(148,274.2,258,d.scope==='odsek'?d.sectionFrom:'');
    entry(432,274.2,145,d.scope==='odsek'?d.sectionTo:'');
    entry(d.scope==='cel'?14.2:67,271.7,11,'✓',{white:false,size:10,bold:true});
    label(14.17,294,240,'je prišlo do sledeče okvare:');
    label(14.17,320,60,'vrsta');line(42,333,539);
    entry(43,318,534,d.fault,{size:10.5});
    label(14.17,344,70,'vzroka');line(50,356,531);
    entry(51,342,526,d.cause,{size:10.5});
    label(14.17,366,295,'Dela so se izvajala po delovnem nalogu za varno delo št.');
    line(305,379,95);label(404,366,184,'(če je bil delovni nalog potreben)');
    entry(306,364,91,d.orderNo,{size:10.5});
    section(383.94,'KRATEK OPIS VZROKA OKVARE IN POSLEDIC:',[437,460,483,506,529],d.description,128);
    section(545.19,'PREDLOGI:',[600,622,645,664],d.suggestions,94);
    section(684.69,'IZVEDENI UKREPI:',[734,756,778,800],d.measures,94);
  }else if(k==='TP'){
    label(252.3,142.1,91,'POROČILO',{size:16.99,bold:true});
    label(82,160,432,'O NEGI IN OKVARI NA TRANSFORMATORSKI POSTAJI',{size:16.99,bold:true});
    dateTime(189.84,'TP');
    label(14.17,211,340,'transformatorska postaja');
    label(14.17,235.6,159,'TP ....20............../0,4 kV (na)');
    line(169,249,412);line(14,270,567);
    entry(170,233,406,String(d.tp||'').replace(/^TP\s+/i,'')+(d.location?' – '+d.location:''),{size:10.5});
    label(14.17,280.59,295,'Dela so se izvajala po delovnem nalogu za varno delo št.');
    line(305,293,95);label(404,280.59,184,'(če je bil delovni nalog potreben)');
    entry(305,279,95,d.orderNo,{size:10.5});
    label(14.17,302,350,'V transformatorski postaji je prišlo do sledeče');
    label(14.17,329,90,'vrste okvare');line(91,342,490);
    entry(93,327,485,d.fault,{size:10.5});
    label(14.17,353,90,'vzroka okvare');line(90,365,491);
    entry(92,351,485,d.cause,{size:10.5});
    section(374.19,'KRATEK OPIS VZROKA OKVARE IN POSLEDIC:',[425,448,470,493,515],d.description,113);
    section(533.94,'PREDLOGI:',[586,610,633,656],d.suggestions,107);
    section(673.44,'IZVEDENI UKREPI:',[726,748,770,791],d.measures,109);
  }else{
    label(119,151,361,'POROČILO O NEGI IN OKVARI NA SN VODU',{size:16.99,bold:true,center:true});
    dateTime(197.34,'SN');
    label(14.17,215,75,'DV/KB');
    label(14.17,228,110,'....20.......... kV');
    line(96,240,485);
    entry(19,212,45,d.medium,{size:10.5});
    entry(90,227,482,d.asset.replace(/^(DV|KB)\s+/i,'')+(d.voltage&&d.voltage!=='20'?' ('+d.voltage+' kV)':''),{size:10.5});
    label(14.17,244.6,120,'• cel vod / • na');
    label(14.17,258,100,'odseku od');line(70,270,347);
    label(426,258,30,'do');line(443,270,138);
    entry(d.scope==='cel'?14.2:67,240,12,'✓',{size:10,bold:true,white:false});
    entry(71,256,340,d.scope==='odsek'?d.sectionFrom:'',{size:10.5});
    entry(444,256,135,d.scope==='odsek'?d.sectionTo:'',{size:10.5});
    label(14.17,280,295,'Dela so se izvajala po delovnem nalogu za varno delo št.');
    line(305,292.5,98);label(407,280,180,'(če je bil delovni nalog potreben)');
    entry(306,278,95,d.orderNo,{size:10.5});
    section(302.94,'KRATEK OPIS VZROKA IN POSLEDIC:',[356,378,402,425,448,470],d.description,153);
    section(488.94,'PREDLOGI:',[543,565,587,609,633],d.suggestions,139);
    section(654.69,'IZVEDENI UKREPI:',[706,730,753,777,792],d.measures,128);
  }
  label(14.17,815,230,k==='NNO'?'.......Novo mesto...................., dne':'....Novo mesto......................, dne',{size:11.5});
  line(k==='NNO'?202:199,828,151);
  entry(k==='NNO'?204:201,813,150,dateSl(d.date),{size:10.5});
  line(451,816,98);
  label(450,818,130,'podpis odgovorne osebe',{size:8.5});
  entry(451,796,128,d.responsible,{size:10.5});
  var code={NNO:'OB28',TP:'OB24',SN:'OB21'}[k];
  return '<!doctype html><html lang="sl"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Poročilo '+k+' '+E(d.date)+'</title>'+
    '<style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#dbe3ea;font-family:Arial,sans-serif;color:#080808}'+
    '.page{position:relative;width:595pt;height:842pt;margin:12pt auto;background:white;overflow:hidden;box-shadow:0 8px 24px #0003}'+
    '.controls{display:flex;justify-content:center;align-items:center;gap:12px;padding:12px;background:#0b3a63;color:white;font:14px Arial}'+
    '.controls button{background:white;color:#0b3a63;border:0;border-radius:7px;padding:10px 18px;font-weight:bold}'+
    '@media print{html,body{background:#fff;margin:0;padding:0}.controls{display:none}.page{margin:0;box-shadow:none;width:595pt;height:842pt;page-break-after:avoid}}'+
    '@media screen and (max-width:640px){.page{zoom:calc((100vw - 8px) / 793px);margin:0 4px;box-shadow:none;}}'+
    '</style></head><body><div class="controls">Izvirni obrazec '+code+' <button type="button" onclick="window.print()">Tisk / Shrani kot PDF</button></div>'+
    '<article class="page">'+parts.join('')+'</article></body></html>';
}
function preview(){
  if(!data||!issue)return;
  var win=window.open('','_blank');
  if(!win){alert('Brskalnik je preprečil novo okno. Dovoli pojavna okna in poskusi znova.');return}
  try{win.document.open();win.document.write(reportHtml(data));win.document.close();win.focus()}
  catch(e){try{win.close()}catch(_e){}alert('Predogled ni uspel: '+e.message)}
}
window.eoReportOpen=open;
})();