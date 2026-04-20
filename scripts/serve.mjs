import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const cleanPath = normalize(pathname).replace(/^([/\\])+/, "");
  const requestedPath = resolve(join(root, cleanPath || "index.html"));
  if (!requestedPath.startsWith(root)) return join(root, "index.html");

  try {
    const stat = statSync(requestedPath);
    return stat.isDirectory() ? join(requestedPath, "index.html") : requestedPath;
  } catch {
    return join(root, "index.html");
  }
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || "/");
  const contentType = mimeTypes[extname(filePath)] || "application/octet-stream";

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });

  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`FoldNote is running at http://localhost:${port}`);
});
