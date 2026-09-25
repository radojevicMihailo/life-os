import type { ExportCsvDataset } from "@/modules/finance/application/exports";
import { createExportDownloadHandler, type CsvDataset } from "@/modules/finance/ui/csv";

export function createProductionExportPost(dataset: CsvDataset | "json") {
  let handler: ((request: Request) => Promise<Response>) | undefined;

  return async function post(request: Request) {
    if (!handler) {
      const [
        { buildCsvDocument, buildFullExport },
        { requireSameOrigin },
        { unitOfWork },
      ] = await Promise.all([
        import("@/modules/finance/application/exports"),
        import("@/modules/finance/auth/origin"),
        import("@/modules/finance/db/unit-of-work"),
      ]);
      const dependencies = { clock: { now: () => new Date() }, unitOfWork };
      handler = createExportDownloadHandler({
        buildCsv: (csvDataset) => buildCsvDocument(dependencies, csvDataset as ExportCsvDataset),
        buildFullExport: () => buildFullExport(dependencies),
        requireSameOrigin,
        requireWebSession: async () => undefined,
      })(dataset);
    }
    return handler(request);
  };
}
