"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(ROOT, relative);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain" });
    res.end("Method not allowed");
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "neo-gaming" }));
    return;
  }

  let filePath = safePath(req.url || "/");
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        // Single-page route fallback for clean deep links.
        if (!path.extname(filePath)) {
          fs.readFile(path.join(ROOT, "index.html"), (fallbackError, fallback) => {
            if (fallbackError) {
              res.writeHead(404, { "Content-Type": "text/plain" });
              res.end("Not found");
              return;
            }
            res.writeHead(200, {
              "Content-Type": MIME[".html"],
              "Cache-Control": "no-cache",
            });
            res.end(req.method === "HEAD" ? undefined : fallback);
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[extension] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`NEO GAMING online at http://${HOST}:${PORT}`);
});
