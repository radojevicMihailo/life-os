import { ZodError } from "zod";

import {
  ApplicationError,
  type ApplicationErrorCode,
} from "../application/ports";
import { IdempotencyConflictError } from "../application/idempotency";
import { DomainError, type DomainErrorCode } from "../domain/errors";

export type ApiErrorCode =
  | ApplicationErrorCode
  | DomainErrorCode
  | "idempotency_conflict"
  | "idempotency_key_required"
  | "internal_error"
  | "unauthorized"
  | "validation_error";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

const messages: Record<ApiErrorCode, string> = {
  account_classification_unsupported: "Vrsta računa nije podržana.",
  account_has_active_goals: "Račun se ne može arhivirati dok ima aktivne ciljeve.",
  account_inactive: "Izabrani račun nije aktivan.",
  account_not_found: "Izabrani račun ne postoji.",
  account_system_archive_forbidden: "Sistemski račun se ne može arhivirati.",
  budget_currency_mismatch: "Valuta budžeta se ne može promeniti.",
  budget_month_invalid: "Mesec budžeta nije ispravan.",
  category_classification_mismatch: "Kategorija nije odgovarajuće vrste.",
  category_inactive: "Izabrana kategorija nije aktivna.",
  category_not_found: "Izabrana kategorija ne postoji.",
  category_system_archive_forbidden: "Sistemska kategorija se ne može arhivirati.",
  currency_invalid: "Valuta nije ispravna.",
  currency_minor_unit_invalid: "Preciznost valute nije ispravna.",
  currency_not_found: "Valuta ne postoji.",
  goal_account_must_be_asset: "Cilj mora biti vezan za imovinski račun.",
  goal_currency_mismatch: "Valuta cilja mora odgovarati valuti računa.",
  goal_name_required: "Naziv cilja je obavezan.",
  goal_not_found: "Cilj ne postoji.",
  instrument_inactive: "Izabrani instrument nije aktivan.",
  instrument_not_found: "Izabrani instrument ne postoji.",
  investment_account_inactive: "Izabrani investicioni račun nije aktivan.",
  investment_account_not_found: "Izabrani investicioni račun ne postoji.",
  investment_asset_class_unsupported: "Vrsta instrumenta nije podržana.",
  investment_backfill_after_disposal:
    "Naknadna kupovina zahteva obnovu već knjiženih prodaja.",
  investment_backdated_sale_after_disposal:
    "Naknadna prodaja zahteva obnovu već knjiženih prodaja.",
  investment_cash_currency_mismatch: "Valuta gotovinskog računa nije odgovarajuća.",
  investment_eur_fx_rate_not_identity: "Kurs EUR prema EUR mora biti jedan.",
  investment_fee_exceeds_amount: "Naknada ne može biti veća od iznosa.",
  investment_journal_correction_unsupported:
    "Investiciona transakcija se ne može ispraviti opštom ispravkom.",
  investment_provider_mismatch: "Izabrani izvor ne odgovara instrumentu.",
  investment_provider_resolution_failed: "Izvor nije potvrdio instrument i cenu.",
  investment_quantity_insufficient: "Nema dovoljno raspoložive količine.",
  investment_reporting_currency_unsupported: "Izveštajna valuta nije podržana.",
  investment_trade_currency_mismatch: "Valute investicione transakcije se ne podudaraju.",
  idempotency_conflict:
    "Idempotency-Key je već upotrebljen za drugačiji zahtev.",
  idempotency_key_required: "Nedostaje Idempotency-Key zaglavlje.",
  internal_error: "Došlo je do neočekivane greške.",
  journal_already_corrected: "Transakcija je već ispravljena.",
  journal_category_required: "Kategorija je obavezna.",
  journal_counterparty_required: "Druga strana je obavezna.",
  journal_minimum_postings: "Transakcija nema dovoljno stavki.",
  journal_not_found: "Transakcija ne postoji.",
  journal_original_id_required: "Originalna transakcija je obavezna.",
  journal_posting_currency_mismatch: "Valuta stavke nije ispravna.",
  journal_posting_zero_amount: "Iznos stavke ne sme biti nula.",
  journal_reversal_cannot_be_corrected: "Storno transakcija se ne može ispraviti.",
  journal_unbalanced: "Transakcija nije izbalansirana.",
  money_amount_overflow: "Iznos je prevelik.",
  money_currency_mismatch: "Valute iznosa se ne podudaraju.",
  money_currency_unsupported: "Valuta nije podržana.",
  money_invalid_decimal: "Iznos nije ispravan.",
  money_non_positive: "Iznos mora biti veći od nule.",
  money_precision_exceeded: "Iznos ima previše decimala.",
  quantity_invalid_decimal: "Količina nije ispravna.",
  quantity_non_positive: "Količina mora biti veća od nule.",
  quantity_precision_exceeded: "Količina ima previše decimala.",
  rate_invalid_decimal: "Kurs nije ispravan.",
  rate_non_positive: "Kurs mora biti veći od nule.",
  rate_precision_exceeded: "Kurs ima previše decimala.",
  transaction_account_classification_mismatch:
    "Račun nije odgovarajuće vrste za ovu transakciju.",
  transaction_amount_required: "Iznos je obavezan.",
  transaction_fx_amount_required: "Nedostaje iznos ili kurs konverzije.",
  transaction_fx_rate_amount_conflict: "Iznosi i kurs konverzije nisu usklađeni.",
  unauthorized: "Shortcut token nije ispravan.",
  validation_error: "Podaci zahteva nisu ispravni.",
};

export function apiError(code: ApiErrorCode, status: number) {
  return {
    body: { error: { code, message: messages[code] } } satisfies ApiErrorBody,
    status,
  };
}

export function mapApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("validation_error", 400);
  }

  if (error instanceof IdempotencyConflictError) {
    return apiError("idempotency_conflict", 409);
  }

  if (error instanceof ApplicationError || error instanceof DomainError) {
    return apiError(error.code, 422);
  }

  return apiError("internal_error", 500);
}
