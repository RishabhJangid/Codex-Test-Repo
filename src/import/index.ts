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
      const typeMatches = file instanceof File && /spreadsheet|excel/i.test(file.type);
      return nameMatches || typeMatches;
    },
    parse: (file) => parseExcelFile(file),
  },
  {
    canParse: (file, fileName = '') => {
      const nameMatches = /\.pdf$/i.test(fileName);
      const typeMatches = file instanceof File && file.type === 'application/pdf';
      return nameMatches || typeMatches;
    },
    parse: (file) => parsePdfFile(file),
  },
];

export function detectFileType(file: File | Blob, fileName = file instanceof File ? file.name : ''): SupportedFileType {
  if (/\.(xlsx|xlsm|xls)$/i.test(fileName) || (file instanceof File && /spreadsheet|excel/i.test(file.type))) {
    return 'excel';
  }

  if (/\.pdf$/i.test(fileName) || (file instanceof File && file.type === 'application/pdf')) {
    return 'pdf';
  }

  return 'unknown';
}

export async function importTransactions(file: File | Blob): Promise<TransactionImportResult> {
  const fileName = file instanceof File ? file.name : 'uploaded-file';
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
      fileSize: file instanceof File ? file.size : undefined,
    },
  };
}

export * from './types';
export { InMemoryTransactionStore };
