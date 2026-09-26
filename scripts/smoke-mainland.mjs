const baseUrl = process.env.CELLS_BASE_URL || "http://127.0.0.1:3000";

async function fetchWithRetry(pathname, attempts = 30) {
  const url = new URL(pathname, baseUrl);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (attempt === attempts) throw new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${url} did not become available`);
}

const healthResponse = await fetchWithRetry("/api/health");
const health = await healthResponse.json();
if (health.status !== "ok" || health.service !== "cells") {
  throw new Error(`unexpected health response: ${JSON.stringify(health)}`);
}

const homeResponse = await fetchWithRetry("/");
const html = await homeResponse.text();
const assetPaths = [
  ...new Set(
    [...html.matchAll(/<(?:link|script)[^>]+(?:href|src)=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((pathname) => pathname.startsWith("/")),
  ),
];

if (!assetPaths.some((pathname) => pathname.endsWith(".css"))) {
  throw new Error("home page did not reference a CSS asset");
}
if (!assetPaths.some((pathname) => pathname.endsWith(".js"))) {
  throw new Error("home page did not reference a JavaScript asset");
}

const assets = [];
for (const pathname of assetPaths) {
  const response = await fetchWithRetry(pathname, 1);
  assets.push({
    pathname,
    status: response.status,
    contentType: response.headers.get("content-type"),
  });
}

const graphResponse = await fetchWithRetry("/api/graph");
const graph = await graphResponse.json();
if (!graph.meta?.totalNodes || !graph.meta?.totalEdges) {
  throw new Error("graph API returned empty metadata");
}

console.log(
  JSON.stringify({
    baseUrl,
    health: health.status,
    assetCount: assets.length,
    assets,
    totalNodes: graph.meta.totalNodes,
    totalEdges: graph.meta.totalEdges,
  }),
);
