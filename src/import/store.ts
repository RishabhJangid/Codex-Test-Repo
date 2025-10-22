import type { TransactionRecord } from './types';

type Listener = (transactions: TransactionRecord[]) => void;

export class InMemoryTransactionStore {
  private transactions: TransactionRecord[] = [];

  private listeners: Set<Listener> = new Set();

  setTransactions(newTransactions: TransactionRecord[]) {
    this.transactions = [...newTransactions];
    this.emit();
  }

  getTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getTransactions());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.getTransactions());
    }
  }
}
