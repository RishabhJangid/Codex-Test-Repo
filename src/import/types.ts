export type SupportedFileType = 'excel' | 'pdf' | 'unknown';

export interface TransactionRecord {
  date: string;
  description: string;
  amount: number;
  category?: string;
  account?: string;
}

export interface TransactionImportResult {
  transactions: TransactionRecord[];
  sourceName: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionParser {
  canParse: (file: File | Blob | ArrayBuffer, fileName?: string) => boolean;
  parse: (file: File | Blob | ArrayBuffer) => Promise<TransactionRecord[]>;
}
