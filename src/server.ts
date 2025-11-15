import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { TransactionApplication } from './app/transactionApplication.js';

const app = new TransactionApplication();

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(body, null, 2));
}

async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  const chunks: MinimalBuffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const content = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(content);
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      sendJson(res, 400, { error: 'Missing request URL' });
      return;
    }

    const { method } = req;

    if (method === 'GET' && req.url === '/transactions') {
      sendJson(res, 200, { transactions: app.getTransactions() });
      return;
    }

    if (method === 'GET' && req.url === '/summary') {
      sendJson(res, 200, { summary: app.getSummary() });
      return;
    }

    if (method === 'POST' && req.url === '/import') {
      const payload = (await readRequestBody(req)) as { path?: string };
      if (!payload.path) {
        sendJson(res, 400, { error: 'Body must include a "path" to the file on disk.' });
        return;
      }

      const result = await app.importFromPath(payload.path);
      sendJson(res, 200, {
        message: `Imported ${result.transactions.length} transactions from ${result.sourceName}.`,
        metadata: result.metadata ?? {},
        summary: app.getSummary(),
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 500, { error: message });
  }
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => {
    console.log(`Transaction import server listening on http://localhost:${port}`);
  });
}

export default server;
