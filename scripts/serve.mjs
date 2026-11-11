import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url));
const publicDirectory = resolve(scriptDirectory, '../public');
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

async function sendFile(response, filePath, statusCode = 200) {
  const fileInfo = await stat(filePath);
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': fileInfo.size,
    'Content-Type': contentTypes[extname(filePath).toLowerCase()] ?? 'text/plain; charset=utf-8',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch {
    await sendFile(response, join(publicDirectory, '404.html'), 404);
    return;
  }

  if (pathname.startsWith('/api/')) {
    const body = JSON.stringify({
      error: '이 서버는 화면 파일만 보냅니다. 화면은 public/config.js의 apiBaseUrl로 API 서버를 직접 부릅니다.',
    });
    response.writeHead(404, {
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(body);
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const filePath = resolve(publicDirectory, relativePath);
  const isInsidePublic = filePath === publicDirectory || filePath.startsWith(`${publicDirectory}${sep}`);

  if (!isInsidePublic) {
    await sendFile(response, join(publicDirectory, '404.html'), 404);
    return;
  }

  try {
    await access(filePath);
    await sendFile(response, filePath);
  } catch {
    await sendFile(response, join(publicDirectory, '404.html'), 404);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}`);
});