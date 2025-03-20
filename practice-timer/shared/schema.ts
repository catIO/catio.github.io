import { z } from "zod";

export const insertSettingsSchema = z.object({
  userId: z.number(),
  soundEnabled: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
  workDuration: z.number().default(25),
  breakDuration: z.number().default(5),
  iterations: z.number().default(4),
  darkMode: z.boolean().default(false)
});

export const insertSessionSchema = z.object({
  userId: z.number(),
  type: z.enum(["work", "break"]),
  startTime: z.date(),
  endTime: z.date()
}); 