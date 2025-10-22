import type { TransactionRecord } from './types';

const SHEET_NAME_FALLBACK = 0;

function inferAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9+\-.,]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '');
    const asFloat = parseFloat(normalized.replace(/,/g, '.'));
    return Number.isNaN(asFloat) ? null : asFloat;
  }

  return null;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createHeaderMap(headers: string[]): Record<string, number> {
  const positions: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(String(header));
    positions[normalized] = index;
  });
  return positions;
}

function pickRowValue(row: unknown[], positions: Record<string, number>, keys: string[]): unknown {
  for (const key of keys) {
    const index = positions[key];
    if (typeof index === 'number') {
      return row[index];
    }
  }
  return undefined;
}

async function readWorkbook(file: File | Blob | ArrayBuffer) {
  const { read, utils } = await import('xlsx');

  let data: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    data = file;
  } else if (file instanceof Blob) {
    data = await file.arrayBuffer();
  } else {
    throw new Error('Unsupported input type for Excel parsing');
  }

  const workbook = read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[SHEET_NAME_FALLBACK];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('No worksheets found in workbook');
  }

  const rows: unknown[][] = utils.sheet_to_json(worksheet, { header: 1, raw: false });
  return rows;
}

export async function parseExcelFile(file: File | Blob | ArrayBuffer): Promise<TransactionRecord[]> {
  const rows = await readWorkbook(file);
  if (!rows.length) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = createHeaderMap(headerRow.map((cell) => String(cell ?? '')));

  const dateKeys = ['date', 'transaction date', 'posted date'];
  const descriptionKeys = ['description', 'memo', 'details', 'transaction'];
  const amountKeys = ['amount', 'transaction amount', 'debit', 'credit', 'value'];
  const categoryKeys = ['category', 'type'];
  const accountKeys = ['account', 'account number', 'card'];

  const transactions: TransactionRecord[] = [];

  for (const row of dataRows) {
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) {
      continue;
    }

    const dateValue = pickRowValue(row, headerMap, dateKeys);
    const descriptionValue = pickRowValue(row, headerMap, descriptionKeys);
    const amountValue = pickRowValue(row, headerMap, amountKeys);

    const amount = inferAmount(amountValue ?? 0);
    const description = descriptionValue ? String(descriptionValue).trim() : '';
    const date = dateValue ? new Date(dateValue as string).toISOString() : '';

    if (!date || !description || amount === null) {
      continue;
    }

    const category = pickRowValue(row, headerMap, categoryKeys);
    const account = pickRowValue(row, headerMap, accountKeys);

    transactions.push({
      date,
      description,
      amount,
      category: category ? String(category) : undefined,
      account: account ? String(account) : undefined,
    });
  }

  return transactions;
}
