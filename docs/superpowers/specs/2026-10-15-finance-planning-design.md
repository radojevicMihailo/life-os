# Unapređenje finansijskog sistema

Datum: 2026-10-15
Status: Dizajn i način izvršenja potvrdio korisnik; implementirano lokalno, bez produkcione migracije/deploy-a

## Cilj i dogovoreni obuhvat

Korisnik je tražio implementaciju svih predloga iz razgovora osim tačke 3
(CSV uvoz i usaglašavanje sa bankom), uključujući poboljšanja interfejsa.
Rezultat treba da pomogne u planiranju narednih troškova, praćenju ciljeva i
razumevanju mesečnog napretka, uz očuvanje postojećeg finansijskog dnevnika.

Obuhvat:

1. Ponavljajući prihodi i obaveze sa potvrdom realizacije.
2. Raspoloživ novac do sledećeg prihoda.
3. Tempo potrošnje, upozorenja i projekcije budžeta.
4. Rokovi ciljeva i potreban mesečni iznos štednje.
5. Mesečni pregled i istorija neto imovine, uz odvajanje ulaganja od prinosa.
6. Filteri po nazivima, srpski nazivi transakcija i pretraga opisa.

Ne uvoditi nove servise, plaćene pakete, dodatne API zahteve, promene Fly
konfiguracije ili automatsko slanje poruka. Upozorenja se prikazuju u aplikaciji.

## Postojeća osnova

- `modules/finance` ima domenske funkcije, aplikacione servise, Drizzle šemu,
  read modele i server actions; zadržati taj raspored.
- Stvarni saldo nastaje iz knjiženja, ne iz planova.
- `finance_account_purposes` već rezerviše novac i potraživanja za ciljeve i
  budžete. Trenutni `free` zato nije isto što i novac za svakodnevnu potrošnju.
- Budžeti imaju mesečne limite, prenose i obračunatu potrošnju.
- Investicije imaju istoriju trgovanja, naknade, poreske lotove i kurseve trgovanja.
- Kursevi i cene imaju vremenske oznake; nije zagarantovana pokrivenost prošlosti.
- Filteri transakcija trenutno traže ID računa i kategorije, a tipovi su na engleskom.

## Pristup i faze

Preporuka je proširenje postojećeg modula, kroz četiri povezane celine:

1. Interfejs i ponavljajući planovi sa potvrdom knjiženja.
2. Raspoloživ novac i projekcije budžeta.
3. Rokovi i plan štednje za ciljeve.
4. Istorijski mesečni pregled.

Alternativa sa automatskim knjiženjem na datum dospeća nosi rizik netačnog salda,
pa planirane stavke zahtevaju potvrdu. Poseban servis za planiranje bi zahtevao
novu infrastrukturu bez potrebe; obračuni ostaju u postojećoj aplikaciji.

## 1. Ponavljajući planovi

Nova stranica `/finance/planning`, stavka navigacije „Planiranje“.
Forma: naziv, prihod/rashod, račun, kategorija, iznos, datum prvog dospeća,
učestalost (jednom, nedeljno, mesečno, godišnje), opciono poslednji datum.
Prihod može biti označen kao prihod do kog se računa raspoloživ novac.
Bez oznake koristiti najbliži budući planirani prihod; prikazati njegov naziv.

Plan koristi datum bez vremena u zoni Europe/Belgrade. Mesečni datum 29–31
u kraćem mesecu pada na poslednji dan, ali originalni dan ostaje sidro
za sledeće mesece. Godišnji 29. februar pada na 28. februar van prestupne godine.

Šema: tabela pravila sa početnim/krajnjim datumom, učestalošću, računom,
kategorijom, iznosom, oznakom prihoda i arhiviranjem; tabela izuzetaka po
pravilu i datumu dospeća sa statusom `confirmed` ili `skipped`, vezom ka
knjiženju i sačuvanim podacima potvrđene pojave. Jedinstven par pravilo/datum.
Ne materijalizovati beskonačan broj budućih stavki i ne uvoditi cron.

„Potvrdi“ otvara datum i iznos stvarnog plaćanja, unapred popunjene planom.
Potvrda koristi postojeće knjiženje i ponovno računanje budžeta u jednoj DB
transakciji sa zaključavanjem pravila; ponovljena ili paralelna potvrda ne
stvara duplo knjiženje. „Poveži postojeću transakciju“ dozvoljava povezivanje
nepovezanog knjiženja odgovarajućeg tipa, računa i kategorije, bez novog prometa.
„Preskoči“ uklanja pojavu samo iz projekcija. Arhiviranje zaustavlja budući plan.
Izmena pravila menja nepotvrđene pojave; potvrđene zadržavaju sačuvane podatke.

Pre knjiženja proveriti aktivnost računa/kategorije, slaganje valute i
klasifikacije. Greška ne menja ni knjiženje ni status pojave. Brisanje povezanog
knjiženja vraća pojavu u nepotvrđeno stanje; korekcija prevezuje vezu na zamenu
u istoj transakciji. Veza je jedinstvena po stvarnom knjiženju.

## 2. Raspoloživ novac do sledećeg prihoda

Kartica na pregledu: raspoloživ iznos, datum i naziv sledećeg prihoda,
broj dana, iznos po danu i objašnjenje odbitaka. Očekivani prihod nije deo
trenutnog salda. Bez sledećeg prihoda koristiti kraj tekućeg meseca i jasno
prikazati taj horizont; dostupna je promena krajnjeg datuma na stranici planiranja.

Podrazumevano uključiti aktivne novčane račune `asset`, osim računa povezanih
sa investicionim računima. Kripto, investicije i potraživanja nisu likvidan novac
za ovu karticu. Omogućiti izbor računa uključenih u obračun, sa trajnim čuvanjem
u finansijskim podešavanjima. Obaveze ne oduzimati u celosti automatski: planirane
otplate ulaze kao obaveze dospele u izabranom horizontu.

Obračun po računu i valuti:

- Početi od stvarnog salda, uključujući negativan saldo uključenog računa.
- Oduzeti rezervacije za ciljeve i sve ostale postojeće rezervacije.
- Oduzeti nepotvrđene obaveze do krajnjeg datuma, uključujući dospele neplaćene.
- Za istu kategoriju i mesec umanjiti odbitak obaveza za postojeću rezervaciju
  budžeta na istom računu: ukupni odbitak je veći od rezervacije i obaveza,
  a ne njihov zbir. Rezervacija se koristi samo jednom unutar svoje grupe.
- Prikazati mogući deficit kao negativan iznos, bez prikrivanja nulom;
  dnevno raspoloživo ograničiti na nulu uz posebno upozorenje na deficit.

Primer: saldo 1.000 EUR, cilj 200 EUR, rezervisani budžet 300 EUR i obaveza
100 EUR u istoj budžetskoj kategoriji daju 500 EUR raspoloživog novca.
Bez rezervacije budžeta raspoloživo je 700 EUR.

Granični datum sledećeg prihoda nije uključen u period troškova; korisnik vidi
napomenu da obračun pokriva dane pre tog prihoda. Ručno odabran krajnji datum
jeste uključen. Danas dospela nepotvrđena primanja ne pretpostavljaju se primljenim.
Za preostale današnje obaveze uvek postoji bar jedan dan u dnevnom obračunu.

Konverzija koristi postojeće izvore i EUR zbir. Nedostajući kurs daje nedostupan
zbir sa razlozima, a izvorni iznosi ostaju vidljivi. Zastareo kurs daje oznaku.
Rezervacije na arhiviranim računima ne ulaze u novac aktivnih računa.

## 3. Budžeti i upozorenja

Zadržati postojeće limite, prenose i izvorne valute. Dodati procenat potrošnje,
procenat proteklog meseca, prosečnu dnevnu potrošnju i procenu do kraja meseca.
Za tekući mesec: projekcija je veći iznos između linearne projekcije stvarne
potrošnje i zbira stvarne potrošnje sa preostalim planiranim obavezama kategorije.
Ovo izbegava da se fiksni trošak iz prvog dana meseca još jednom doda projekciji.
Projekcija je označena kao procena na osnovu dosadašnjeg tempa.

Upozorenja: stvarno prekoračenje, potrošeno najmanje 80%, projekcija prekoračenja
i potrošnja koja je za najmanje 10 procentnih poena ispred proteklog meseca.
Ne deliti nulom: nedostupan ili nepozitivan raspoloživ budžet dobija poseban status.
Za završene mesece prikazati konačan rezultat; za buduće mesece samo plan.
Poređenje prethodna tri meseca radi po kategoriji i istoj valuti, sa oznakom
kada nema uporedivih podataka. Obaveze u drugoj valuti zahtevaju označenu
konverziju; bez kursa projekcija je nepotpuna.

## 4. Ciljevi sa rokom

Dodati opciono `targetDate` tipa date; postojeći ciljevi bez roka nastavljaju da rade.
Forma za kreiranje/izmenu dobija rok. Kartica prikazuje preostali iznos,
broj mesečnih izdvajanja i potreban mesečni iznos, zaokružen naviše na najmanju
jedinicu valute. Broj izdvajanja obuhvata tekući mesec i mesece do meseca roka.

Odvojeno prikazati novac na računima i izdvojena potraživanja. Potreban mesečni
iznos računa se prema sredstvima na računima; potraživanja se prikazuju kao
uslovni doprinos. Za račun sa deficitom rezervacija, taj deo cilja dobija oznaku
nepokrivenosti; ne prikazivati bezuslovnu tvrdnju da je cilj finansiran.

Ispunjen cilj ima preostalo nula; prošli rok sa manjkom ima status „Rok je prošao“.
Bez roka nema mesečne preporuke; bez potrebnog kursa nema zbirne preporuke.
Ovo ne pokreće automatsko prebacivanje ili novu rezervaciju sredstava.

## 5. Mesečni pregled

Nova stranica `/finance/reports`, navigacija „Izveštaji“, sa izborom meseca i
pregledom poslednjih 12 meseci. Prihodi, rashodi, višak/manjak, stopa štednje,
nove kupovine i prodaje investicija, tržišni i valutni efekti i neto imovina.
Stopa štednje = (prihodi − rashodi) / prihodi; bez pozitivnog prihoda nema procenta.
Transferi, početna stanja i kupovine/prodaje investicija nisu prihod/rashod.
Dividende i naknade se računaju jednom iz odgovarajućih knjiženja.

Istorijske salde i količine rekonstruisati iz dnevnika i investicionih događaja
na kraj meseca u Europe/Belgrade. Uključiti i danas arhivirane račune koji su
imali stanje u posmatranom periodu. Korekcije i storna računati po njihovom
ekonomskom efektu; ne izbacivati samo original pa ostaviti storno u zbiru.

Istorijske kurseve/cene uzimati samo sa datumom važenja do posmatranog preseka,
uz postojeće pragove zastarelosti. Nema novih poziva provajderima radi istorije.
Kada podaci nisu dostupni, graf ima prekid i tabelu nedostajućih izvora;
ne spajati praznine niti predstavljati vrednost kao nulu. Konverzija mesečnih
tokova koristi kurs na datum transakcije i oznake kompletnosti/zastarelosti.

Odvojiti kupovine/prodaje po stvarnim iznosima od promene vrednosti portfolija.
Rekonsilijacija neto imovine razlikuje višak prihoda nad rashodima, početna
stanja/ispravke, tržišni efekat i valutni efekat. Ako nedostaje potreban izvor,
odgovarajući efekat ostaje nedostupan; rezidual se ne naziva tržišnim prinosom.
Za tekući mesec presek je sada, sa oznakom „Mesec u toku“.

Grafovi imaju tabelarni prikaz, koriste postojeći Recharts i poštuju skrivanje
finansijskih vrednosti kao i ostali delovi aplikacije. Ograničiti broj meseci,
izbegavati upit po transakciji i objediniti podatke unutar konzistentnog čitanja.

## 6. Poboljšanja interfejsa

- U filterima transakcija zameniti ID polja izborom naziva računa/kategorije.
  Arhivirane opcije ostaju dostupne uz oznaku radi istorijskog pregleda.
- Tipove i izvore transakcija prikazivati kroz zajedničku mapu srpskih naziva
  na pregledu, listi, filterima i opisima za pristupačnost. Tehničke enum vrednosti
  u bazi i postojećim izvoznim formatima ostaju iste.
- Dodati parametrizovanu pretragu opisa `q`, sa ograničenom dužinom i doslovnim
  tretiranjem znakova `%` i `_`. Kombinovati je sa postojećim filterima.
- Dodati „Očisti filtere“ i navigaciju „Prethodno/Sledeće“, pošto read model već
  vraća `hasMore`, ali stranica trenutno ne prikazuje pristup starijim stavkama.
  Koristiti stabilni kursor datum/ID i očuvati aktivne filtere.
- Prilagoditi navigaciju dodatnim stranicama, uz postojeći mobilni horizontalni
  prikaz, jasne oznake, focus stilove i odgovarajuće loading/error stanje.

## Migracije, bezbednost i provere

Promene šeme su dodatne, kroz novu migraciju u `db/unified-migrations`; ne menjati
primenjene migracije. Nova podešavanja imaju podrazumevane vrednosti koje čuvaju
postojeće podatke. Koristiti postojeću autentikaciju, zaštitu server actions,
validaciju Zod i decimalnu aritmetiku. Ostaviti postojeću korisničku izmenu
`AGENTS.md` netaknutom. Nisu potrebni commit, deployment ili promene infrastrukture.

Obavezne provere implementacije:

- Domenski testovi kalendara (31. dan, prestupna godina, DST), granica perioda,
  izračunavanja rezervacija bez duplog odbitka, deficita, budžetskih projekcija
  i zaokruživanja potrebne štednje.
- Integracioni testovi atomarne i paralelne potvrde, povezivanja postojećeg
  knjiženja, korekcije/brisanja, preskakanja, arhiviranja i migracije.
- Read modeli: istorijski kursevi bez korišćenja budućih podataka, nedostajući
  izvori, storna, transferi, arhivirani računi, ulaganje naspram prinosa,
  doslovna pretraga i stabilna paginacija.
- Provere formi i prikaza srpskih naziva, rokova, upozorenja i privatnosti.
- `pnpm typecheck`, `pnpm lint`, relevantni unit/integration testovi i production
  build; vizuelni pregled desktop i mobilnih ekrana.

## Uslovi prihvatanja

Korisnik može da napravi plan, potvrdi ili poveže stvarno plaćanje jednom,
vidi raspoloživ novac sa objašnjenjem, dobije upozorenje pre prekoračenja,
postavi rok cilja i vidi potreban mesečni iznos, pregleda mesečne rezultate
uz pošten prikaz nedostajuće istorije i pronađe transakcije bez unošenja ID-jeva.
Postojeći stvarni saldi i istorija ostaju očuvani nakon migracije.
