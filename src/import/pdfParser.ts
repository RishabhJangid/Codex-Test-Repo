import type { TransactionRecord } from './types';

interface PdfTextItem {
  str: string;
}

interface PdfPageProxy {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
}

interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
}

async function extractTextLines(file: File | Blob | ArrayBuffer): Promise<string[]> {
  let pdfjsModule: any;
  try {
    pdfjsModule = await import('pdfjs-dist');
  } catch (error) {
    pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.js');
  }

  const pdfjs = (pdfjsModule as { default?: unknown } & typeof import('pdfjs-dist')).default
    ? (pdfjsModule as { default: typeof import('pdfjs-dist') }).default
    : pdfjsModule;

  const { getDocument, GlobalWorkerOptions } = pdfjs as typeof import('pdfjs-dist');
  if (!GlobalWorkerOptions.workerSrc) {
    try {
      GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.js', import.meta.url).toString();
    } catch (error) {
      console.warn('Failed to set pdf.js worker, defaulting to auto-loading.', error);
    }
  }

  let data: ArrayBuffer;
  if (file instanceof ArrayBuffer) {
    data = file;
  } else if (file instanceof Blob) {
    data = await file.arrayBuffer();
  } else {
    throw new Error('Unsupported input type for PDF parsing');
  }

  const loadingTask = getDocument({ data });
  const pdf: PdfDocumentProxy = await loadingTask.promise;

  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => (item as PdfTextItem).str).join('\n');

    const pageLines = pageText
      .split(/\n+/)
      .map((segment) => segment.replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean);

    lines.push(...pageLines);
  }

  return lines;
}

const DATE_REGEX = /(?:(\d{4}-\d{2}-\d{2})|(\d{2}[\/.-]\d{2}[\/.-]\d{2,4}))/;
const AMOUNT_REGEX = /([+-]?\$?\s?-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;

function parseCurrency(value: string): number | null {
  const sanitized = value.replace(/[^0-9+\-.,]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '');
  const parsed = parseFloat(sanitized.replace(/,/g, '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeDate(raw: string): string | null {
  const isoCandidate = new Date(raw);
  if (Number.isNaN(isoCandidate.getTime())) {
    return null;
  }
  return isoCandidate.toISOString();
}

export async function parsePdfFile(file: File | Blob | ArrayBuffer): Promise<TransactionRecord[]> {
  const lines = await extractTextLines(file);
  const transactions: TransactionRecord[] = [];

  for (const line of lines) {
    const dateMatch = line.match(DATE_REGEX);
    const amountMatch = line.match(AMOUNT_REGEX);

    if (!dateMatch || !amountMatch) {
      continue;
    }

    const date = normalizeDate(dateMatch[0]);
    const amount = parseCurrency(amountMatch[0]);

    if (!date || amount === null) {
      continue;
    }

    const description = line
      .replace(dateMatch[0], '')
      .replace(amountMatch[0], '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!description) {
      continue;
    }

    transactions.push({
      date,
      description,
      amount,
    });
  }

  return transactions;
}
