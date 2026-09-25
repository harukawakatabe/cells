import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const clientRoot = path.join(projectRoot, "dist", "client");
const workerPath = path.join(projectRoot, "dist", "server", "index.js");
const worker = (await import(workerPath)).default;

if (!worker || typeof worker.fetch !== "function") {
  throw new Error("dist/server/index.js does not export a Worker fetch handler");
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function firstHeader(value) {
  return String(value ?? "").split(",")[0].trim();
}

async function serveAsset(request) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname.replace(/^\/+/, "");
  const filePath = path.resolve(clientRoot, relativePath);
  if (filePath !== clientRoot && !filePath.startsWith(`${clientRoot}${path.sep}`)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return new Response("Not found", { status: 404 });
    const headers = new Headers({
      "Content-Length": String(fileStat.size),
      "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
    });
    if (pathname.startsWith("/_next/static/")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      headers.set("Cache-Control", "public, max-age=3600");
    }
    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(await readFile(filePath), { status: 200, headers });
  } catch (error) {
    if (error?.code === "ENOENT") return new Response("Not found", { status: 404 });
    throw error;
  }
}

function requestHeaders(incoming) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function writeResponse(outgoing, response) {
  outgoing.statusCode = response.status;
  outgoing.statusMessage = response.statusText;
  for (const [name, value] of response.headers) outgoing.setHeader(name, value);
  if (!response.body) {
    outgoing.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(outgoing);
}

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const server = createServer(async (incoming, outgoing) => {
  try {
    const headers = requestHeaders(incoming);
    const protocol = firstHeader(headers.get("x-forwarded-proto")) || "http";
    const requestHost = firstHeader(headers.get("x-forwarded-host")) || headers.get("host") || `127.0.0.1:${port}`;
    const request = new Request(`${protocol}://${requestHost}${incoming.url || "/"}`, {
      method: incoming.method,
      headers,
      body: ["GET", "HEAD"].includes(incoming.method || "GET") ? undefined : Readable.toWeb(incoming),
      duplex: "half",
    });
    const waitUntilTasks = [];
    const response = await worker.fetch(
      request,
      { ASSETS: { fetch: serveAsset } },
      {
        waitUntil(task) {
          waitUntilTasks.push(Promise.resolve(task));
        },
        passThroughOnException() {},
      },
    );
    writeResponse(outgoing, response);
    void Promise.allSettled(waitUntilTasks);
  } catch (error) {
    console.error("[cells] request failed", error);
    if (!outgoing.headersSent) {
      outgoing.statusCode = 500;
      outgoing.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    outgoing.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`[cells] listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[cells] received ${signal}, shutting down`);
  server.close((error) => process.exit(error ? 1 : 0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
