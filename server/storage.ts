import { User, InsertUser, Publication, InsertPublication, users, publications } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Publications
  createPublication(publication: InsertPublication & { userId: number }): Promise<Publication>;
  getPublication(id: number): Promise<Publication | undefined>;
  getPublicationsByUser(userId: number): Promise<Publication[]>;
  getAllPublications(): Promise<Publication[]>;
  updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication>;
  deletePublication(id: number): Promise<void>;
  searchPublications(query: string): Promise<Publication[]>;
  updateUser(id: number, user: Partial<UpdateUser>): Promise<User>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createPublication(publication: InsertPublication & { userId: number }): Promise<Publication> {
    const [newPublication] = await db
      .insert(publications)
      .values({
        ...publication,
        createdAt: new Date(),
      })
      .returning();
    return newPublication;
  }

  async getPublication(id: number): Promise<Publication | undefined> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(eq(publications.id, id));
    return publication;
  }

  async getPublicationsByUser(userId: number): Promise<Publication[]> {
    return await db
      .select()
      .from(publications)
      .where(eq(publications.userId, userId))
      .orderBy(desc(publications.createdAt));
  }

  async getAllPublications(): Promise<Publication[]> {
    return await db.select().from(publications);
  }

  async updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication> {
    const [updated] = await db
      .update(publications)
      .set(publication)
      .where(eq(publications.id, id))
      .returning();
    return updated;
  }

  async deletePublication(id: number): Promise<void> {
    await db.delete(publications).where(eq(publications.id, id));
  }

  async searchPublications(query: string): Promise<Publication[]> {
    if (!query) {
      return await db.select().from(publications);
    }

    const lowercaseQuery = query.toLowerCase();
    const results = await db
      .select()
      .from(publications)
      .where(
        or(
          ilike(publications.title, `%${lowercaseQuery}%`),
          ilike(publications.authors, `%${lowercaseQuery}%`),
          ilike(publications.keywords, `%${lowercaseQuery}%`)
        )
      );
    return results;
  }

  async updateUser(id: number, userData: Partial<UpdateUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();

interface UpdateUser {
  username?: string;
  email?: string;
  //other updatable fields
}