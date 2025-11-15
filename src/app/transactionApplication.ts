import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  InMemoryTransactionStore,
  importTransactions,
  type TransactionImportResult,
  type TransactionRecord,
} from '../import/index.js';

export interface TransactionSummary {
  count: number;
  income: number;
  expenses: number;
  netTotal: number;
}

export class TransactionApplication {
  private readonly store = new InMemoryTransactionStore();

  getTransactions(): TransactionRecord[] {
    return this.store.getTransactions();
  }

  getSummary(): TransactionSummary {
    const transactions = this.store.getTransactions();
    const summary = transactions.reduce(
      (acc, transaction) => {
        if (transaction.amount >= 0) {
          acc.income += transaction.amount;
        } else {
          acc.expenses += transaction.amount;
        }
        return acc;
      },
      { count: transactions.length, income: 0, expenses: 0, netTotal: 0 }
    );

    summary.netTotal = summary.income + summary.expenses;
    return summary;
  }

  subscribe(listener: (transactions: TransactionRecord[]) => void): () => void {
    return this.store.subscribe(listener);
  }

  async importFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<TransactionImportResult> {
    const result = await importTransactions(buffer, { fileName });
    const mergedTransactions = [...this.store.getTransactions(), ...result.transactions];
    this.store.setTransactions(mergedTransactions);
    return result;
  }

  async importFromPath(filePath: string): Promise<TransactionImportResult> {
    const fileBuffer = await readFile(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    return this.importFromBuffer(arrayBuffer, basename(filePath));
  }
}
