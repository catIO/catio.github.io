import { type User, type Settings, type InsertSettings, type Session, type InsertSession, type PushSubscription } from "@shared/schema";

class Storage {
  private users: Map<number, User> = new Map();
  private settings: Map<number, Settings> = new Map();
  private sessions: Map<number, Session[]> = new Map();
  private pushSubscriptions: Map<number, PushSubscription> = new Map();

  // User methods
  async createUser(user: Omit<User, "id">): Promise<User> {
    const id = this.users.size + 1;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(user => user.email === email) || null;
  }

  // Settings methods
  async getSettings(userId: number): Promise<Settings | null> {
    return this.settings.get(userId) || null;
  }

  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const id = this.settings.size + 1;
    const settings: Settings = {
      id,
      userId: insertSettings.userId,
      soundEnabled: insertSettings.soundEnabled ?? true,
      browserNotificationsEnabled: insertSettings.browserNotificationsEnabled ?? true,
      workDuration: insertSettings.workDuration ?? 25,
      breakDuration: insertSettings.breakDuration ?? 5,
      iterations: insertSettings.iterations ?? 4,
      darkMode: insertSettings.darkMode ?? true
    };
    this.settings.set(insertSettings.userId, settings);
    return settings;
  }

  async updateSettings(userId: number, settings: Partial<Settings>): Promise<Settings> {
    const existingSettings = await this.getSettings(userId);
    if (!existingSettings) {
      throw new Error('Settings not found');
    }

    const updatedSettings: Settings = {
      ...existingSettings,
      ...settings,
      userId,
      soundEnabled: settings.soundEnabled ?? existingSettings.soundEnabled,
      browserNotificationsEnabled: settings.browserNotificationsEnabled ?? existingSettings.browserNotificationsEnabled,
      workDuration: settings.workDuration ?? existingSettings.workDuration,
      breakDuration: settings.breakDuration ?? existingSettings.breakDuration,
      iterations: settings.iterations ?? existingSettings.iterations,
      darkMode: settings.darkMode ?? existingSettings.darkMode
    };

    this.settings.set(userId, updatedSettings);
    return updatedSettings;
  }

  // Session methods
  async getSessions(userId: number): Promise<Session[]> {
    return this.sessions.get(userId) || [];
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = this.sessions.size + 1;
    const newSession: Session = { ...session, id };
    const userSessions = await this.getSessions(session.userId);
    userSessions.push(newSession);
    this.sessions.set(session.userId, userSessions);
    return newSession;
  }

  // Push subscription methods
  async savePushSubscription(userId: number, subscription: PushSubscription): Promise<void> {
    this.pushSubscriptions.set(userId, subscription);
  }

  async getPushSubscription(userId: number): Promise<PushSubscription | null> {
    return this.pushSubscriptions.get(userId) || null;
  }
}

export const storage = new Storage();
