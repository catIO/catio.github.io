import { createServer } from 'vite';
import type { Express } from 'express';
import type { Server } from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';

const config = {
  server: {
    port: 5173,
    hmr: {
      port: 5173,
      clientPort: 5173,
    },
    host: true,
    fs: {
      strict: false
    }
  }
};

export function createViteDevServer() {
  return createServer(config);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createServer({
    ...config,
    configFile: false,
  });

  // Use Vite's middleware
  app.use(vite.middlewares);

  return vite;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  console.log("Serving static files from:", distPath);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
