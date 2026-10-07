"use client";

import { Info } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function InvestmentGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-medium text-blue-100 hover:bg-blue-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
          <Info aria-hidden="true" className="size-4" />
          Uputstvo
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden border border-white/10 bg-[#08152b] p-5 text-slate-100 sm:max-w-3xl sm:p-6">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="text-xl leading-snug">Kako da popuniš investicije</DialogTitle>
          <DialogDescription className="text-slate-400">Redosled unosa, značenje polja i primeri. Koristi podatke sa izveštaja svog brokera.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain pr-2 text-sm leading-6 text-slate-300">
          <section>
            <h2 className="mb-2 font-semibold text-white">1. Pripremi novčani i investicioni račun</h2>
            <p>U Finansije → Računi prvo dodaj novčani račun koji predstavlja gotovinu kod brokera, u valuti u kojoj trguješ. Ako već postoji, koristi njega. Novac koji prebacuješ sa banke brokeru evidentiraj kao transfer između računa.</p>
            <p className="mt-2">Na ovoj stranici, u „Investicioni račun”, unesi naziv portfolija (npr. „Moj broker — EUR”) i pod „Novčani račun brokera” izaberi odgovarajući račun. Kupovina, prodaja, dividenda i naknada automatski menjaju njegov novčani saldo.</p>
            <p className="mt-2">Valuta trgovine mora biti ista kao valuta povezanog novčanog računa. Za trgovine u drugoj valuti koristi investicioni račun povezan sa novčanim računom u toj valuti.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-white">2. Dodaj instrument koji želiš da pratiš</h2>
            <dl className="space-y-2">
              <div><dt className="font-medium text-slate-100">Simbol i naziv</dt><dd>Simbol je oznaka instrumenta kod izvora cena; naziv je puno ime koje ćeš prepoznavati u portfoliju.</dd></div>
              <div><dt className="font-medium text-slate-100">Klasa i valuta kotacije</dt><dd>Izaberi Akcija, ETF ili Kripto. Valuta kotacije je valuta u kojoj izvor objavljuje cenu, npr. USD ili EUR; ne mora biti ista kao valuta tvoje trgovine.</dd></div>
              <div><dt className="font-medium text-slate-100">Izvor instrumenta</dt><dd>Za akcije i ETF-ove koristi Alpha Vantage, a za kripto CoinGecko. Izvor mora biti podešen u aplikaciji da bi provera cene uspela.</dd></div>
              <div><dt className="font-medium text-slate-100">Stabilni provider ID</dt><dd>Za kripto je obavezan ID sa CoinGecko-a, npr. „bitcoin” za BTC ili „ethereum” za ETH. Za akcije i ETF-ove aplikacija ga pronalazi pri proveri simbola.</dd></div>
              <div><dt className="font-medium text-slate-100">ISIN i berza</dt><dd>Opcioni podaci za identifikaciju akcije ili ETF-a. Prepiši ih iz podataka brokera ako ih imaš.</dd></div>
            </dl>
            <p className="mt-2">Klikni „Proveri cenu i dodaj”. Instrument se dodaje tek kada izvor potvrdi instrument, valutu i cenu. Ako provera ne uspe, proveri simbol, berzu, valutu i podešavanje izvora.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-white">3. Unesi ono što već poseduješ — Početne pozicije</h2>
            <p>Ovaj deo koristi za ulaganja koja si imao pre početka vođenja evidencije. Početni lot dodaje količinu i nabavnu osnovicu, bez skidanja novca sa računa brokera. Istu kupovinu nemoj ponovo unositi kroz investicionu aktivnost.</p>
            <dl className="mt-2 space-y-2">
              <div><dt className="font-medium text-slate-100">Investicioni račun i početna količina</dt><dd>Izaberi portfolio u kojem držiš instrument i unesi broj jedinica koje još poseduješ.</dd></div>
              <div><dt className="font-medium text-slate-100">Datum i cena sticanja</dt><dd>Unesi datum originalne kupovine i cenu po jednoj jedinici, bez naknade. Ovo nije današnja tržišna cena niti ukupan iznos kupovine.</dd></div>
              <div><dt className="font-medium text-slate-100">Valuta sticanja i početne naknade</dt><dd>Valuta je ona u kojoj si platio kupovinu. Naknade su ukupan trošak te kupovine; unesi 0 ako ih nije bilo.</dd></div>
              <div><dt className="font-medium text-slate-100">Kurs prema EUR za početni lot</dt><dd>Unesi koliko EUR je vredela jedna jedinica valute sticanja na datum kupovine. Za EUR unesi 1.</dd></div>
            </dl>
            <p className="mt-2 rounded-xl bg-white/5 p-3">Primer: 10 jedinica po 100 EUR, naknada 2 EUR i kurs 1 daju osnovicu od 1.002 EUR. Ako imaš više kupovina sa različitim datumima ili cenama, sačuvaj svaku kao poseban lot.</p>
            <p className="mt-2">Sva polja početnog lota su potrebna čim počneš da ga popunjavaš. Ako ne poseduješ taj instrument, ostavi njegovu karticu praznu. Sačuvani lotovi su odvojeni unosi — ponovno čuvanje dodaje novi lot.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-white">4. Evidentiraj novu kupovinu ili prodaju</h2>
            <p>U „Kupovina, prodaja, dividenda ili naknada” izaberi operaciju, investicioni račun i instrument.</p>
            <dl className="mt-2 space-y-2">
              <div><dt className="font-medium text-slate-100">Količina investicije</dt><dd>Broj kupljenih ili prodatih jedinica. Unosi se pozitivan broj i za kupovinu i za prodaju.</dd></div>
              <div><dt className="font-medium text-slate-100">Bruto iznos investicije</dt><dd>Ukupan iznos trgovine pre naknade, a ne cena jedne jedinice. Obično je količina × cena po jedinici.</dd></div>
              <div><dt className="font-medium text-slate-100">Naknada investicije</dt><dd>Ukupna naknada brokera za tu trgovinu, u valuti trgovine. Ostavi 0 ako nema naknade.</dd></div>
              <div><dt className="font-medium text-slate-100">Valuta trgovine i kurs prema EUR</dt><dd>Valuta mora odgovarati novčanom računu brokera. Kurs je vrednost jedne jedinice te valute u EUR na datum trgovine. Za EUR je 1; ako 1 USD vredi 0,92 EUR, unesi 0,92, a ne obrnuti kurs.</dd></div>
              <div><dt className="font-medium text-slate-100">Datum i opis investicije</dt><dd>Unesi datum i vreme izvršenja trgovine. Ako datum ostaviš prazan, koristi se trenutno vreme. Opis je opciona beleška, npr. broj potvrde brokera.</dd></div>
            </dl>
            <p className="mt-2 rounded-xl bg-white/5 p-3">Kupovina: 5 jedinica po 100 EUR → količina 5, bruto iznos 500, naknada 2, valuta EUR, kurs 1. Sa novčanog računa odlazi 502 EUR.<br />Prodaja: 2 jedinice po 120 EUR → količina 2, bruto iznos 240, naknada 1. Na novčani račun stiže 239 EUR.</p>
            <p className="mt-2">Prodaja troši najstarije raspoložive lotove prvo (FIFO). Ne možeš prodati više jedinica nego što imaš na izabranom investicionom računu. Sačuvanu trgovinu nemoj dodatno unositi kao običan prihod ili rashod — njen novčani tok je već evidentiran.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-white">5. Dividenda i samostalna naknada</h2>
            <p><strong className="text-slate-100">Dividenda:</strong> izaberi instrument i račun, količinu ostavi praznu, a u „Bruto iznos investicije” upiši iznos koji evidentiraš kao priliv. Aplikacija taj iznos u celosti dodaje novčanom računu; ne obračunava automatski porez niti odbija polje „Naknada investicije”. Ako broker prikazuje bruto i neto isplatu, proveri da uneti priliv odgovara tvom novčanom saldu.</p>
            <p className="mt-2"><strong className="text-slate-100">Naknada:</strong> za zasebnu naknadu izaberi operaciju „Naknada”, količinu ostavi praznu i iznos troška upiši u „Bruto iznos investicije”. Polje „Naknada investicije” ostavi 0 — kod ove operacije koristi se bruto iznos. Taj iznos se skida sa novčanog računa. Naknadu koju si već dodao kupovini ili prodaji nemoj ponavljati ovde.</p>
            <p className="mt-2">Za obe operacije unesi valutu, kurs prema EUR i datum kao kod trgovine. One menjaju gotovinu, ali ne menjaju broj jedinica instrumenta.</p>
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-white">6. Kako da čitaš rezultate</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-slate-100">Pozicije:</strong> količina koju trenutno poseduješ i njena vrednost prema dostupnoj tržišnoj ceni.</li>
              <li><strong className="text-slate-100">Otvorena osnovica:</strong> nabavna vrednost preostalih jedinica, uključujući pripadajuće naknade.</li>
              <li><strong className="text-slate-100">Nerealizovani rezultat:</strong> razlika između tržišne vrednosti i osnovice onoga što još držiš.</li>
              <li><strong className="text-slate-100">Realizovani rezultat:</strong> rezultat prodatih jedinica prema FIFO obračunu.</li>
              <li><strong className="text-slate-100">FIFO lotovi:</strong> pojedinačne kupovine, datum sticanja i preostala količina. „Trgovine i prihodi” prikazuju evidentiranu aktivnost.</li>
              <li><strong className="text-slate-100">Nedostaje cena, kurs ili procena:</strong> podatak za vrednovanje nije dostupan. Proveri izvor i ručne vrednosti u Finansije → Podešavanja; nemoj ponovo unositi kupovinu.</li>
            </ul>
          </section>
          <section>
            <h2 className="mb-2 font-semibold text-white">Pre svakog čuvanja</h2>
            <p>Proveri račun, instrument, datum, valutu i da li unosiš cenu po jedinici (početni lot) ili ukupan iznos (aktivnost). Za decimalne vrednosti koristi zarez, npr. 0,25 ili 1234,56; ne treba znak valute. Iznosi su pozitivni, a naknada može biti 0. Nakon čuvanja proveri pozicije, aktivnost i novčani saldo pre nego što isti unos pošalješ ponovo.</p>
          </section>
        </div>
        <DialogClose asChild>
          <button type="button" className="min-h-11 shrink-0 self-end rounded-xl border border-white/20 px-5 font-medium hover:bg-white/10">Zatvori uputstvo</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
