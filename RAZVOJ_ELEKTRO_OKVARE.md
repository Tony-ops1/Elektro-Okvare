# Elektro Okvare — razvojni kontekst in načrt nadaljevanja

**Posodobljeno:** 16. 10. 2026  
**Namen:** enotna izhodiščna dokumentacija za nadaljevanje dela v ChatGPT in na GitHubu.  
**Vir:** dosedanji dogovori z uporabnikom, preverjena koda v veji `main`, obstoječi obrazci za poročila in preverjena struktura Supabase.  
**Pozor:** ta datoteka opisuje obstoječe stanje in načrtovane funkcije. Kar je navedeno kot »NAČRT«, še ni implementirano.

## 1. Povezave in arhitektura

- **GitHub repozitorij:** https://github.com/Tony-ops1/Elektro-Okvare
- **Veja:** `main`.
- **Delujoča spletna aplikacija (GitHub Pages):** https://tony-ops1.github.io/Elektro-Okvare/
- **Glavna koda:** `index.html` (ena večja HTML datoteka s CSS in JavaScriptom).
- **Dodatne datoteke v repozitoriju:** `leaflet.js`, `leaflet.css`, `proj4.js`.
- **Backend in prijave:** Supabase, projekt za **Elektro Okvare**, referenca `leeaxoqeplipcenkonsd`, regija EU.
- **Podatkovne tabele:** `public.profiles`, `public.issues`, `public.issue_photos`, `public.app_config`.
- **Shramba fotografij:** zasebni bucket `issue-photos`.
- **Supabase Edge Functions:** `bootstrap-admin`, `manage-users`, `delete-issue`. Stari eksperimentalni `gurs-network-proxy` ni namenjen trenutnemu frontend prikazu.
- V javno GitHub dokumentacijo **ne zapisuj skrivnih ključev, nastavitev PIN, dostopnih žetonov ali zasebnih podatkov uporabnikov**. Objavljeni frontend lahko uporablja le javni Supabase publishable key; dovoljenja morajo nadzorovati RLS / Edge Functions.
- **Zelo pomembno:** pri delu s Supabase uporabljaj izključno projekt Elektro Okvare; drugih projektov v istem računu ne spreminjaj.

## 2. Namen in osnovni potek dela

Mobilna terenska aplikacija za beleženje napak in opravil na elektro omrežju. Glavni cilj je **minimalno tipkanje na terenu**, preglednost na iPhonu in skupni podatki med monterji.

1. Monter odpre **ZEMLJEVID**, po potrebi poišče naslov ali uporabi GPS.
2. Tapne **točno mesto okvare** na zemljevidu; s tem odpre obrazec **Nova napaka**. Zgornji gumb »NOVA NAPAKA« je bil odstranjen kot odvečen.
3. Vpiše ali izbere **NAZIV SREDSTVA**. Polje mora ostati **prosti tekst z iskalnimi predlogi** (`input + datalist`), ne zgolj zaklenjen `select`.
4. Pod nazivom se samodejno izpolni **ŠIFRA SREDSTVA** (`readonly`) na podlagi točnega ujemanja v seznamu. Pri poljubnem novem nazivu sme biti šifra prazna; ne izmišljaj si je.
5. Izbere **vrsto okvare**, **napako/opravilo** (ali vnese drugo), prioriteto, status, prijavitelja, izvajalca in po potrebi doda opis, opombe ter fotografije.
6. Shrani; napaka postane vidna drugim prijavljenim uporabnikom in na zemljevidu.
7. Spreminjanje statusa, odprava, zaključek, arhiviranje in poročilo morajo temeljiti na **istem shranjenem zapisu** (ne ustvarjati podvojitev).

**Trenutna polja v `issues`:** `id`, `reported_at`, `lat`, `lng`, `location_address`, `asset_name`, `asset_code`, `type`, `fault_detail`, `priority`, `status`, `description`, `notes`, `reported_by_name`, `assigned_to_name`, `created_by`, `updated_by`, `resolved_at`, `resolved_by`, `archived_at`, `archived_by`, `created_at`, `updated_at`, `legacy_id`, `client_request_id`. Drugih polj za poročila še ni.

**Statusi:** `prijavljeno`, `potrjeno`, `v obravnavi`, `čaka material`, `čaka izklop`, `odpravljeno`, `zaključeno`. Zadnja dva sta zaprta statusa.  
**Prioritete:** `kritično`, `visoka`, `normalna`, `nizka`.

## 3. Aktualni meni in zasloni (preverjeno v kodi 16. 10. 2026)

V zgornjem meniju so:
- **🗺️ ZEMLJEVID** — zemljevid, GPS, iskanje lokacije, GURS ortofoto, elektro sloji.
- **🔴 ODPRTE** — odprte napake, iskanje/filtri, prikaz lokacije.
- **✅ ZAKLJUČENE** — odpravljene/zaključene napake.
- **📊 STATISTIKA** — odprte, kritične, odpravljene, vse.
- **📦 ARHIV** — samo admin.
- **👥 UPORABNIKI** — samo admin.
- **🌦️ VREME** — ločen zaslon s trenutno vremensko sliko in kratko napovedjo.

**Že odstranjeno iz menija:** »+ NOVA NAPAKA« in »👷 MOJE«. V izvorni kodi lahko ostane neuporabljen notranji `myView`; ni več gumba v meniju. Tega ne briši brez razloga.

**Dogovor o zasedenosti menija:** uporabnik **ne želi preveč gumbov oziroma natrpanega začetnega zaslona**. Dodatne vsebine naj bodo kompaktne ali pod sekundarnim pogledom.

## 4. Seznam sredstev — zelo pomembno

Seznam `ASSETS` je trenutno neposredno v `index.html`; vsak element je `{code: "…", name: "…"}`.

**Preverjeno stanje: 666 postavk s 666 različnimi šiframi:**
- **317 TP** (transformatorske postaje), prva samostojna datoteka z ustreznimi TP šiframi.
- **317 NNO** (nizkonapetostna omrežja), **druga datoteka z drugačnimi dejanskimi NNO šiframi**; niso umetni dvojniki TP.
- **18 DV 20 kV**.
- **13 KB 20 kV**.
- **1 posebna postavka:** `20KV LOČNA (60-J30)`.

**Pomembna zgodovina:** najprej je bil dodan TP seznam brez šifer; nato pravilne TP šifre; nato po pomoti umetni NNO dvojniki z istimi TP šiframi; ti so bili odstranjeni; nato dodan **pravi** NNO seznam z lastnimi šiframi. Ne ponovi te napake.

Primer pravilnih ločenih šifer:
- `TP VRTNI CENTER` → `2102871`
- `NNO TP VRTNI CENTER` → `2103157`
- `TP STARI LJUBEN 1987` → `2002432`
- `NNO TP STARI LJUBEN 1987` → `2049249`

**Ohrani izvirne nazive iz seznamov.** Nekateri zapisi NNO se začnejo z `NNO TP ...`, drugi samo z `NNO ...` — ne popravljaj samodejno vseh, če ni naročeno. TP zapisi so bili normalizirani na začetni `TP`, kjer je v prejetem seznamu manjkal.

**Iskanje:** trenutno browser `datalist` s kodo v `label`, samodejno polnjenje šifre pri točnem ujemanju; prost vnos naj ostane dovoljen.

## 5. Prikaz napak

- Pri **ODPRTIH** je naslov kartice najprej **naziv sredstva** (večji in poudarjen), pod njim **vrsta okvare • napaka/opravilo**.
- Pod naslovom so datum in ura, status, prioriteta in gumb **📍 POKAŽI LOKACIJO**.
- Gumb premakne zemljevid na shranjeno lokacijo, približa in odpre pojavno okno.
- Tudi popup na zemljevidu prikazuje naziv sredstva.
- Ohrani barvno označevanje statusov/prioritet.
- Pri urejanju obstoječe napake se ohranijo `asset_name`, `asset_code`, fotografije in ostali podatki.
- Admin lahko upravlja uporabnike, arhivira zaključene napake, jih obnovi in **trajno izbriše** napako z njenimi fotografijami (prek `delete-issue` Edge Function).
- Monter nima pravice trajnega brisanja.

## 6. Ključna odpravljena težava — 13-kratna podvojitev

12. 10. 2026 je bila prijava `NNO STARI LJUBEN` ustvarjena **13-krat** v istem trenutku (več vzporednih `POST` klicev). Odstranjenih je bilo **12 podvojitev**, ostal je en zapis. Zaščita, ki je zdaj v kodi:

1. `issueSaving` prepreči vzporedno oddajo obrazca.
2. `saveIssueBtn` se med shranjevanjem onemogoči.
3. Vsaka nova prijava dobi `client_request_id` UUID; v bazi je enolični indeks.
4. Ob podvojenem zahtevku frontend preveri že obstoječ zapis po istem `client_request_id`.

**Pri vseh nadaljnjih spremembah obrazca ohrani to zaščito.** Ne izvajaj nevarnih čistilnih SQL po vseh napakah brez izrecnega naročila.

## 7. Zemljevid in elektro omrežje

- **Leaflet**, iskanje naslovov prek OSM Nominatim, GPS za lokacijo.
- **GURS ortofoto:** WMS `PREGLEDNI_DOF`; ob nedosegljivosti lahko pade na Esri World Imagery.
- **Elektro sloj:** GURS infrastruktura (KGI/GJI); uporabljena sta WFS in po potrebi WMS.
- Za privzeti sloj vodov se je uvedlo odjemalsko predpomnjenje po **0,02° mrežnih celic**, lokalno v **IndexedDB**, približno **24 h**, z omejitvijo sočasnih zahtevkov. Namen je hitrejše ponovno odpiranje že obiskane lokacije.
- Ob prvem prikazu na nepredpomnjenem območju je odziv lahko odvisen od GURS WFS hitrosti; ne obljubljaj trenutnega prikaza brez strežniškega predpomnilnika.
- **Trdna uporabnikova zahteva:** pri pospeševanju ELEKTRO sloja **NE spreminjaj ortofota**, če uporabnik posebej ne zahteva.
- Pred spremembo preveri trenutno implementacijo in da prikaz napak, GPS ter ortofoto še delujejo.

## 8. Vreme in predlogi za vsebino

**Vgrajeno:** samostojni zavihek **VREME**, trenutno uporablja **Open-Meteo** za temperaturo, občutek, veter, vlago in 3-dnevno napoved. Lokacija prek GPS, rezervna lokacija Novo mesto, obnova približno na 10 min. Gumb »Odpri MSN Weather« odpira originalno stran.

**MSN se ne sme vgrajevati kot iframe**, ker stran povezavo blokira. Pred tem je bil poskus iframe napačen.

**Ikone:** prijavljena napaka s sivimi/praznimi simboli za dneve; v trenutni kodi je funkcija `weatherSvg` z inline SVG ikonami. V naslednjem iPhone testu preveri, da so za vse vremenske kode pravilno vidne. Ne posegaj drugam, če ni potrebe.

**Samo ideje, še ne izvedeno:** »⚡ STANJE OMREŽJA« (aktualne in načrtovane prekinitve pri Elektru Ljubljana, lokalne informacije, ELES novice) in kratke video novice s podrsavanjem (Shorts). Uporabnik ne želi dodatnih velikih zavihkov: če bo uvedeno, naj bo kompaktno, na zahtevo, brez motenja glavnega delovnega toka.

**Ne zamenjuj vremenskih podatkov Open-Meteo za podatke MSN.** Povezava na MSN še ne pomeni, da MSN daje podatke aplikaciji.

## 9. Naslednja glavna funkcija — POROČILO ZA VSAKO NAPAKO (NAČRT, še ni vgrajeno)

**Zadnji izrecni dogovor:** »Pri vsaki okvari bi rad, da se izpolni to poročilo, odvisno kaj je izbral: NNO ali TP ali DV, [SN].«

**Zahtevano vedenje:**
1. Ko je napaka ustvarjena oziroma odprta za urejanje, iz **naziva/šifre sredstva** določi kategorijo:
   - `TP ...` → **poročilo TP**, obrazec **OB24 DN036 NA329 01**.
   - `NNO ...` → **poročilo NNO**, obrazec **OB28 DN036 NA329 01**.
   - `DV ...`, `KB ...` in ustrezni SN vodi → **poročilo SN**, obrazec **OB21 DN036 NA329 01**.
   - Za poljubni naziv brez prepoznane predpone mora biti izbira vrste poročila omogočena ročno; ne ugibaj.
2. **Samodejno predizpolni** podatke, ki jih aplikacija že pozna: naziv in šifro sredstva, datum/čas, tip napake, opis, izvajalca, morebitne opombe. Ne izmišljaj manjkajočih polj.
3. Uporabnik mora poročilo **še dodatno urediti**, nato videti **predogled** in ga **natisniti/izvoziti v PDF** (po potrebi Excel, skladno z že obstoječo aplikacijo za poročila).
4. Ne sme nastati **nova napaka**, ko uporabnik ureja poročilo. Poročilo mora biti vezano na `issues.id`; potrebno bo načrtovati podatkovno strukturo za vsebino poročila.
5. Obrazce in njihove razporeditve **ohrani čim bolj zveste originalom**; uporabnik je že posebej popravljal postavitve, pozicije in natančnost besedila.
6. Pogosto uporabljena polja naj bodo predizpolnjena, ročnega vnosa na terenu čim manj.
7. Poročilo naj se da odpreti tudi kasneje iz **odprte**, **zaključene** ali **arhivirane** napake, skladno s pravicami.

**Že obstaja ločena prejšnja aplikacija za poročila**, ni pa del tega GitHub repozitorija. Uporabne predloge poišči med prejšnjimi uporabnikovimi datotekami:
- `POROCILA_SN_TP_NNO_V8_TP_VRHNJE_PRVO.html` — najnovejša znana različica, **prednostno izhodišče**.
- `POROCILA_SN_TP_NNO_V7_POPRAVEK_TP.html`.
- `POROCILA_SN_TP_NNO_V6(1).html`.
- `Poročila TP.pdf` — TP, OB24.
- `Poročila NNO.pdf` in `OB28 DN036 NA329 Poročilo o negi in okvari NNO.doc` — NNO, OB28.
- `POROCILO_Z_LOGOTIPOM.xlsx` / `POROCILO_ORIGINAL_LOGO.xlsx` — SN predloge, OB21.

**V prejšnjih pogovorih dogovorjeni detajli poročil:**
- Poročila so ločena po SN/TP/NNO. Obstoječi generator je znal prebrati kopirano besedilo in ustvariti predogled, Excel in natis/PDF; nova integracija naj ne bo odvisna od lepljenja besedila, ker ima aplikacija svoje podatke.
- Pri poročilu TP je bila izrecna zahteva v razdelku **3.3 Vikendi**: **»Vrhnje sredstvo« pred »Sredstvo«**, oboje prikazano (primer TP Korenti). To je bil popravek iz ločene aplikacije; ohraniti smiselno zaporedje.
- Na TP poročilu so polja: `Sredstvo – naziv`, `Vrhnje sredstvo – naziv`, `Vrsta okvare`, `Vzrok okvare`.
- Na NNO poročilu: `TP – naziv`, `Na izvodu – naziv`, `Na odseku od/do`, `Vrsta okvare`, `Vzrok okvare`.
- Na SN poročilu: `DV/KB – naziv voda`, `Na odseku od` (po obrazcu tudi zaključek odseka).
- Vsi obrazci imajo kratek opis vzroka in posledic, predloge, izvedene ukrepe, datum in podpis odgovorne osebe; po potrebi delovni nalog.
- V starejši aplikaciji za poročila je uporabnik zahteval, da **PREDLOGI** vsebujejo identično besedilo kot **IZVEDENI UKREPI**. Pri novi integraciji to obravnavaj kot obstoječe pravilo ločene aplikacije, dokler ni spremenjeno, ne pa kot novo univerzalno pravilo brez preverjanja.
- Stare predloge v datotekah so referenčni vir postavitve. **Ne spreminjaj drugih dokumentov**, ko urejaš posamezno vrsto poročila.

**Predlagano zaporedje dela za novo integracijo (še ni izvedeno):**
- Prebrati celotno najnovejšo datoteko `POROCILA_SN_TP_NNO_V8_TP_VRHNJE_PRVO.html` in pripadajoče izvirne obrazce.
- Dodati ločeno možnost **»📄 Poročilo«** pri že obstoječi napaki, brez dodatnega velikega gumba v glavnem meniju.
- Povezati `issues.id` z izpolnjenimi podatki poročila (nova tabela ali polja, odvisno od natančne oblike).
- Samodejno določiti obrazec prek predpone sredstva; omogočiti izjeme.
- Predizpolniti skupna polja, prikazati dodatna specifična polja, shraniti osnutek poročila.
- Dodati A4 predogled in tisk/PDF; testen izpis za vsako od 3 vrst posebej.
- Preskusiti stare zapise, odprte/zaključene/arhi­virane napake in delo na iPhonu.

## 10. Prijave in upravljanje pravic

- Prijava je prilagojena zaposlenim: uporabniško ime in **4-mestni PIN**; backend temelji na Supabase Auth in tabeli `profiles`.
- Vlogi sta **admin** in **monter**.
- **Admin:** upravljanje uporabnikov/PIN-ov, omogoči/onemogoči račun, arhiv in trajni izbris.
- **Monter:** vnos in urejanje napak, brez administratorskega trajnega brisanja.
- Dovoljenja se **ne smejo zanašati samo na skrite gumbe**; backend mora preverjati pravice.

## 11. Stanje, omejitve in odprta vprašanja

**Že narejeno:** GitHub Pages aplikacija, Supabase skupni podatki, uporabniki, GIS/GPS, slikovni prikaz napak, foto shranjevanje, odprte/zaključene/arhiv, pravilne šifre 666 sredstev, preprečevanje dvojnih vnosov, vremenski zaslon, odstranjena odvečna gumba iz zgornjega menija.

**Še ni vgrajeno:**
- Integracija poročil OB21/OB24/OB28 k posamezni napaki.
- Kompaktne novice o stanju omrežja in swipe-video novice (le ideji, brez potrjene zahteve za implementacijo).
- Potrditev prikaza vseh vremenskih SVG ikon na vseh uporabljenih telefonih.

**Odprto za odločitev pred implementacijo poročil:** kdaj se poročilo samodejno ustvari, ali so posebna polja obvezna in kdo sme popravljati zaključeno poročilo. Osnovno pravilo je ohraniti obstoječe delovanje in ne blokirati prijave zaradi še neizpolnjenih podatkov poročila.

## 12. Pravila za naslednjega razvijalca / ChatGPT

1. **Vedno najprej pridobi najnovejši `index.html` iz `main` in trenutni blob SHA.** Ne prepisuj ga s staro kopijo.
2. Uporabnik pogosto izrecno zahteva: **»Samo to popravi, ostalo pusti.«** Spreminjaj najmanjšo možno količino kode.
3. Pred posodobitvijo preveri skladnjo JavaScripta (npr. `new Function(...)` nad končnim skriptnim blokom), po posodobitvi preveri GitHub Pages objavo.
4. Če se spreminja podatkovni model, uporabi pravo Supabase okolje in migracijo; preveri združljivost s starimi podatki.
5. Ne briši poročil, slik, napak, uporabnikov ali podatkov brez jasne zahteve; loči spremembe sheme od sprememb vsebine.
6. Najpomembnejša posebnost: ime sredstva, njegova šifra in povezava sta **podatki, ki jih je dal uporabnik**, ne nekaj, kar se sklepa po nazivu. TP in NNO šifre so drugačne.
7. Ohrani zaščito pred podvojenim shranjevanjem, admin/monter pravice, geolokacijo, ortofoto in hitrost elektro sloja.
8. **Ne uvajaj novega natrpanega menija.** Poročilo sodi v pogled/urejanje konkretne napake.
9. O spremembi povej jasno: kaj je bilo narejeno, kaj še ni, in kdaj je GitHub Pages res objavljen.
10. Za nadaljevanje pogovora je dovolj navodilo: **»Nadaljuj projekt Elektro Okvare po datoteki RAZVOJ_ELEKTRO_OKVARE.md na GitHubu. Trenutna naloga: poročila za TP/NNO/SN. Preveri najnovejšo kodo in uporabi originalne obrazce.«**

## 13. Zgodovina ključnih odločitev (strnjeno)

- Začetno beleženje GPS napak na zemljevidu in skupna evidenca.
- Dodana registracija/prijava, admin/monter, Supabase, fotografije, arhiv in trajni admin izbris.
- GURS ortofoto in elektro infrastruktura; optimizacija elektro sloja s predpomnjenjem, ob izrecni zahtevi, da ortofoto ostane nedotaknjen.
- Pri odprtih napakah je **NAZIV SREDSTVA prvi naslov**, nad vrsto napake; gumb **Pokaži lokacijo** odpre ustrezen marker na karti.
- Podvojena prijava NNO STARI LJUBEN (13 kopij) je bila očiščena in dodana zaščita pred ponovitvijo.
- Naziv sredstva je postal prosti vnos s predlogi; pod njim je avtomatska šifra.
- Seznam: 317 TP s pravimi šiframi, 317 NNO s svojimi pravimi šiframi, nato dodatnih 32 SN/DV/KB sredstev. **Skupaj 666.**
- Vreme je dodano kot samostojen zaslon, podatki Open-Meteo in povezava na MSN; iframe MSN ni deloval.
- Pogovori o »Stanje omrežja«, video novicah in igri »Skrita okvara« so bili idejni; **ni potrjene zahteve, da jih zdaj vgrajujemo**.
- Zaradi preglednosti odstranjena zgornja gumba »NOVA NAPAKA« in »MOJE«.
- **Nazadnje dogovorjeno:** pri vsaki napaki ustrezno izpolniti poročilo TP/NNO/SN, omogočiti naknadno urejanje. **To je naslednji razvojni korak.**

---

*Ta dokument je razvojna opora, ne nadomestilo za preverjanje aktualne kode, sheme baze in originalnih obrazcev. Spremembe se dodajajo postopoma. Pred vsako nadaljnjo spremembo preveri zadnji commit in dejansko objavo.*
