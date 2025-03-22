import { users, type User, type InsertUser, settings, type Settings, type InsertSettings, sessions, type Session, type InsertSession, type PushSubscription } from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Settings management
  getSettingsByUserId(userId: number): Promise<Settings | null>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(userId: number, settings: Settings): Promise<Settings>;
  
  // Session management
  getSessionsByUserId(userId: number): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;

  // Push notification methods
  savePushSubscription(userId: number, subscription: PushSubscription): Promise<void>;
  getPushSubscription(userId: number): Promise<PushSubscription | null>;
  deletePushSubscription(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<number, Session>;
  private userSettings: Map<number, Settings>;
  private userIdCounter: number;
  private sessionIdCounter: number;
  private settingsIdCounter: number;
  private pushSubscriptions: Map<number, PushSubscription>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.userSettings = new Map();
    this.pushSubscriptions = new Map();
    this.userIdCounter = 1;
    this.sessionIdCounter = 1;
    this.settingsIdCounter = 1;
    
    // Initialize with a default user
    this.createUser({
      username: "demo",
      password: "password"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Settings methods
  async getSettingsByUserId(userId: number): Promise<Settings | null> {
    console.log('Storage - Getting settings for user:', userId);
    const settings = this.userSettings.get(userId);
    console.log('Storage - Found settings:', settings);
    if (!settings) return null;
    
    // Ensure darkMode is included in the response
    return {
      ...settings,
      darkMode: settings.darkMode ?? false
    };
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = this.settingsIdCounter++;
    // Make sure all fields are defined with defaults
    const settings: Settings = { 
      ...insertSettings, 
      id,
      userId: insertSettings.userId ?? 1, // Default to user 1 if not provided
      soundEnabled: insertSettings.soundEnabled ?? true,
      vibrationEnabled: insertSettings.vibrationEnabled ?? true,
      browserNotificationsEnabled: insertSettings.browserNotificationsEnabled ?? true,
      workDuration: insertSettings.workDuration ?? 25,
      breakDuration: insertSettings.breakDuration ?? 5,
      iterations: insertSettings.iterations ?? 4,
      darkMode: insertSettings.darkMode ?? false
    };
    console.log('Storage - Creating new settings:', settings);
    // Store settings using userId as the key
    this.userSettings.set(settings.userId ?? 1, settings);
    return settings;
  }

  async updateSettings(userId: number, settings: Settings): Promise<Settings> {
    console.log('Storage - Updating settings for user:', userId);
    console.log('Storage - Existing settings:', this.userSettings.get(userId));
    console.log('Storage - New settings to apply:', settings);

    const existingSettings = this.userSettings.get(userId);
    if (!existingSettings) {
      console.log('Storage - No existing settings found, creating new settings');
      return this.createSettings({ ...settings, userId });
    }

    // Merge existing settings with new settings
    const updatedSettings = {
      ...existingSettings,
      ...settings,
      userId, // Ensure userId is set correctly
      // Ensure all fields are properly merged
      soundEnabled: settings.soundEnabled ?? existingSettings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled ?? existingSettings.vibrationEnabled,
      browserNotificationsEnabled: settings.browserNotificationsEnabled ?? existingSettings.browserNotificationsEnabled,
      workDuration: settings.workDuration ?? existingSettings.workDuration,
      breakDuration: settings.breakDuration ?? existingSettings.breakDuration,
      iterations: settings.iterations ?? existingSettings.iterations,
      darkMode: settings.darkMode ?? existingSettings.darkMode ?? false
    };

    console.log('Storage - Final merged settings:', updatedSettings);
    // Store settings using userId as the key
    this.userSettings.set(userId, updatedSettings);

    // Verify settings were saved
    const savedSettings = this.userSettings.get(userId);
    console.log('Storage - Verified saved settings:', savedSettings);
    console.log('Storage - Settings match:', JSON.stringify(savedSettings) === JSON.stringify(updatedSettings));

    return updatedSettings;
  }

  // Session methods
  async getSessionsByUserId(userId: number): Promise<Session[]> {
    // Get sessions for user or return empty array
    return this.sessions.get(userId) || [];
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.sessionIdCounter++;
    
    // Ensure userId is handled (default to 1 if not provided)
    const userId = insertSession.userId ?? 1;
    
    const session: Session = { 
      ...insertSession, 
      id,
      userId
    };
    
    // Add to user's sessions
    const userSessions = this.sessions.get(userId) || [];
    userSessions.push(session);
    this.sessions.set(userId, userSessions);
    
    return session;
  }

  // Push notification methods
  async savePushSubscription(userId: number, subscription: PushSubscription): Promise<void> {
    console.log('Storage - Saving push subscription for user:', userId);
    this.pushSubscriptions.set(userId, subscription);
  }

  async getPushSubscription(userId: number): Promise<PushSubscription | null> {
    console.log('Storage - Getting push subscription for user:', userId);
    return this.pushSubscriptions.get(userId) || null;
  }

  async deletePushSubscription(userId: number): Promise<void> {
    console.log('Storage - Deleting push subscription for user:', userId);
    this.pushSubscriptions.delete(userId);
  }
}

export const storage = new MemStorage();
