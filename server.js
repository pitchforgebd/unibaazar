const { createReadStream } = require("node:fs");
const { stat } = require("node:fs/promises");
const { createServer } = require("node:http");
const path = require("node:path");
const { parse } = require("node:url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Admin uploads are written to public/uploads at runtime (see
// src/server/admin/uploads.ts, which resolves the same process.cwd() path),
// but Next only serves public/ files that existed when the server started —
// a freshly uploaded image 404'd until the next restart. So /uploads/* is
// served straight from disk here, ahead of Next.
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const uploadTypes = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

function notFound(res) {
  res.statusCode = 404;
  res.end("Not Found");
}

async function serveUpload(req, res, pathname) {
  let name;
  try {
    name = decodeURIComponent(pathname.slice("/uploads/".length));
  } catch {
    return notFound(res);
  }
  // One flat directory of generated names: no slashes, no dot-files, so a
  // request can never resolve outside uploadsDir.
  const type = uploadTypes[path.extname(name).toLowerCase()];
  if (!type || !/^[\w-][\w.-]*$/.test(name)) {
    return notFound(res);
  }
  const file = path.join(uploadsDir, name);
  let info;
  try {
    info = await stat(file);
  } catch {
    return notFound(res);
  }
  if (!info.isFile()) {
    return notFound(res);
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Length", info.size);
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Every upload gets a fresh random name and is never rewritten in place.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (req.method === "HEAD") {
    return res.end();
  }
  createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res);
}

// Redirects (from the admin Redirect manager) are handled by
// src/instrumentation.ts -> seo-hook.cjs, which Next.js runs automatically
// on boot regardless of entry point. No redirect lookup is needed here.
app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);
      const pathname = parsedUrl.pathname ?? "";
      if (
        pathname.startsWith("/uploads/") &&
        (req.method === "GET" || req.method === "HEAD")
      ) {
        await serveUpload(req, res, pathname);
        return;
      }
      await handle(req, res, parsedUrl);
    } catch (error) {
      console.error("Error handling request", req.url, error);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }).listen(port, hostname, () => {
    console.log(`Ready on http://${hostname}:${port}`);
  });
});
