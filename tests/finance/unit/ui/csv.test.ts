import { describe, expect, it } from "vitest";

import {
  createCsvStream,
  createExportDownloadHandler,
  csvDecimal,
} from "@/modules/finance/ui/csv";

async function streamText(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

describe("CSV exports", () => {
  it("uses RFC 4180 escaping and protects textual spreadsheet formulas without changing decimal strings", async () => {
    const csv = await streamText(createCsvStream(
      ["ID", "Opis", "Iznos"],
      [["txn-1", "=SUM(1,2)\"\r\nAna", csvDecimal("-12.3400")]],
    ));

    expect(csv).toBe(
      "ID,Opis,Iznos\r\ntxn-1,\"'=SUM(1,2)\"\"\r\nAna\",-12.3400\r\n",
    );
  });

  it("requires same-origin session authentication and returns a UTF-8 no-store CSV download", async () => {
    const handler = createExportDownloadHandler({
      buildCsv: async () => ({
        headers: ["ID", "Naziv"],
        rows: [["account-1", "Račun"]],
      }),
      buildFullExport: async () => ({ meta: { schemaVersion: 1 } }),
      requireSameOrigin: () => undefined,
      requireWebSession: async () => undefined,
    });

    const response = await handler("accounts")(
      new Request("https://finance.example.com/settings/exports/accounts", {
        headers: { origin: "https://finance.example.com" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename=\"finansije-racuni.csv\"; filename*=UTF-8''finansije-ra%C4%8Duni.csv",
    );
    expect(await response.text()).toBe("ID,Naziv\r\naccount-1,Račun\r\n");
  });

  it("rejects a download that has no verifiable Origin", async () => {
    const handler = createExportDownloadHandler({
      buildCsv: async () => ({ headers: [], rows: [] }),
      buildFullExport: async () => ({}),
      requireSameOrigin: () => { throw { code: "invalid_origin" }; },
      requireWebSession: async () => undefined,
    });

    const response = await handler("json")(
      new Request("https://finance.example.com/settings/exports/json", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "invalid_origin" });
  });

  it("cancels the underlying async iterator and lets its producer settle", async () => {
    let releaseNext: ((value: IteratorResult<readonly string[]>) => void) | undefined;
    let returned = false;
    let producerSettled = false;
    let notifyNextStarted: () => void;
    const nextStarted = new Promise<void>((resolve) => { notifyNextStarted = resolve; });
    const rows: AsyncIterable<readonly string[]> = {
      [Symbol.asyncIterator]() {
        return {
          next: () => {
            notifyNextStarted();
            return new Promise<IteratorResult<readonly string[]>>((resolve) => {
              releaseNext = resolve;
            });
          },
          return: async () => {
            returned = true;
            releaseNext?.({ done: true, value: undefined });
            return { done: true, value: undefined };
          },
        };
      },
    };
    const iterator = rows[Symbol.asyncIterator]();
    const producer = iterator.next().then(() => { producerSettled = true; });
    const stream = createCsvStream(["ID"], {
      [Symbol.asyncIterator]: () => iterator,
    });
    const reader = stream.getReader();

    await reader.read();
    await nextStarted;
    await reader.cancel("download-abandoned");

    expect(returned).toBe(true);
    await producer;
    expect(producerSettled).toBe(true);
  });
});
