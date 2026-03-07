#!/bin/bash
set -e

# Run the normal Vite build
npx vite build

# Create Vercel Build Output API structure
rm -rf .vercel/output
mkdir -p .vercel/output/static
mkdir -p .vercel/output/functions/index.func

# Copy static client assets
cp -r dist/client/* .vercel/output/static/

# Create the Node.js serverless function entry point
cat > .vercel/output/functions/index.func/index.mjs << 'ENTRYEOF'
import server from "./server.js";

export default async function handler(req) {
  return await server.fetch(req);
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
