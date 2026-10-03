# Ciljevi kao fondovi i novi Life OS znak

Korisnik je odobrio dizajn: cilj određuje iznos i valutu; novac rezervisan za cilj može biti na više računa u različitim valutama. Logo i ikonica rade se paralelno, uz autonomni izbor izgleda.

- [x] Backend: cilj nezavisan od računa, rezervacije u izvornoj valuti, preračunavanje postojećim kursevima, izvor/vreme/zastarelost, nepoznata ukupna vrednost kad kurs nedostaje; transakcijska zaštita slobodnog salda; budžeti zadržavaju istu valutu.
- [x] UI: forma cilja bez računa, Dodaj sredstva, raspodela po računima i izmena/oslobađanje rezervacije, manjak/missing FX upozorenja; isti napredak na ciljevima, finansijskom pregledu i početnoj.
- [x] Migracija: stari account_id ostaje kao opciona istorijska referenca. Postojeće eksplicitne rezervacije se čuvaju; ceo saldo se ne rezerviše automatski. Stari ciljevi bez rezervacija dobijaju objašnjenje i izbor iznosa.
- [x] Brend: isti vektorski znak u desktop/mobile navigaciji, favicon i PWA icon assets, provera veličina i izgleda.
- [x] Verifikacija: EUR+RSD zbir, nedostajući/stari kursevi, prevelike/konkurentne rezervacije, promena valute cilja, istorija/migracija, UI/mobile; unit, finansijske integracije, typecheck/lint/build.

Računi nastavljaju da pokazuju stvarne salde; rezervacija ne stvara transakciju. Ako saldo padne ispod ukupnih rezervacija, ciljevi povezani s tim računom jasno pokazuju manjak i ne predstavljaju 100% rezervacija kao bezuslovno ispunjen cilj.

## Završna provera

- 400 unit testova, 119 PostgreSQL integracionih testova; typecheck, lint i produkcijski build prolaze.
- Izolovana Chrome provera u privremenoj bazi: kreiranje fonda, 800 EUR + 25.000 RSD pri kursu 0,008 EUR/RSD = 1.000 EUR; izmena i oslobađanje rezervacija; početna, finansijski pregled i namene računa; širina 360 px bez prelivanja i bez browser grešaka. Privremena baza je obrisana.
- Tri Playwright provere na produkcijskom buildu prolaze, uključujući kratke Q1–Q4 oznake i zelenu Q2.
- Novi brend proveren u desktop/mobile navigaciji; svi javni icon, favicon i Apple icon endpoint-i dostupni bez prijave.
- Migracija 0008 primenjena lokalno. Lokalni serveri korišćeni za proveru su ugašeni.

## BTC i ETH računi

Dodate aktivne valute za native crypto wallets u seed i migraciju 0009 (primenjena lokalno). BTC/ETH preciznost čuva najmanje jedinice pri knjiženju i prikazu; kripto salda i rezervacije koriste postojeće EUR market quotes, ručne cene instrumenta i ručne FX kurseve (FX override ima prednost). NBS refresh ne pokušava da pribavi fiat kurs za BTC/ETH. EUR ostaje podrazumevana valuta novih običnih računa i budžeta.

Provere: 402 unit testa, 122 integraciona testa; posle dopune ručnih kripto cena 15 fokusiranih integracionih testova; 4 Chrome UI testa na završnom produkcijskom buildu; lint/typecheck/build prolaze. Test server ugašen. Najmanje jedinice proverene prema [Bitcoin vocabulary](https://bitcoin.org/en/vocabulary) i [Ethereum ether units](https://ethereum.org/developers/docs/intro-to-ether).
