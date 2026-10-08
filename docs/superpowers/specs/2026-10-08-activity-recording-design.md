# Beleženje treninga kroz delove

Datum: 2026-10-08
Status: model odobren u razgovoru; specifikacija spremna za pregled.

## Cilj i dogovor

Jedna aktivnost predstavlja jedan trening sa delovima koji se izvršavaju redom. Jednostavno trčanje ima jedan deo i odmah dostupne kilometre i vreme. Kombinovani trening može da sadrži trčanje, vežbe, superserije i sprintove u proizvoljnom redosledu.

Korisnikov fokus su teretana i trčanje. Postojeće konfigurabilne grupe i opcije, naročito region i vrsta trčanja, ostaju dostupne. Početni izbor aktivnosti prilagođava formu, a prečice iz plana i prethodnog treninga skraćuju unos. Planirane vrednosti i stvarni rezultati imaju različito značenje.

Ovo je redizajn unosa, prikaza i šablona treninga. Ne menja korisnikov program treninga, ne propisuje opterećenja i ne zaključava još neizabrane vežbe.

## Postojeći sistem

- `DynamicActivityForm.tsx` prikazuje sve grupe oznaka, polja aktivnosti i generičke redove `exercise`, `split`, `sprint`.
- Distanca, trajanje i tempo trenutno pripadaju redovima `split`. Sprint ima samo `sprintDistance` u metrima i `sprintReps`.
- `physical_activities` čuva datum, JSON vrednosti, komentar i Strava link. `physical_activity_subrows` čuva redosled, tip, vežbu i JSON vrednosti. Oznake su vezane za celu aktivnost.
- Planovi treninga trenutno sadrže vežbe, broj serija i povezivanje preko `linkNext`. Dani trening-splita vezuju oznake i jedan ili više planova.
- Detalj aktivnosti je trenutno direktno forma za izmenu; lista prikazuje oznake i broj redova.
- Aktivni sistem migracija je `scripts/migrate.mjs` sa direktorijumom `db/unified-migrations/`. Istorijske migracije u `db/migrations/` ne treba menjati.

## Novi tok unosa

Na `/activities/new` korisnik bira karticu **Trčanje**, **Teretana** ili **Kombinovano**. To su početne postavke, ne ograničenja. Trčanje otvara jedan trkački deo; teretana otvara unos prve vežbe; kombinovano otvara izbor prvog dela. Dodavanje drugog tipa uvek je dozvoljeno i prikaz vrste treninga potom prati sadržaj.

Prečice **Iz plana** i **Ponovi trening** nalaze se iznad delova. Izbor izvora učitava novu aktivnost sa današnjim lokalnim datumom. Ako forma već sadrži izmene, prikazuje pregled izvora i traži izbor zamene pre nego što zameni postojeći nacrt. Sam izbor prečice ništa ne čuva.

Raspored jedne stranice:

1. Datum, opcioni naziv treninga i početni izbor aktivnosti.
2. Opis treninga: konfigurabilne oznake koje važe za ceo trening, uključujući region.
3. Delovi treninga redom, sa dugmetom **Dodaj deo treninga**.
4. Dodatni detalji: beleška, Strava link i dodatna polja aktivnosti.
5. Sažetak i **Sačuvaj aktivnost**; na telefonu dugme ostaje dostupno bez prekrivanja poslednjih polja.

Kartice imaju razumljive naslove, vidljive jedinice i pregled kada su sklopljene. Kratke grupe opcija imaju dugmad za izbor, a dugačke pretraživ izbor. Pretraga vežbi koristi postojeći katalog i grupe. Sistemske oznake novog toka su na srpskom; korisnički nazivi ostaju kako su uneti. Prati se postojeći vizuelni sistem tamnih površina i plavih akcenata, uz svetli režim.

## Delovi treninga

Svaki deo ima stabilan identitet u nacrtu, tip, opcioni naziv i belešku, redosled i status **Za unos**, **Urađeno** ili **Preskočeno**. Unos stvarnog rezultata označava deo kao urađen; predviđene vrednosti iz šablona to ne rade. Urađen deo mora imati smislen rezultat za svoj tip. Deo bez rezultata može ostati za unos u sačuvanom treningu, ali ne ulazi u zbir i vidljivo je nepotpun. Potpuno prazan novi deo bez naziva, cilja, oznaka ili beleške izostavlja se iz čuvanja.

Dodavanje, dupliranje, pomeranje gore/dole i uklanjanje delova dostupni su tastaturom i na telefonu. Dupliranje dela kopira unesene vrednosti u samom nacrtu; prečica Ponovi trening ima drugačije ponašanje i prazni rezultate. Promena početne kartice ne briše delove. Promena tipa postojećeg dela ne sme tiho odbaciti njegove podatke: zamena zahteva jasno upozorenje, ili korisnik dodaje novi deo.

### Trčanje

- Distanca u kilometrima i trajanje; dozvoljen je unos samo jednog podatka, npr. zagrevanje od 7 minuta.
- Trajanje se unosi kroz jasno označene sate, minute i sekunde. Decimalna distanca prihvata tačku i zarez, normalizovane pre validacije.
- Tempo je automatski izveden kada postoje pozitivna distanca i trajanje. Korisnik ne mora da ga ručno računa.
- Vrsta trčanja bira se iz konfigurabilne grupe vezane za ovaj tip dela. Zagrevanje, tempo, easy i rastrčavanje nisu obavezna sistemska imena.
- Jednostavna aktivnost ostaje jedan deo sa odmah vidljivim osnovnim poljima. Dodatne deonice zahtevaju samo Dodaj deo treninga → Trčanje.

### Vežba

- Izbor vežbe, serije i ponavljanja, opciona težina; bodyweight, zagrevanje i po strani ostaju dostupni kroz razumljive nazive.
- Skokovi koriste isti unos bez obavezne težine. Recovery rutina može imati serije sa trajanjem umesto ponavljanja; svaka serija bira jedan od ova dva načina.
- Opciona pauza i beleška omogućavaju zapis odmora i uputstava kao što je RIR, bez novog obaveznog formulara.
- Uzastopne vežbe mogu da se povežu u superseriju A/B/C. Veza ne može prelaziti preko trčanja ili sprintova. Premeštanje ili uklanjanje normalizuje veze tako da ne nastaje slučajna superserija.
- Naziv dela može opisati još neizabranu vežbu u šablonu. Za urađeni deo potreban je izbor vežbe; otvoreni cilj u šablonu može ostati bez izbora.

### Sprintovi / intervali

- Broj ostvarenih ponavljanja, distanca po ponavljanju u metrima i/ili trajanje po ponavljanju u sekundama. Ne zahteva kilometre za sprint od 8–10 sekundi.
- Pauza između ponavljanja i beleška, npr. sprint uzbrdo.
- Jedan deo predstavlja ponavljanja istih parametara. Različite grupe mogu biti zasebni delovi. Detaljno merenje svakog pojedinačnog ponavljanja nije deo prve verzije.
- Rasponi poput 3–4 × 8–10 s pripadaju planiranom cilju; rezultat sadrži stvarni broj i vrednosti. Cilj se prikazuje pored praznog unosa, bez automatskog pretvaranja u ostvareno.

## Konfigurabilan opis treninga

Grupe oznaka dobijaju eksplicitnu konfiguraciju mesta prikaza: **Ceo trening** ili **Deo treninga**. Za deo može se izabrati Trčanje, Vežba i/ili Sprintovi. Grupe za ceo trening mogu biti vidljive za Trčanje, Teretanu i/ili Kombinovano; prazna lista ograničenja znači sve aktivnosti.

Postojeće grupe podrazumevano ostaju na celom treningu i vidljive svuda. Korisnik može da prebaci grupu vrste trčanja na trkačke delove. Primena ne zavisi od naziva grupe: preimenovanje Region ili Pace ne menja ponašanje. Jedna opcija po grupi ostaje pravilo kao u postojećoj formi.

Promena konfiguracije ne premešta niti briše stare izbore. Ranije izabrana oznaka ostaje vidljiva i izmenjiva na svom postojećem mestu, čak i ako nova konfiguracija više ne nudi tu grupu tamo. Nove aktivnosti i novi izbori prate novu konfiguraciju. Dodatna JSON polja ostaju sačuvana i dostupna u dodatnim detaljima; novi tok ne odbacuje nepoznate ključeve.

Filter po oznaci uključuje i oznake celog treninga i delova, sa deduplikacijom aktivnosti.

## Šabloni i ponavljanje

Postojeći planovi proširuju se uređenim delovima istih tipova kao aktivnost. Plan ima ciljeve, oznake, beleške, opcione delove i superserije; nema ostvarenih rezultata. Postojeći planovi vežbi čitaju se kroz adapter koji pretvara vežbe, broj serija i `linkNext` u ovaj model.

**Iz plana** prenosi strukturu, ciljeve, oznake i uputstva. **Ponovi trening** prenosi redosled, nazive, vežbe, oznake i superserije. Prethodni rezultati prikazuju se samo kao jasno označena referenca; novi ostvareni rezultati su prazni. Strava URL se ne kopira. Komentar prethodne aktivnosti ne prenosi se kao današnji komentar.

Korisnik može sačuvati strukturu aktivnosti kao novi šablon. Tada trenutne rezultate može preuzeti kao eksplicitne ciljeve uz pregled, nikada kao rezultate sledeće aktivnosti. Izmena učitanog treninga ne menja izvorni plan.

Petak A i Petak B su zasebni šabloni koje korisnik bira. Postojeći dani trening-splita zadržavaju oznake i veze sa planovima; prečica može učitati njihove planove redom. Za konflikte oznaka iste grupe prikazuje se izbor, bez tihog prepisivanja. Automatsko smenjivanje nedelja nije deo ovog redizajna.

Nedeljni plan iz razgovora služi kao kriterijum provere. Ne kreiraju se automatski izmišljene recovery rutine, kilometraže faza priprema ili konačni izbori upper vežbi. Šabloni se kreiraju kroz korisnički unos, a otvoreni izbori dozvoljeni su kao ciljevi.

## Prikaz i zbirovi

Lista prikazuje naziv, datum, oznake, ukupnu poznatu trkačku distancu i broj urađenih vežbi; ne koristi izraz rows. Detalj prvo prikazuje pregled treninga i delove redom, uz dugmad Izmeni i Ponovi trening.

Zbirovi koriste samo ostvarene vrednosti urađenih delova. Poznata distanca obuhvata trčanje i sprintove sa poznatom distancom (ponavljanja × metri / 1000). Sprint na vreme ne dobija pretpostavljenu distancu. Ako neki urađeni trkački deo nema distancu, zbir je označen kao poznata/unesena distanca, ne kao potpuna kilometraža.

Zbir vremena odnosi se na evidentirano aktivno vreme trkačkih delova, uključujući poznato trajanje ponavljanja. Ne predstavlja ukupno trajanje treninga sa vežbama i pauzama. Ukupan tempo prikazuje se samo za neintervalne trkačke delove za koje su svi urađeni delovi tog skupa imali i distancu i vreme; sprintovi su zasebno označeni. Time nema proseka koji deli nepotpuno vreme potpunom distancom.

Broj vežbi/serija izostavlja preskočene i neunesene delove. Ponavljanja po strani i postojeći način prikazivanja težine ostaju kompatibilni. Arhivirana vežba već vezana za aktivnost ili šablon ostaje čitljiva i dostupna pri njegovoj izmeni.

## Tehnički model i granice

Koristi se postojeća aktivnost i njeni redovi. Tip `split` ostaje interni tip za trkački deo, ali korisniku se prikazuje Trčanje. Ne uvodi se paralelni sistem za iste rezultate.

Nova aditivna migracija u `db/unified-migrations/`:

- Opcioni `title` na `physical_activities`.
- `details` JSONB na `physical_activity_subrows` za verzionisane metapodatke: naziv, belešku, status, ciljeve i `linkNext` za superserije. Null označava stari zapis, koji adapter prikazuje kao urađen bez izmišljanja rezultata.
- Tabela veza oznaka delova sa FK na red i postojeću oznaku; kaskadno brisanje prati postojeći model oznaka.
- Konfiguracija grupe oznaka za mesto i primenljivost, sa kompatibilnim podrazumevanim vrednostima.
- Nullable verzionisani `blocks` JSONB na `physical_workout_plans` za nove šablone. Null koristi postojeće `physical_workout_plan_exercises`; novi šabloni koriste blocks kao jedini izvor strukture. Istorijski redovi ostaju očuvani, ali nisu drugi aktivni izvor pri izmeni novog formata.
- Nova standardna polja sprinta za trajanje i pauzu uz postojeća polja distance i ponavljanja. SetEntry dozvoljava trajanje kao alternativu ponavljanjima; stare serije ostaju validne.

Brojčani ostvareni podaci ostaju u postojećem `values`. Metapodaci su odvojeni da ne pregaze korisnička polja. Runtime validacija pokriva i JSON metapodatke i šablone, reference vežbi i oznaka, raspon ciljeva i tipove delova. Reference vežbi u šablonskom JSON proveravaju se na serveru; brisanje vežbe vezane za takav šablon odbija se, arhiviranje je dozvoljeno.

Server actions čuvaju aktivnost, delove i njihove oznake u jednoj transakciji. Ako se redovi pri izmeni ponovo kreiraju, veze oznaka moraju biti ponovo upisane u istoj transakciji. Stabilni identiteti nacrta štite unos pri preuređivanju; identiteti referenci prethodnog treninga ne postaju identiteti nove aktivnosti.

Čiste funkcije u `lib/physical/` vode adaptaciju starih podataka, normalizaciju superserija, pripremu nacrta iz izvora i zbirove. Forme delova, izbor izvora i editor šablona dele iste tipove i ulazne komponente. Učitavanje i revalidacija ostaju u postojećim page/query/action granicama. Relevantni Next.js vodiči iz `node_modules/next/dist/docs/` moraju se pročitati pre izmene aplikacionog koda.

## Kompatibilnost i greške

Nema masovnog prepisivanja postojećih aktivnosti. Stari splitovi, sprintovi, oznake, komentari, Strava linkovi, nepoznati JSON ključevi i superserije planova imaju adapter i proveru round-trip izmenom. Stari ručno unet tempo ostaje sačuvan; ako nema podataka za novi obračun, prikazuje se kao zabeleženi tempo.

Migracije ne menjaju već primenjene SQL datoteke. Povratak na staru aplikaciju zadržava stare kolone i podatke, ali stari editor nije sposoban da očuva nove metapodatke pri izmeni; zato kompatibilnost povratka obuhvata čitanje, a ne bezbedno uređivanje novih treninga starom verzijom. Pre puštanja proveriti migraciju na kopiji/test bazi, ne izvršavati produkcionu migraciju tokom pisanja dizajna.

Negativne/nevažeće vrednosti i nepotpuni urađeni delovi dobijaju grešku uz konkretno polje. Broj ponavljanja je pozitivan ceo broj; ostvarena vremena i distance, kada se unose, moraju biti pozitivni. Neuspešno čuvanje zadržava ceo nacrt i prikazuje razumljivu poruku. Skraćeni ili sklopljeni detalji ne sakrivaju greške. Ne dodaju se novi paketi bez konkretne potrebe.

## Provera prihvatanja

1. Obično trčanje: jedan deo, distanca i vreme, bez izbora splita; čuvanje, pregled i izmena daju iste vrednosti.
2. Tempo + squat/skokovi: 7 min zagrevanja → tempo → 7 min rastrčavanja → vežbe; tip trčanja po delu i region treninga ostaju sačuvani.
3. Easy → sprintovi → easy: oba trčanja imaju svoju distancu; sprintovi prihvataju metre ili sekunde i pauzu; redosled opstaje pri čuvanju i ponovnom otvaranju.
4. Upper: superserije A/B/C i otvoreni izbori u planu; preuređivanje ne povezuje nepovezane vežbe; bodyweight, zagrevanje i po strani ostaju funkcionalni.
5. Recovery i skokovi: vežbe na vreme ili ponavljanja bez izmišljene težine; opciono easy trčanje može ostati preskočeno.
6. Petak A/B i long run: zasebni šabloni, promenljive ciljne distance, neobavezni delovi; planirano nije uključeno u ostvarene zbirove.
7. Iz plana/Ponovi trening: današnji datum, prazni rezultati, nezavisan izvor; otkazivanje zamene ne gubi postojeći nacrt.
8. Konfiguracija: preimenovanje grupe ne menja ponašanje, nove opcije se pojavljuju, raniji izbori opstaju posle promene mesta prikaza, filter nalazi oznake delova.
9. Stari zapis: otvaranje i izmena čuvaju vrednosti i dodatne ključeve; arhivirana vežba ostaje dostupna u svom istorijskom kontekstu.
10. Telefon i desktop: nema horizontalnog skrolovanja pri širini 375 px, izbori i akcije dostupni tastaturom, vidljiv fokus, oba režima boja; greška čuvanja ne resetuje unos.

Validacija implementacije: smisleni unit testovi adaptacije, kopiranja bez rezultata, validacije, veza superserija i nepotpunih zbirova; provera transakcionog čuvanja i migracije u test bazi; ručna/provera kroz browser reprezentativnih tokova, zatim typecheck, relevantni testovi i build. Ova dokumentaciona izmena ne zahteva pokretanje aplikacionih testova.

## Van prve verzije

Automatski uvoz sa Strave, GPS i tajmer tokom treninga, automatsko programiranje treninga/smenjivanje nedelja, medicinska procena oporavka, merenje svakog sprinta zasebno i kalendarsko zakazivanje. Strava link, postojeći trening-splitovi i sve konfigurabilne opcije ostaju podržani.
