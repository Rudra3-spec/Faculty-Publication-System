import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  designation: text("designation").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  authors: text("authors").notNull(),
  venue: text("venue").notNull(), // Journal/Conference name
  year: integer("year").notNull(),
  doi: text("doi"),
  abstract: text("abstract").notNull(),
  keywords: text("keywords").notNull(),
  pdfUrl: text("pdf_url"),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  department: true,
  designation: true,
});

export const insertPublicationSchema = createInsertSchema(publications).pick({
  title: true,
  authors: true,
  venue: true,
  year: true,
  doi: true,
  abstract: true,
  keywords: true,
  pdfUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type Publication = typeof publications.$inferSelect;
