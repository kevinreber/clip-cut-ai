#!/bin/bash
set -e

# Deploy Convex functions to production and run Vite build
npx convex deploy --cmd 'npx vite build'

# Create Vercel Build Output API structure
rm -rf .vercel/output
mkdir -p .vercel/output/static
mkdir -p .vercel/output/functions/index.func

# Copy static client assets
cp -r dist/client/* .vercel/output/static/

# Create the Node.js serverless function entry point
cat > .vercel/output/functions/index.func/index.mjs << 'ENTRYEOF'
import server from "./server.js";

export default async function handler(req, res) {
  // Vercel's Nodejs launcher passes Node.js IncomingMessage/ServerResponse.
  // TanStack Start expects a Web Request with an absolute URL.
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = new URL(req.url, `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const webReq = new Request(url.toString(), {
    method: req.method,
    headers,
    body: hasBody ? req : undefined,
    duplex: hasBody ? "half" : undefined,
  });

  const webRes = await server.fetch(webReq);

  res.statusCode = webRes.status;
  for (const [key, value] of webRes.headers) {
    res.setHeader(key, value);
  }

  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}
ENTRYEOF

# Copy server build output
cp dist/server/server.js .vercel/output/functions/index.func/server.js
if [ -d "dist/server/assets" ]; then
  cp -r dist/server/assets .vercel/output/functions/index.func/assets
fi

# Enable ESM for the function directory
cat > .vercel/output/functions/index.func/package.json << 'PKGEOF'
{ "type": "module" }
PKGEOF

# Node.js serverless function config
cat > .vercel/output/functions/index.func/.vc-config.json << 'FUNCEOF'
{
  "runtime": "nodejs22.x",
  "handler": "index.mjs",
  "launcherType": "Nodejs"
}
FUNCEOF

# Vercel output config: serve static assets, fall through to serverless function
cat > .vercel/output/config.json << 'CONFEOF'
{
  "version": 3,
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index"
    }
  ]
}
CONFEOF

echo "Vercel Build Output API structure created successfully."
