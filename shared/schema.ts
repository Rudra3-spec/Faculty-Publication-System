import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const userBaseSchema = {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  bio: z.string().optional(),
  researchInterests: z.string().optional(),
  contactEmail: z.string().email().optional(),
  profilePicture: z.string().optional(),
  linkedinUrl: z.string().optional(),
  googleScholarUrl: z.string().optional(),
  researchGateUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  personalWebsite: z.string().optional(),
  education: z.string().optional(),
  awards: z.string().optional(),
  officeHours: z.string().optional(),
  officeLocation: z.string().optional(),
  college: z.string().optional(),
  school: z.string().optional(),
  currentCity: z.string().optional(),
  currentState: z.string().optional(),
  almaCollege: z.string().optional(),
  almaSchool: z.string().optional(),
  almaCity: z.string().optional(),
  almaState: z.string().optional(),
};

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
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  // Additional personal info
  personalWebsite: text("personal_website"),
  education: text("education"),
  awards: text("awards"),
  officeHours: text("office_hours"),
  officeLocation: text("office_location"),
  // Current institution
  college: text("college"), // Current institution where working
  school: text("school"), // Current school/department where working
  currentCity: text("current_city"),
  currentState: text("current_state"),
  // Educational background
  almaCollege: text("alma_college"), // Institution where studied
  almaSchool: text("alma_school"), // School where studied
  almaCity: text("alma_city"),
  almaState: text("alma_state"),
});

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  authors: text("authors").notNull(),
  venue: text("venue").notNull(),
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