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
  bio: text("bio"),
  researchInterests: text("research_interests"),
  contactEmail: text("contact_email"),
  profilePicture: text("profile_picture"),
  // Social media fields
  linkedinUrl: text("linkedin_url"),
  googleScholarUrl: text("google_scholar_url"),
  researchGateUrl: text("research_gate_url"),
  orcidId: text("orcid_id"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  // Additional personal info
  personalWebsite: text("personal_website"),
  education: text("education"),
  awards: text("awards"),
  officeHours: text("office_hours"),
  officeLocation: text("office_location"),
});

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  authors: text("authors").notNull(),
  venue: text("venue").notNull(), // Journal/Conference name
  year: integer("year").notNull(),
  doi: text("doi"),
  abstract: text("abstract").notNull(),
  keywords: text("keywords").notNull(),
  pdfUrl: text("pdf_url"),
  userId: integer("user_id").notNull(),
  citations: integer("citations").default(0),
  researchArea: text("research_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const userBaseSchema = {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  bio: z.string().optional(),
  researchInterests: z.string().optional(),
  contactEmail: z.string().email().optional(),
  profilePicture: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  googleScholarUrl: z.string().url().optional(),
  researchGateUrl: z.string().url().optional(),
  orcidId: z.string().optional(),
  twitterUrl: z.string().url().optional(),
  facebookUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  personalWebsite: z.string().url().optional(),
  education: z.string().optional(),
  awards: z.string().optional(),
  officeHours: z.string().optional(),
  officeLocation: z.string().optional(),
};

export const insertUserSchema = z.object(userBaseSchema);

export const updateUserSchema = z.object({
  ...userBaseSchema,
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
}).partial();

export const insertPublicationSchema = createInsertSchema(publications).pick({
  title: true,
  type: true,
  authors: true,
  venue: true,
  year: true,
  doi: true,
  abstract: true,
  keywords: true,
  pdfUrl: true,
  researchArea: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type Publication = typeof publications.$inferSelect;