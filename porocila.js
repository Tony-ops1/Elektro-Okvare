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

function issueCoords(x){
  if(x.lat===null||x.lat===undefined||x.lat===''||x.lng===null||x.lng===undefined||x.lng==='')return null;
  var lat=Number(x.lat),lng=Number(x.lng);
  return isFinite(lat)&&isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0)?{lat:lat,lng:lng}:null;
}
function faultLocation(x){
  var coords=issueCoords(x);
  if(coords)return coords.lat.toFixed(6)+', '+coords.lng.toFixed(6);
  return val(x.locationAddress).trim();
}
function faultMapsUrl(x){
  var coords=issueCoords(x);
  if(!coords)return '';
  return 'https://www.google.com/maps/search/?api=1&query='+
    encodeURIComponent(coords.lat.toFixed(6)+','+coords.lng.toFixed(6));
}
// Slovenski ravninski koordinatni sistem D96/TM (EPSG:3794).
// Prvi rezultat je e (vzhod), drugi n (sever), oboje v metrih.
// Uporabljena je ista preslikava kot pri GURS zemljevidu v aplikaciji.
function gpsToD96(lon,lat){
  var a=6378137,f=1/298.257222101,k0=0.9999,E0=500000,N0=-5000000,lon0=15*Math.PI/180;
  var n=f/(2-f),A=a/(1+n)*(1+n*n/4+n*n*n*n/64);
  var alpha=[n/2-2*n*n/3+5*n*n*n/16,13*n*n/48-3*n*n*n/5,61*n*n*n/240];
  var e=Math.sqrt(2*f-f*f),ph=lat*Math.PI/180,la=lon*Math.PI/180-lon0;
  var t=Math.sinh(Math.atanh(Math.sin(ph))-e*Math.atanh(e*Math.sin(ph)));
  var xi=Math.atan2(t,Math.cos(la)),eta=Math.atanh(Math.sin(la)/Math.sqrt(1+t*t));
  var xs=xi,es=eta;
  for(var j=1;j<=3;j++){
    xs+=alpha[j-1]*Math.sin(2*j*xi)*Math.cosh(2*j*eta);
    es+=alpha[j-1]*Math.cos(2*j*xi)*Math.sinh(2*j*eta);
  }
  return {e:E0+k0*A*es,n:N0+k0*A*xs};
}
function faultXY(x){
  var coords=issueCoords(x);
  if(!coords)return '';
  var xy=gpsToD96(coords.lng,coords.lat);
  function m(v){return v.toFixed(2).replace('.',',')}
  // Uveljavljena oznaka X/Y: X = severna, Y = vzhodna;
  // uradni D96/TM oznaki koordinat sta n in e.
  return 'D96/TM: X (n) = '+m(xy.n)+' m; Y (e) = '+m(xy.e)+' m';
}
function withFaultLocation(description,location,xyText){
  var body=val(description).trim(),locationText=val(location).trim();
  if(!locationText)return body;
  var lines=body.split(/\r?\n/);
  if(/^Lokacija okvare\s*:/i.test(lines[0]||''))lines.shift();
  if(/^D96(?:-17)?\/TM\s*:/i.test(lines[0]||''))lines.shift();
  var header=['Lokacija okvare: '+locationText];
  if(xyText)header.push(xyText);
  return header.concat(lines.join('\n').trim()?lines.join('\n').trim():[]).join('\n');
}

function defaults(x){
  var name=val(x.assetName),kind=guessKind(x);
  var tpName=name.replace(/^NNO\s+/i,'');
  // Vzrok ni ločeno shranjen v okvari. Kratek opis lahko služi kot predizpolnjen
  // predlog vzroka; daljši opis ostane v rubriki za opis in posledice.
  var savedDescription=val(x.description).trim();
  var causeFromDescription=(savedDescription.length<=85&&!/[\r\n]/.test(savedDescription))?savedDescription:'';
  // Predlogi se predizpolnijo z izbrano napako/opravilo (npr. Posek).
  var faultFromIssue=val(x.faultDetail).trim()||val(x.type).trim();
  return {
    kind:kind,date:datePart(x.reportedAt)||datePart(new Date()),from:timePart(x.reportedAt),
    to:timePart(x.resolvedAt),reason:'odprava',area:'Novo mesto',group:'RV Novo mesto',
    tp:kind==='SN'?'':tpName,asset:name,assetCode:val(x.assetCode),
    location:val(x.locationAddress),gpsLat:issueCoords(x)?issueCoords(x).lat:'',gpsLng:issueCoords(x)?issueCoords(x).lng:'',outlet:'',scope:'cel',sectionFrom:'',sectionTo:'',
    medium: /^KB[\s\/-]/i.test(name)?'KB':'DV',voltage:'20',orderNo:'',
    fault:faultFromIssue,cause:causeFromDescription,
    description:withFaultLocation(x.description,faultLocation(x),faultXY(x)),suggestions:faultFromIssue,measures:'',
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
  var mapUrl=issue?faultMapsUrl(issue):'';
  var tail=input('Delovni nalog za varno delo št. (če obstaja)','orderNo')+
      textarea('Kratek opis vzroka okvare in posledic','description')+
      (mapUrl?'<div class="eor-full" style="margin-top:-5px;font-size:13px"><a href="'+E(mapUrl)+'" target="_blank" rel="noopener noreferrer" style="color:#0b3a63;font-weight:800">📍 Odpri točno lokacijo v Google Maps ↗</a></div>':'')+
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
    if(saved&&typeof saved==='object'){
      Object.keys(data).forEach(function(k){if(Object.prototype.hasOwnProperty.call(saved,k))data[k]=saved[k]});
      // Stari prazni osnutki naj prav tako prejmejo novo predizpolnitev.
      var proposed=defaults(x);
      if(!val(data.cause).trim())data.cause=proposed.cause;
      if(!val(data.suggestions).trim())data.suggestions=proposed.suggestions;
    }
  }catch(e){}
  if(!KINDS[data.kind])data.kind=guessKind(x);
  // Tudi stari osnutki prikažejo koordinate trenutne shranjene okvare.
  var coords=issueCoords(x);
  data.gpsLat=coords?coords.lat:'';
  data.gpsLng=coords?coords.lng:'';
  data.description=withFaultLocation(data.description,faultLocation(x),faultXY(x));
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

/* Izvirni obrazci uporabnika. PDF strani se ne prerisujejo:
   vse vrstice, pisave, logotip in glava so del originalnih PDF-jev. */
var pdfLoader=null,originalPdfCache={};
var PDF_TEMPLATES={
  NNO:'templates/Porocila_NNO.pdf.gz',
  TP:'templates/Porocila_TP.pdf.gz',
  SN:'templates/Porocila_SN.pdf.gz'
};
function importPDFLib(){
  if(window.PDFLib)return Promise.resolve(window.PDFLib);
  if(pdfLoader)return pdfLoader;
  var urls=['https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
            'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'];
  pdfLoader=new Promise(function(resolve,reject){
    function loadAt(i){
      if(i>=urls.length){reject(new Error('Knjižnice za PDF ni bilo mogoče naložiti. Preveri internetno povezavo.'));return}
      var s=document.createElement('script');s.src=urls[i];s.async=true;
      s.onload=function(){if(window.PDFLib)resolve(window.PDFLib);else loadAt(i+1)};
      s.onerror=function(){s.remove();loadAt(i+1)};
      document.head.appendChild(s);
    }
    loadAt(0);
  }).catch(function(err){pdfLoader=null;throw err});
  return pdfLoader;
}
async function fetchOriginalPDF(kind){
  if(originalPdfCache[kind])return originalPdfCache[kind].slice(0);
  var path=PDF_TEMPLATES[kind];if(!path)throw new Error('Neznana vrsta poročila');
  var r=await fetch(new URL(path,document.baseURI).href,{cache:'force-cache'});
  if(!r.ok)throw new Error('Izvirnega obrazca '+kind+' ni bilo mogoče naložiti ('+r.status+').');
  var packed=new Uint8Array(await r.arrayBuffer()),raw=packed;
  // Izvirne datoteke so brezizgubno stisnjene; brskalnik jih razširi lokalno.
  if(packed.length>2&&packed[0]===0x1f&&packed[1]===0x8b){
    if(typeof DecompressionStream==='undefined')throw new Error('Brskalnik ne podpira razširjanja PDF-predloge.');
    var stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    raw=new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if(raw[0]!==37||raw[1]!==80||raw[2]!==68||raw[3]!==70)
    throw new Error('Datoteka predloge '+kind+' ni veljaven PDF.');
  originalPdfCache[kind]=raw;
  return raw.slice(0);
}
function reportDate(v){
  if(!v)return '';
  var parts=String(v).split('-');
  return parts.length===3?parts[2]+'. '+parts[1]+'. '+parts[0]:String(v);
}
async function createOriginalReport(d){
  var lib=await importPDFLib();
  var bytes=await fetchOriginalPDF(d.kind);
  var doc=await lib.PDFDocument.load(bytes,{updateMetadata:false});
  if(doc.getPageCount()!==1)throw new Error('Predloga mora imeti natanko eno stran.');
  var page=doc.getPage(0),pageHeight=page.getHeight();

  // Unicode (č, š, ž) narišemo v prosojno plast. Predloga ostaja nespremenjena.
  async function place(x,top,width,height,value,size,opts){
    var str=String(value===null||value===undefined?'':value).trim();
    if(!str)return;
    opts=opts||{};
    var scale=3,canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.ceil(width*scale));
    canvas.height=Math.max(1,Math.ceil(height*scale));
    var ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Risanje besedila ni na voljo.');
    ctx.scale(scale,scale);
    ctx.fillStyle='#111111';
    ctx.textBaseline='top';
    ctx.font=(opts.bold?'bold ':'')+(size||10.5)+'px Arial, sans-serif';
    var lines=[],maxWidth=width-2;
    str.replace(/\r/g,'').split('\n').forEach(function(part){
      var words=part.split(/\s+/),line='';
      if(!part.trim()){lines.push('');return}
      words.forEach(function(word){
        var tryLine=line?line+' '+word:word;
        if(line&&ctx.measureText(tryLine).width>maxWidth){lines.push(line);line=word}
        else line=tryLine;
      });
      if(line)lines.push(line);
    });
    var lineHeight=(size||10.5)*(opts.lineHeight||1.28),maxLines=Math.max(1,Math.floor(height/lineHeight));
    if(lines.length>maxLines)throw new Error('Besedilo je predolgo za eno stran originalnega obrazca. Skrajšaj opis, predloge ali ukrepe in poskusi znova.');
    lines.forEach(function(line,i){ctx.fillText(line,0,1+i*lineHeight,maxWidth)});
    var png=await doc.embedPng(canvas.toDataURL('image/png'));
    page.drawImage(png,{x:x,y:pageHeight-top-height,width:width,height:height});
  }
  // Klikljiv Google Maps naslov je dodatna PDF povezava, podlaga ostane originalni PDF.
  function addMapLink(top){
    var url=faultMapsUrl({lat:d.gpsLat,lng:d.gpsLng});
    if(!url)return;
    var x=389,y=pageHeight-top-11,label='Odpri v Google Maps';
    page.drawText(label,{x:x,y:y,size:9.5,color:lib.rgb(0.05,0.26,0.70)});
    page.drawLine({start:{x:x,y:y-1.5},end:{x:x+91,y:y-1.5},thickness:0.5,color:lib.rgb(0.05,0.26,0.70)});
    var action=doc.context.obj({Type:'Action',S:'URI',URI:lib.PDFString.of(url)});
    var annotation=doc.context.obj({
      Type:'Annot',Subtype:'Link',Rect:[x,y-4,x+100,y+12],
      Border:[0,0,0],A:action
    });
    page.node.addAnnot(doc.context.register(annotation));
  }
  var kind=d.kind,isNNO=kind==='NNO',isTP=kind==='TP',isSN=kind==='SN';
  var dy=isNNO?179:isTP?190:197;
  var dateX=39,fromX=isSN?219:207,toX=isSN?301:282;
  // Prazne pike po »do« nadomesti čas odprave, brez prekrivanja napisov.
  if(d.to)page.drawRectangle({x:isSN?300:280,y:pageHeight-dy-14,width:isSN?52:60,height:15,color:lib.rgb(1,1,1)});
  await place(dateX,dy,137,16,reportDate(d.date),10.6);
  await place(fromX,dy,isSN?62:50,16,d.from,10.6);
  await place(toX,dy,isSN?45:56,16,d.to,10.6);
  // Označena izvirna možnost nege ali odprave okvare.
  await place(d.reason==='nega'?(isSN?453:444):(isSN?496:486),dy-3,13,14,'✓',11,{bold:true});

  if(isNNO){
    await place(34,226,205,15,String(d.tp||'').replace(/^TP\s+/i,''),10.4);
    await place(111,253,466,15,d.outlet,10.4);
    await place(d.scope==='odsek'?60:7,272,12,15,'✓',10.3,{bold:true});
    if(d.scope==='odsek'){
      await place(149,276,253,15,d.sectionFrom,10.3);
      await place(432,276,144,15,d.sectionTo,10.3);
    }
    await place(45,318,532,16,d.fault,10.4);
    await place(51,342,524,16,d.cause,10.4);
    await place(307,365,90,15,d.orderNo,10.2);
    await place(17,410,560,125,d.description,10.5,{lineHeight:1.42});
    addMapLink(410);
    await place(17,567,560,105,d.suggestions,10.5,{lineHeight:1.42});
    await place(17,708,560,93,d.measures,10.5,{lineHeight:1.42});
  }else if(isTP){
    await place(178,234,397,30,String(d.tp||'').replace(/^TP\s+/i,'')+(d.location?' – '+d.location:''),10.5);
    await place(306,279,92,15,d.orderNo,10.3);
    await place(93,328,482,15,d.fault,10.5);
    await place(93,352,482,15,d.cause,10.5);
    await place(17,399,560,120,d.description,10.5,{lineHeight:1.42});
    addMapLink(399);
    await place(17,559,560,104,d.suggestions,10.5,{lineHeight:1.42});
    await place(17,696,560,106,d.measures,10.5,{lineHeight:1.42});
  }else{
    // Izvirni napis »DV/KB« ostane v celoti viden; izbira je pripisana ob njem.
    await place(60,212,44,15,d.medium,10.5);
    // Na originalnem obrazcu je že natisnjeno »20 kV«.
    if(String(d.voltage||'20')!=='20'){
      page.drawRectangle({x:26,y:pageHeight-241,width:14,height:14,color:lib.rgb(1,1,1)});
      await place(27,228,28,13,d.voltage,10.2);
    }
    await place(95,226,475,16,String(d.asset||'').replace(/^(DV|KB)\s+/i,''),10.5);
    await place(d.scope==='odsek'?60:7,243,12,15,'✓',10.3,{bold:true});
    if(d.scope==='odsek'){
      await place(77,256,341,16,d.sectionFrom,10.3);
      await place(443,256,128,16,d.sectionTo,10.3);
    }
    await place(307,279,92,15,d.orderNo,10.3);
    await place(17,328,560,146,d.description||d.fault,10.5,{lineHeight:1.42});
    addMapLink(328);
    await place(17,513,560,130,d.suggestions,10.5,{lineHeight:1.42});
    await place(17,678,560,119,d.measures,10.5,{lineHeight:1.42});
  }
  await place(193,813,199,15,reportDate(d.date),10.5);
  await place(449,805,131,13,d.responsible,10);
  return doc.save({useObjectStreams:false});
}
async function preview(){
  if(!data||!issue)return;
  var vals=Object.assign({},data);
  // Odprtje okna je sinhrono, da Safari na iPhonu ne blokira PDF-ja.
  var win=window.open('','_blank');
  if(!win){alert('Dovoli pojavna okna, da se lahko odpre izvirno poročilo PDF.');return}
  win.document.open();
  win.document.write('<!doctype html><html lang="sl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
    '<body style="font:16px Arial;padding:20px;color:#0b3a63">Pripravljam izvirni obrazec '+E(vals.kind)+' …</body></html>');
  win.document.close();
  try{
    var pdf=await createOriginalReport(vals);
    var url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));
    win.location.replace(url);
    // Objavljen URL obdržimo dovolj dolgo za tisk, skupno rabo ali shranitev.
    setTimeout(function(){URL.revokeObjectURL(url)},15*60*1000);
  }catch(err){
    console.error('Poročilo PDF:',err);
    try{win.document.body.textContent='Poročila ni bilo mogoče pripraviti: '+err.message}catch(e){}
    alert('Poročila ni bilo mogoče pripraviti: '+err.message);
  }
}
window.eoReportOpen=open;
})();