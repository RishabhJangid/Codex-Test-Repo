const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const summaryPanel = document.getElementById('import-summary');
const summaryFile = document.getElementById('summary-file');
const summaryCount = document.getElementById('summary-count');
const summaryTotal = document.getElementById('summary-total');
const summaryTableBody = document.querySelector('#summary-table tbody');
const summaryError = document.getElementById('summary-error');

function createMemoryStore() {
  let transactions = [];
  const listeners = new Set();

  return {
    setTransactions(newTransactions) {
      transactions = [...newTransactions];
      listeners.forEach((listener) => listener([...transactions]));
    },
    subscribe(listener) {
      listeners.add(listener);
      listener([...transactions]);
      return () => listeners.delete(listener);
    },
    getTransactions() {
      return [...transactions];
    },
  };
}

const store = createMemoryStore();
let hasImportedOnce = false;

let importerPromise;
async function loadImporter() {
  if (!importerPromise) {
    importerPromise = import('./dist/import/index.js').catch((error) => {
      console.error('Failed to load transaction importer.', error);
      throw new Error('Importer module is unavailable. Build the TypeScript sources to enable parsing.');
    });
  }
  return importerPromise;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function renderTransactions(transactions) {
  if (!transactions.length) {
    if (!hasImportedOnce) {
      summaryPanel.hidden = true;
      return;
    }
    summaryPanel.hidden = false;
    if (summaryError) {
      summaryError.hidden = true;
      summaryError.textContent = '';
    }
    summaryFile.textContent = 'No transactions detected';
    summaryCount.textContent = '0';
    summaryTotal.textContent = formatCurrency(0);
    summaryTableBody.innerHTML = '';
    return;
  }

  summaryPanel.hidden = false;
  if (summaryError) {
    summaryError.hidden = true;
    summaryError.textContent = '';
  }
  summaryCount.textContent = String(transactions.length);
  const total = transactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
  summaryTotal.textContent = formatCurrency(total);

  summaryTableBody.innerHTML = '';
  transactions.slice(0, 5).forEach((transaction) => {
    const row = document.createElement('tr');

    const dateCell = document.createElement('td');
    dateCell.textContent = new Date(transaction.date).toLocaleDateString();
    row.appendChild(dateCell);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = transaction.description;
    row.appendChild(descriptionCell);

    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(transaction.amount);
    amountCell.classList.add('numeric');
    row.appendChild(amountCell);

    const categoryCell = document.createElement('td');
    categoryCell.textContent = transaction.category || '—';
    row.appendChild(categoryCell);

    const accountCell = document.createElement('td');
    accountCell.textContent = transaction.account || '—';
    row.appendChild(accountCell);

    summaryTableBody.appendChild(row);
  });
}

store.subscribe(renderTransactions);

async function handleFiles(fileList) {
  const [file] = fileList;
  if (!file) {
    return;
  }

  summaryFile.textContent = file.name;

  try {
    const importerModule = await loadImporter();
    const result = await importerModule.importTransactions(file);
    hasImportedOnce = true;
    if (summaryError) {
      summaryError.hidden = true;
      summaryError.textContent = '';
    }
    summaryFile.textContent = result.sourceName || file.name;
    store.setTransactions(result.transactions);
  } catch (error) {
    console.error(error);
    hasImportedOnce = true;
    summaryFile.textContent = `${file.name} (failed to import)`;
    summaryCount.textContent = '0';
    summaryTotal.textContent = formatCurrency(0);
    summaryTableBody.innerHTML = '';
    summaryPanel.hidden = false;
    if (summaryError) {
      summaryError.hidden = false;
      summaryError.textContent =
        error instanceof Error ? error.message : 'Unable to import the selected file.';
    }
  }
}

if (dropZone && fileInput) {
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('is-dragover');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragover');
    const files = event.dataTransfer?.files;
    if (files?.length) {
      handleFiles(files);
    }
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (event) => {
    const target = event.target;
    if (target?.files?.length) {
      handleFiles(target.files);
      target.value = '';
    }
  });
}
