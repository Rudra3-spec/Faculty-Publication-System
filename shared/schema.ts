import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing user base schema
const userBaseSchema = {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().optional(),
  designation: z.string().optional(),
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
  isPublic: z.boolean().default(false),
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  department: text("department"),
  designation: text("designation"),
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
  college: text("college"),
  school: text("school"),
  currentCity: text("current_city"),
  currentState: text("current_state"),
  // Educational background
  almaCollege: text("alma_college"),
  almaSchool: text("alma_school"),
  almaCity: text("alma_city"),
  almaState: text("alma_state"),
  // Profile visibility
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table for followers
export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: integer("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for friend requests
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Keep existing publications table
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

// Schema definitions
export const insertUserSchema = z.object({
  ...userBaseSchema,
});

export const updateUserSchema = z.object({
  ...userBaseSchema,
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .optional(),
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

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type Publication = typeof publications.$inferSelect;
export type Follower = typeof followers.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;