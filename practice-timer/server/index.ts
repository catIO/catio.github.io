import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins
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

// Export the Express app for Netlify
export default app;
