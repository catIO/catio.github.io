import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { createViteDevServer } from "./vite";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;
  const host = process.env.HOST || "localhost";

  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200
  }));

  // Parse JSON bodies
  app.use(express.json());

  // Setup routes
  registerRoutes(app);

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
  });

  // Create and start the Vite dev server
  const vite = await createViteDevServer();

  // Use Vite's middleware in development
  app.use(vite.middlewares);

  // Only serve static files in production
  if (process.env.NODE_ENV === 'production') {
    // Serve static files from the client/dist directory in production
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // Handle all other routes by serving the index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }

  // Start the server
  server.listen(PORT, () => {
    console.log(`API Server running at http://${host}:${PORT}`);
  });
}

startServer().catch(console.error);
