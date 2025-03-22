import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Middleware to simulate a logged-in user for demo purposes
  router.use((req, res, next) => {
    // In a real app, this would come from auth middleware
    res.locals.userId = 1;
    next();
  });

  // Get user settings
  router.get("/settings", async (req, res) => {
    try {
      const userId = res.locals.userId;
      console.log('GET /settings - Request received for user:', userId);
      
      let userSettings = await storage.getSettings(userId);
      console.log('GET /settings - Retrieved settings:', userSettings);
      
      if (!userSettings) {
        console.log('GET /settings - No settings found, creating defaults');
        // Create default settings if none exist
        userSettings = await storage.createSettings({
          userId,
          soundEnabled: true,
          browserNotificationsEnabled: true,
          workDuration: 25,
          breakDuration: 5,
          iterations: 4,
          darkMode: true
        });
        console.log('GET /settings - Created default settings:', userSettings);
      }
      
      // Ensure all settings are included in the response
      const responseSettings = {
        ...userSettings,
        userId,
        soundEnabled: userSettings.soundEnabled ?? true,
        browserNotificationsEnabled: userSettings.browserNotificationsEnabled ?? true,
        workDuration: userSettings.workDuration ?? 25,
        breakDuration: userSettings.breakDuration ?? 5,
        iterations: userSettings.iterations ?? 4,
        darkMode: userSettings.darkMode ?? true
      };
      
      console.log('GET /settings - Returning settings:', responseSettings);
      res.json(responseSettings);
    } catch (error) {
      console.error('GET /settings - Error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid settings data' });
      } else {
        res.status(500).json({ error: 'Failed to get settings' });
      }
    }
  });

  // Update user settings
  router.post("/settings", async (req, res) => {
    try {
      console.log('POST /settings - Received request body:', req.body);
      
      // Get user ID from request
      const userId = res.locals.userId;
      console.log('POST /settings - User ID:', userId);
      
      // Remove userId from request body if it exists
      const { userId: _, ...settingsData } = req.body;
      console.log('POST /settings - Settings data after removing userId:', settingsData);
      
      // Ensure all settings are included in the request
      const requestSettings = {
        ...settingsData,
        userId,
        soundEnabled: settingsData.soundEnabled ?? true,
        browserNotificationsEnabled: settingsData.browserNotificationsEnabled ?? true,
        workDuration: settingsData.workDuration ?? 25,
        breakDuration: settingsData.breakDuration ?? 5,
        iterations: settingsData.iterations ?? 4,
        darkMode: settingsData.darkMode ?? true
      };
      
      console.log('POST /settings - Request settings after defaults:', requestSettings);
      
      // Validate the request body
      const validatedSettings = insertSettingsSchema.parse(requestSettings);
      console.log('POST /settings - Validated settings:', validatedSettings);

      // Check if settings exist for the user
      const existingSettings = await storage.getSettings(userId);
      console.log('POST /settings - Existing settings:', existingSettings);

      let updatedSettings;
      if (existingSettings) {
        console.log('POST /settings - Updating existing settings');
        updatedSettings = await storage.updateSettings(userId, {
          ...existingSettings,
          ...validatedSettings,
          id: existingSettings.id,
          userId
        });
      } else {
        console.log('POST /settings - Creating new settings');
        updatedSettings = await storage.createSettings(validatedSettings);
      }

      console.log('POST /settings - Updated settings:', updatedSettings);

      // Ensure all settings are included in the response
      const responseSettings = {
        ...updatedSettings,
        userId,
        soundEnabled: updatedSettings.soundEnabled ?? true,
        browserNotificationsEnabled: updatedSettings.browserNotificationsEnabled ?? true,
        workDuration: updatedSettings.workDuration ?? 25,
        breakDuration: updatedSettings.breakDuration ?? 5,
        iterations: updatedSettings.iterations ?? 4,
        darkMode: updatedSettings.darkMode ?? true
      };
      
      console.log('POST /settings - Final settings to be sent:', responseSettings);
      res.json(responseSettings);
    } catch (error) {
      console.error('POST /settings - Error:', error);
      if (error instanceof z.ZodError) {
        console.error('POST /settings - Validation error:', error.errors);
        res.status(400).json({ error: 'Invalid settings data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  });

  // Get user sessions
  router.get("/sessions", async (req, res) => {
    try {
      const userId = res.locals.userId;
      const sessions = await storage.getSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  // Create a new session
  router.post("/sessions", async (req, res) => {
    try {
      const userId = res.locals.userId;
      
      // Validate session data
      const sessionData = insertSessionSchema
        .omit({ userId: true })
        .extend({
          type: z.enum(["work", "break"]),
          startTime: z.string().transform(str => new Date(str)),
          endTime: z.string().transform(str => new Date(str)),
        })
        .parse({ ...req.body, userId });
      
      const newSession = await storage.createSession({
        ...sessionData,
        userId
      });
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

  // Subscribe to push notifications
  router.post("/notifications/subscribe", async (req, res) => {
    try {
      const userId = res.locals.userId;
      const subscription = req.body;
      
      // Store the subscription for the user
      await storage.savePushSubscription(userId, subscription);
      
      res.status(201).json({ message: "Successfully subscribed to notifications" });
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      res.status(500).json({ error: 'Failed to subscribe to notifications' });
    }
  });

  // Register API routes with /api prefix
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
