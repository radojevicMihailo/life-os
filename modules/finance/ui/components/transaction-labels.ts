import type { JournalSource, JournalType } from "../../domain/ledger";
export const transactionTypeLabels: Record<JournalType, string> = {
    income: "Prihod", expense: "Rashod", transfer: "Prenos", foreign_exchange: "Zamena valuta",
    opening_balance: "Početno stanje", correction: "Ispravka", receivable_out: "Dato potraživanje",
    receivable_repayment: "Naplata potraživanja", investment_trade: "Investiciona transakcija", fee: "Naknada",
};
export const transactionSourceLabels: Record<JournalSource, string> = { web: "Aplikacija", shortcut: "Prečica", seed: "Početni podaci", system: "Sistem" };
