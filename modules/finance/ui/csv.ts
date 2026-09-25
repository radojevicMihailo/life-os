export interface CsvDecimal {
  readonly kind: "decimal";
  readonly value: string;
}

export type CsvValue = CsvDecimal | boolean | number | string | null | undefined;

export type CsvDataset =
  | "transactions"
  | "accounts"
  | "budgets"
  | "goals"
  | "positions"
  | "lots"
  | "investment-activity";

export interface CsvDocument {
  headers: readonly string[];
  rows: AsyncIterable<readonly CsvValue[]> | Iterable<readonly CsvValue[]>;
}

export interface ExportDownloadDependencies {
  buildCsv(dataset: CsvDataset): Promise<CsvDocument>;
  buildFullExport(): Promise<unknown>;
  requireSameOrigin(request: Request): void;
  requireWebSession(request: Request): Promise<unknown>;
}

const formulaPrefix = /^[=+\-@]/;
const encoder = new TextEncoder();

export function csvDecimal(value: string): CsvDecimal {
  return { kind: "decimal", value };
}

function csvCell(value: CsvValue) {
  let text: string;

  if (value === null || value === undefined) {
    text = "";
  } else if (typeof value === "object" && value.kind === "decimal") {
    text = value.value;
  } else {
    text = String(value);
    if (formulaPrefix.test(text)) text = `'${text}`;
  }

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createCsvStream(
  headers: readonly string[],
  rows: AsyncIterable<readonly CsvValue[]> | Iterable<readonly CsvValue[]>,
): ReadableStream<Uint8Array> {
  const iterator = Symbol.asyncIterator in rows
    ? rows[Symbol.asyncIterator]()
    : rows[Symbol.iterator]();
  let sentHeaders = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!sentHeaders) {
        sentHeaders = true;
        controller.enqueue(encoder.encode(`${headers.map(csvCell).join(",")}\r\n`));
        return;
      }

      const row = await iterator.next();
      if (row.done) {
        controller.close();
        return;
      }

      controller.enqueue(encoder.encode(`${row.value.map(csvCell).join(",")}\r\n`));
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}

const filenames: Record<CsvDataset | "json", string> = {
  accounts: "finansije-računi.csv",
  budgets: "finansije-budžeti.csv",
  goals: "finansije-ciljevi.csv",
  "investment-activity": "finansije-investiciona-aktivnost.csv",
  json: "finansije-kompletan-izvoz.json",
  lots: "finansije-lotovi.csv",
  positions: "finansije-pozicije.csv",
  transactions: "finansije-transakcije.csv",
};

function contentDisposition(filename: string) {
  const fallback = filename
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9._-]/g, "-");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function noStoreHeaders(filename: string, contentType: string) {
  return {
    "Cache-Control": "no-store",
    "Content-Disposition": contentDisposition(filename),
    "Content-Type": contentType,
  };
}

function authErrorResponse(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "invalid_origin") {
      return Response.json({ error: "invalid_origin" }, {
        headers: { "Cache-Control": "no-store" }, status: 403,
      });
    }
    if (error.code === "unauthorized") {
      return Response.json({ error: "unauthorized" }, {
        headers: { "Cache-Control": "no-store" }, status: 401,
      });
    }
  }
  throw error;
}

export function createExportDownloadHandler(dependencies: ExportDownloadDependencies) {
  return (dataset: CsvDataset | "json") => async (request: Request) => {
    try {
      dependencies.requireSameOrigin(request);
      await dependencies.requireWebSession(request);
    } catch (error) {
      return authErrorResponse(error);
    }

    if (dataset === "json") {
      return Response.json(await dependencies.buildFullExport(), {
        headers: noStoreHeaders(filenames.json, "application/json; charset=utf-8"),
      });
    }

    const document = await dependencies.buildCsv(dataset);
    return new Response(createCsvStream(document.headers, document.rows), {
      headers: noStoreHeaders(filenames[dataset], "text/csv; charset=utf-8"),
    });
  };
}
