declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd(): string;
  exit(code?: number): never;
};

declare interface MinimalBuffer extends Uint8Array {
  toString(encoding?: string): string;
  readonly byteLength: number;
  readonly byteOffset: number;
  readonly buffer: ArrayBuffer;
}

declare const Buffer: {
  from(data: string, encoding?: string): MinimalBuffer;
  concat(list: MinimalBuffer[]): MinimalBuffer;
};

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function basename(path: string): string;
}

declare module 'node:fs/promises' {
  export function readFile(path: string): Promise<MinimalBuffer>;
}

declare module 'node:http' {
  export interface IncomingMessage extends AsyncIterable<MinimalBuffer | string> {
    url?: string;
    method?: string;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers: Record<string, string>): this;
    end(body?: string): void;
  }

  export interface Server {
    listen(port: number, callback?: () => void): void;
  }

  export type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

  export function createServer(listener: RequestListener): Server;
}
