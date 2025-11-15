import { resolve } from 'node:path';
import { TransactionApplication } from './app/transactionApplication.js';

async function run() {
  const [, , filePath] = process.argv;

  if (!filePath) {
    console.error('Usage: npm run cli -- <path-to-file>');
    process.exit(1);
  }

  const resolvedPath = resolve(process.cwd(), filePath);
  const app = new TransactionApplication();

  try {
    const result = await app.importFromPath(resolvedPath);
    const summary = app.getSummary();

    console.log(`Imported ${result.transactions.length} transactions from ${result.sourceName}.`);
    console.log('Summary');
    console.table([
      {
        'Total Transactions': summary.count,
        Income: summary.income.toFixed(2),
        Expenses: summary.expenses.toFixed(2),
        Net: summary.netTotal.toFixed(2),
      },
    ]);

    console.log('Preview of first five transactions:');
    console.table(result.transactions.slice(0, 5));
  } catch (error) {
    console.error('Failed to import transactions.');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

run();
