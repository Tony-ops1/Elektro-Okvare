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
  var title=d.kind==='TP'?'POROČILO O NEGI IN OKVARI TP':d.kind==='NNO'?'POROČILO O NEGI IN OKVARI NNO':'POROČILO O NEGI IN OKVARI SN DALJNOVODOV IN KABLOVODOV';
  var code=d.kind==='TP'?'OB24 DN036 NA329 01':d.kind==='NNO'?'OB28 DN036 NA329 01':'OB21 DN036 NA329 01';
  var group=d.kind==='SN'?'':'<div>SKUPINA '+E(d.group)+'</div>';
  return '<!doctype html><html lang="sl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+E(title)+'</title>'+
  '<style>'+
  '@page{size:A4;margin:0}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11pt}.eopr-bar{position:sticky;top:0;background:#0b3a63;color:#fff;padding:10px;display:flex;gap:12px;align-items:center;justify-content:center}.eopr-bar button{border:0;border-radius:8px;padding:10px 18px;font-weight:bold;background:#fff;color:#0b3a63}.eopr-page{width:210mm;min-height:297mm;padding:12mm 14mm;margin:0 auto;background:#fff}.eopr-head{display:grid;grid-template-columns:27% 40% 33%;border:1px solid #666;min-height:20mm;font-size:9pt}.eopr-head>div{padding:4px 6px;border-right:1px solid #666}.eopr-head>div:last-child{border-right:0}.eopr-logo{display:flex;align-items:center;justify-content:center;gap:4px;color:#444}.eopr-logo b{font-size:30px;font-style:italic;color:#cf2045}.eopr-topmeta{display:flex;justify-content:space-between;gap:10px;margin-top:6mm;font-size:10pt;line-height:1.55}.eopr-title{font-size:14pt;font-weight:800;text-align:center;margin:7mm 0 4mm}.eopr-page p{margin:3.5mm 0;line-height:1.6}.eopr-dot{display:inline-block;min-width:20mm;padding:0 3px;border-bottom:1px dotted #666;overflow-wrap:anywhere;vertical-align:baseline}.eopr-area{margin-top:5mm;break-inside:avoid}.eopr-area>b{font-size:10.5pt}.eopr-content{min-height:18mm;margin-top:8px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;border-bottom:1px dotted #999}.eopr-line{height:7mm;border-bottom:1px dotted #999}.eopr-bottom{display:flex;justify-content:space-between;margin-top:15mm;font-size:10pt;gap:16px}.eopr-small{font-size:8pt}.eopr-sign{min-width:45mm;text-align:center;border-top:1px dotted #777;padding-top:3px}@media print{body{margin:0}.eopr-bar{display:none!important}.eopr-page{margin:0;width:210mm;min-height:297mm;box-shadow:none;padding:12mm 14mm}button{display:none}}@media screen{body{background:#cbd4db}.eopr-page{box-shadow:0 8px 30px #0003}@media(max-width:820px){.eopr-page{width:100%;min-height:0;padding:15px}.eopr-head{font-size:8pt}}}'+
  '</style></head><body>'+
  '<div class="eopr-bar">Predogled poročila <button onclick="window.print()">Natisni / Shrani kot PDF</button></div>'+
  '<article class="eopr-page">'+
  '<div class="eopr-head"><div class="eopr-logo"><b>ϟ</b><span>Elektro Ljubljana</span></div>'+
  '<div>Naziv dokumenta:<br><b>'+E(title)+'</b></div>'+
  '<div>Šifra: <b>'+E(code)+'</b><br>Stran: 1 od 1<br>Izvod št.:</div></div>'+
  '<div class="eopr-topmeta"><div>OE '+E(d.kind==='SN'?d.area:'')+'<br>DE '+E(d.area)+'<br>'+group+'</div>'+
  '<div>'+ (d.kind==='SN'?'':'LETO '+E((d.date||'').slice(0,4))+'<br>')+'LIST 1</div></div>'+
  details(d)+
  '<div class="eopr-bottom"><div>Novo mesto, dne '+dot(dateSl(d.date))+'</div><div class="eopr-sign">'+E(d.responsible)+'<br><span class="eopr-small">podpis odgovorne osebe</span></div></div>'+
  '</article></body></html>';
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