# Codex-Test-Repo

This repository now contains a complete transaction-import application that can be run either
through a lightweight CLI or an HTTP server. The core import logic lives under `src/import`, while
the `TransactionApplication` class wires the parsers, summary helpers, and in-memory store together
for both entry points.

## Getting started

```bash
npm install
npm run build
```

The TypeScript compiler outputs JavaScript into `public/dist`.

## Command line usage

The CLI imports the transactions in a spreadsheet or PDF file, prints a summary, and displays the
first few parsed rows.

```bash
npm run cli -- ./path/to/statement.xlsx
```

## HTTP server

You can also host the importer behind a minimal JSON API:

```bash
npm run start:server
```

Endpoints:

* `POST /import` with a JSON body such as `{ "path": "./statement.pdf" }` to parse a file that is
  readable by the server process.
* `GET /transactions` returns every transaction currently held in memory.
* `GET /summary` reports basic income/expense totals for the in-memory data set.
