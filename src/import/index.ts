import { parseExcelFile } from './excelParser';
import { parsePdfFile } from './pdfParser';
import { InMemoryTransactionStore } from './store';
import type {
  SupportedFileType,
  TransactionImportResult,
  TransactionParser,
  TransactionRecord,
} from './types';

const parsers: TransactionParser[] = [
  {
    canParse: (file, fileName = '') => {
      const nameMatches = /\.(xlsx|xlsm|xls)$/i.test(fileName);
      const typeMatches = file instanceof Blob && /spreadsheet|excel/i.test(file.type);
      return nameMatches || typeMatches;
    },
    parse: (file) => parseExcelFile(file),
  },
  {
    canParse: (file, fileName = '') => {
      const nameMatches = /\.pdf$/i.test(fileName);
      const typeMatches = file instanceof Blob && file.type === 'application/pdf';
      return nameMatches || typeMatches;
    },
    parse: (file) => parsePdfFile(file),
  },
];

function resolveFileName(file: File | Blob | ArrayBuffer, providedName?: string): string {
  if (providedName) {
    return providedName;
  }

  if (typeof File !== 'undefined' && file instanceof File) {
    return file.name;
  }

  return 'uploaded-file';
}

function resolveFileSize(file: File | Blob | ArrayBuffer): number | undefined {
  if (file instanceof ArrayBuffer) {
    return file.byteLength;
  }

  if (typeof File !== 'undefined' && file instanceof File) {
    return file.size;
  }

  if (file instanceof Blob) {
    return file.size;
  }

  return undefined;
}

export function detectFileType(
  file: File | Blob | ArrayBuffer,
  fileName = resolveFileName(file)
): SupportedFileType {
  if (/\.(xlsx|xlsm|xls)$/i.test(fileName) || (typeof File !== 'undefined' && file instanceof File && /spreadsheet|excel/i.test(file.type))) {
    return 'excel';
  }

  if (/\.pdf$/i.test(fileName) || (typeof File !== 'undefined' && file instanceof File && file.type === 'application/pdf')) {
    return 'pdf';
  }

  return 'unknown';
}

export async function importTransactions(
  file: File | Blob | ArrayBuffer,
  options?: { fileName?: string }
): Promise<TransactionImportResult> {
  const fileName = resolveFileName(file, options?.fileName);
  const parser = parsers.find((candidate) => candidate.canParse(file, fileName));

  if (!parser) {
    throw new Error(`No parser available for file: ${fileName}`);
  }

  const transactions: TransactionRecord[] = await parser.parse(file);

  return {
    transactions,
    sourceName: fileName,
    metadata: {
      importedAt: new Date().toISOString(),
      fileSize: resolveFileSize(file),
    },
  };
}

export * from './types';
export { InMemoryTransactionStore };
