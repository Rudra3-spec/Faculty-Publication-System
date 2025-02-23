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

// New tables for collaboration features
export const researchGroups = pgTable("research_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => researchGroups.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // member, admin, moderator
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"), // active, completed, on-hold
  creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => researchGroups.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectCollaborators = pgTable("project_collaborators", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("collaborator"), // collaborator, lead
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  publicationId: integer("publication_id").references(() => publications.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => researchGroups.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references(() => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // like, applaud, insightful
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  publicationId: integer("publication_id").references(() => publications.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Schema definitions for new tables
export const insertResearchGroupSchema = createInsertSchema(researchGroups).pick({
  name: true,
  description: true,
  isPublic: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  status: true,
  groupId: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  publicationId: true,
  projectId: true,
  groupId: true,
  parentId: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type Publication = typeof publications.$inferSelect;
export type Follower = typeof followers.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;

// Type definitions for new tables
export type ResearchGroup = typeof researchGroups.$inferSelect;
export type InsertResearchGroup = z.infer<typeof insertResearchGroupSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Reaction = typeof reactions.$inferSelect;