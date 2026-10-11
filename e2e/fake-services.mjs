// Local stand-in for the two external hosts the app talks to server-side:
// fimgs.net (reference pictures) and Cloudflare R2 (S3 path-style API). E2E
// points R2_ENDPOINT and REFERENCE_PICTURE_BASE_URL here (see
// playwright.config.ts) so no spec ever reaches the real services.
import { createServer } from "node:http";
import sharp from "sharp";

const PORT = 4599;

// 500x600 white canvas with a 200x400 dark rectangle in the middle: trimming
// leaves 200x400, plus 4% of the larger side (16px) of padding per edge, so
// the stored object must be 232x432 instead of 500x600.
const referencePng = await sharp({
  create: {
    width: 500,
    height: 600,
    channels: 3,
    background: "#ffffff",
  },
})
  .composite([
    {
      input: {
        create: {
          width: 200,
          height: 400,
          channels: 3,
          background: "#223344",
        },
      },
      left: 150,
      top: 100,
    },
  ])
  .png()
  .toBuffer();

// Served under a .jpg URL with an image/jpeg header on purpose: the app must
// sniff the bytes rather than trust either.
const REFERENCE_PICTURES = {
  "/mdimg/perfume/375x500.999000001.jpg": referencePng,
  "/mdimg/perfume/375x500.999000002.jpg": Buffer.from(
    "<html><body>not an image</body></html>",
  ),
};

/** @type {Map<string, { body: Buffer, contentType: string }>} */
const objects = new Map();

/** Log of reference-picture GETs, so specs can prove the app really fetched them. */
const pictureRequests = [];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "ETag",
};

function send(res, status, body = "", headers = {}) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://127.0.0.1");
  const method = req.method ?? "GET";

  if (method === "OPTIONS") return send(res, 204);
  if (method === "GET" && pathname === "/__health") return send(res, 200, "ok");

  if (method === "GET" && pathname === "/__objects") {
    const list = [...objects].map(([key, { body, contentType }]) => ({
      key,
      contentType,
      size: body.length,
    }));
    return send(res, 200, JSON.stringify(list), {
      "Content-Type": "application/json",
    });
  }

  if (method === "GET" && pathname === "/__requests") {
    return send(res, 200, JSON.stringify(pictureRequests), {
      "Content-Type": "application/json",
    });
  }

  if (method === "GET" && pathname in REFERENCE_PICTURES) {
    pictureRequests.push({ method, path: pathname, status: 200 });
    return send(res, 200, REFERENCE_PICTURES[pathname], {
      "Content-Type": "image/jpeg",
    });
  }

  // S3 path-style: /<bucket>/<key...>
  const match = /^\/([^/]+)\/(.+)$/.exec(pathname);
  if (match) {
    const key = decodeURIComponent(match[2]);
    if (method === "PUT") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      objects.set(key, {
        body,
        contentType: req.headers["content-type"] ?? "application/octet-stream",
      });
      return send(res, 200, "", { ETag: `"${body.length}"` });
    }
    if (method === "GET" && objects.has(key)) {
      const { body, contentType } = objects.get(key);
      return send(res, 200, body, { "Content-Type": contentType });
    }
  }

  send(res, 404, "not found");
}).listen(PORT, "127.0.0.1");
