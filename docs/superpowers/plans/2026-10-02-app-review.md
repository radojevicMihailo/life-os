# Pregled aplikacije i ujednačavanje tokova

Korisnik je odobrio da osmislimo i sprovedemo izmene samostalno. Radimo u postojećoj radnoj kopiji, bez commit-a. Ne menjamo postojeće primenjene migracije.

- [x] Ujednačen birač datuma/vremena: centralni Input, svi finansijski unosi, tastatura, mobilni prikaz, kontrolisani i FormData unosi.
- [x] Namena novca: rezervacije po računu za postojeći cilj ili budžet; izvorna valuta, slobodan saldo, vidljiv manjak, transakcijsko sprečavanje prevelikih rezervacija.
- [x] Fiksni Q1–Q4 i konteksti na jednoj stranici: nova migracija čuva stare veze u backup tabelama pre mapiranja; stare rute preusmeravaju; nema konfiguracije prioriteta.
- [x] Podešavanja iznad teme/odjave, dostupna na telefonu; notifikacije na /settings; zadaci otvaraju kalendar.
- [x] Tačno 100 čestih namirnica iz USDA podataka: izvor, sirovo/kuvano, ponovljiv seed bez prepisivanja korisničkih unosa; primeniti na lokalnu bazu.
- [x] Pregled ostalih modula, popravke dokazanih grešaka: ciljani regresioni testovi; typecheck, lint, unit test suite, build i pregled u browseru; provera migracija i seeda.

Početno stanje: čista radna kopija; 342 testa prolaze, typecheck/lint prolaze; lokalna unified baza ima 2 zadatka, 0 prioriteta, 0 namirnica, migracije 0000–0004.

Rezultati: 389 unit testova; 116 finansijskih integracionih testova plus test migracije prioriteta; typecheck/lint čisti; 28 stranica provereno u Chrome-u bez JS grešaka; 3 browser testa navigacije/birača/mobilnog kalendara; stvarna provera čuvanja ponavljajućeg zadatka. Migracije 0005/0006 primenjene lokalno; 100 namirnica uneto, drugi seed ubacio 0. Dodatno popravljeni vreme i nutritivna istorija obroka, nizovi navika preko 30 dana i identitet redova treninga. Produkcioni build prolazi. Završni pregled je dodatno blokirao nove stavke obroka iz arhiviranih namirnica uz očuvanje stare istorije.

Naknadni zahtev: Q2 zelena (#22c55e), nova migracija 0007; 12 dodatnih vrsta mesa iz USDA (ukupno112); ponovljeni seed ne pravi duplikate. Portovi pregledani u docs/local-ports.md. Korisnik odobrio commit i push celog rada.
