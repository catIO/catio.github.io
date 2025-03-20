// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  userSettings;
  userSessions;
  userIdCounter;
  settingsIdCounter;
  sessionIdCounter;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.userSettings = /* @__PURE__ */ new Map();
    this.userSessions = /* @__PURE__ */ new Map();
    this.userIdCounter = 1;
    this.settingsIdCounter = 1;
    this.sessionIdCounter = 1;
    this.createUser({
      username: "demo",
      password: "password"
    });
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.userIdCounter++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Settings methods
  async getSettingsByUserId(userId) {
    console.log("Storage - Getting settings for user:", userId);
    const settings = this.userSettings.get(userId);
    console.log("Storage - Found settings:", settings);
    if (!settings) return null;
    return {
      ...settings,
      darkMode: settings.darkMode ?? false
    };
  }
  async createSettings(insertSettings) {
    const id = this.settingsIdCounter++;
    const settings = {
      ...insertSettings,
      id,
      userId: insertSettings.userId ?? 1,
      // Default to user 1 if not provided
      soundEnabled: insertSettings.soundEnabled ?? true,
      vibrationEnabled: insertSettings.vibrationEnabled ?? true,
      workDuration: insertSettings.workDuration ?? 25,
      breakDuration: insertSettings.breakDuration ?? 5,
      iterations: insertSettings.iterations ?? 4,
      darkMode: insertSettings.darkMode ?? false
    };
    console.log("Storage - Creating new settings:", settings);
    this.userSettings.set(settings.userId ?? 1, settings);
    return settings;
  }
  async updateSettings(userId, settings) {
    console.log("Storage - Updating settings for user:", userId);
    console.log("Storage - Existing settings:", this.userSettings.get(userId));
    console.log("Storage - New settings to apply:", settings);
    const existingSettings = this.userSettings.get(userId);
    if (!existingSettings) {
      console.log("Storage - No existing settings found, creating new settings");
      return this.createSettings({ ...settings, userId });
    }
    const updatedSettings = {
      ...existingSettings,
      ...settings,
      userId,
      // Ensure userId is set correctly
      // Ensure all fields are properly merged
      soundEnabled: settings.soundEnabled ?? existingSettings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled ?? existingSettings.vibrationEnabled,
      workDuration: settings.workDuration ?? existingSettings.workDuration,
      breakDuration: settings.breakDuration ?? existingSettings.breakDuration,
      iterations: settings.iterations ?? existingSettings.iterations,
      darkMode: settings.darkMode ?? existingSettings.darkMode ?? false
    };
    console.log("Storage - Final merged settings:", updatedSettings);
    this.userSettings.set(userId, updatedSettings);
    const savedSettings = this.userSettings.get(userId);
    console.log("Storage - Verified saved settings:", savedSettings);
    console.log("Storage - Settings match:", JSON.stringify(savedSettings) === JSON.stringify(updatedSettings));
    return updatedSettings;
  }
  // Session methods
  async getSessionsByUserId(userId) {
    return this.userSessions.get(userId) || [];
  }
  async createSession(insertSession) {
    const id = this.sessionIdCounter++;
    const userId = insertSession.userId ?? 1;
    const session = {
      ...insertSession,
      id,
      userId
    };
    const userSessions = this.userSessions.get(userId) || [];
    userSessions.push(session);
    this.userSessions.set(userId, userSessions);
    return session;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { z } from "zod";
var insertSettingsSchema = z.object({
  userId: z.number(),
  soundEnabled: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
  workDuration: z.number().default(25),
  breakDuration: z.number().default(5),
  iterations: z.number().default(4),
  darkMode: z.boolean().default(false)
});
var insertSessionSchema = z.object({
  userId: z.number(),
  type: z.enum(["work", "break"]),
  startTime: z.date(),
  endTime: z.date()
});

// server/routes.ts
import { z as z2 } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
async function registerRoutes(app2) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.locals.userId = 1;
    next();
  });
  router.get("/settings", async (req, res) => {
    try {
      const userId = res.locals.userId;
      let userSettings = await storage.getSettingsByUserId(userId);
      if (!userSettings) {
        userSettings = await storage.createSettings({
          userId,
          soundEnabled: true,
          vibrationEnabled: true,
          workDuration: 25,
          breakDuration: 5,
          iterations: 4,
          darkMode: false
        });
      }
      const responseSettings = {
        ...userSettings,
        darkMode: userSettings.darkMode ?? false
      };
      console.log("GET /settings - Returning settings:", responseSettings);
      res.json(responseSettings);
    } catch (error) {
      console.error("GET /settings - Error:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });
  router.post("/settings", async (req, res) => {
    try {
      console.log("POST /settings - Received request body:", req.body);
      const userId = res.locals.userId;
      console.log("POST /settings - User ID:", userId);
      const { userId: _, ...settingsData } = req.body;
      console.log("POST /settings - Settings data after removing userId:", settingsData);
      const requestSettings = {
        ...settingsData,
        darkMode: settingsData.darkMode ?? false
      };
      const validatedSettings = insertSettingsSchema.parse({
        ...requestSettings,
        userId,
        darkMode: requestSettings.darkMode ?? false
        // Ensure darkMode is a boolean
      });
      console.log("POST /settings - Validated settings:", validatedSettings);
      const existingSettings = await storage.getSettingsByUserId(userId);
      console.log("POST /settings - Existing settings:", existingSettings);
      let updatedSettings;
      if (existingSettings) {
        console.log("POST /settings - Updating existing settings");
        updatedSettings = await storage.updateSettings(userId, {
          ...existingSettings,
          ...validatedSettings,
          id: existingSettings.id,
          userId,
          soundEnabled: validatedSettings.soundEnabled ?? existingSettings.soundEnabled,
          vibrationEnabled: validatedSettings.vibrationEnabled ?? existingSettings.vibrationEnabled,
          workDuration: validatedSettings.workDuration ?? existingSettings.workDuration,
          breakDuration: validatedSettings.breakDuration ?? existingSettings.breakDuration,
          iterations: validatedSettings.iterations ?? existingSettings.iterations,
          darkMode: validatedSettings.darkMode ?? false
          // Ensure darkMode is a boolean
        });
      } else {
        console.log("POST /settings - Creating new settings");
        updatedSettings = await storage.createSettings({
          ...validatedSettings,
          userId,
          soundEnabled: validatedSettings.soundEnabled ?? true,
          vibrationEnabled: validatedSettings.vibrationEnabled ?? true,
          workDuration: validatedSettings.workDuration ?? 25,
          breakDuration: validatedSettings.breakDuration ?? 5,
          iterations: validatedSettings.iterations ?? 4,
          darkMode: validatedSettings.darkMode ?? false
          // Ensure darkMode is a boolean
        });
      }
      const responseSettings = {
        ...updatedSettings,
        darkMode: updatedSettings.darkMode ?? false
      };
      console.log("POST /settings - Final settings to be sent:", responseSettings);
      res.json(responseSettings);
    } catch (error) {
      console.error("POST /settings - Error:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({ error: "Invalid settings data" });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });
  router.get("/sessions", async (req, res) => {
    try {
      const userId = res.locals.userId;
      const sessions = await storage.getSessionsByUserId(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });
  router.post("/sessions", async (req, res) => {
    try {
      const userId = res.locals.userId;
      const sessionData = insertSessionSchema.omit({ userId: true }).extend({
        type: z2.enum(["work", "break"]),
        startTime: z2.string().transform((str) => new Date(str)),
        endTime: z2.string().transform((str) => new Date(str))
      }).parse({ ...req.body, userId });
      const newSession = await storage.createSession(sessionData);
      res.status(201).json(newSession);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create session" });
      }
    }
  });
  app2.use("/api", router);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: ["localhost"]
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(process.cwd(), "dist", "public");
  console.log("Serving static files from:", distPath);
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import cors from "cors";
var app = express3();
app.use(cors({
  origin: "http://localhost:5173",
  // Allow the Vite dev server origin
  credentials: true,
  // Allow credentials
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  // Allow specific methods
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  // Allow specific headers
  exposedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  // Expose specific headers
  preflightContinue: false,
  // Handle preflight requests
  optionsSuccessStatus: 204
  // Return 204 for OPTIONS requests
}));
app.options("*", cors());
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  const host = process.env.HOST || "localhost";
  server.listen({
    port,
    host
    // Use variable
  }, () => {
    log(`Serving on http://${host}:${port}`);
  });
})();
