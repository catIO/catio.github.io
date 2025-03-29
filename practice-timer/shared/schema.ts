import { z } from "zod";

export const insertSettingsSchema = z.object({
  userId: z.number(),
  soundEnabled: z.boolean().default(true),
  browserNotificationsEnabled: z.boolean().default(true),
  workDuration: z.number().default(25),
  breakDuration: z.number().default(5),
  iterations: z.number().default(4),
  darkMode: z.boolean().default(true),
  numberOfBeeps: z.number().min(1).max(5).default(3)
});

export const insertSessionSchema = z.object({
  userId: z.number(),
  type: z.enum(["work", "break"]),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number(),
  completed: z.boolean().default(true)
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export interface Settings extends InsertSettings {
  id: number;
}

export interface Session extends InsertSession {
  id: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
} 