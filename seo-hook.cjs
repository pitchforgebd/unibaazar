const { Server } = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
let installed = false;
let redirects = new Map();

async function refreshRedirects() {
  const rows = await prisma.redirect.findMany({
    where: { isActive: true },
    select: { fromPath: true, toPath: true, statusCode: true },
  });
  const next = new Map();
  for (const row of rows) {
    if (row.toPath !== row.fromPath && (row.statusCode === 301 || row.statusCode === 302)) {
      next.set(row.fromPath, row);
    }
  }
  redirects = next;
}

function requestPath(url) {
  const raw = (url ?? "/").split("?")[0] || "/";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function skip(path) {
  return (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/admin") ||
    path.includes(".")
  );
}

async function installSeoHook() {
  if (installed) {
    return;
  }
  installed = true;
  await refreshRedirects();
  setInterval(() => {
    void refreshRedirects().catch(() => undefined);
  }, 2000);
  const original = Server.prototype.emit;
  Server.prototype.emit = function emit(event, ...args) {
    if (event !== "request") {
      return original.call(this, event, ...args);
    }
    const req = args[0];
    const res = args[1];
    if (!req || !res || (req.method !== "GET" && req.method !== "HEAD")) {
      return original.call(this, event, ...args);
    }
    const path = requestPath(req.url);
    if (skip(path)) {
      return original.call(this, event, ...args);
    }
    const hit = redirects.get(path);
    if (hit) {
      res.writeHead(hit.statusCode, { Location: hit.toPath });
      res.end();
      return true;
    }
    return original.call(this, event, ...args);
  };
}

module.exports = { installSeoHook };
