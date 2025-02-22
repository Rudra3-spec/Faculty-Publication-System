import { User, InsertUser, Publication, InsertPublication } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private publications: Map<number, Publication>;
  private currentUserId: number;
  private currentPublicationId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.publications = new Map();
    this.currentUserId = 1;
    this.currentPublicationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  async createPublication(publication: InsertPublication & { userId: number }): Promise<Publication> {
    const id = this.currentPublicationId++;
    const newPublication = {
      ...publication,
      id,
      createdAt: new Date(),
    };
    this.publications.set(id, newPublication);
    return newPublication;
  }

  async getPublication(id: number): Promise<Publication | undefined> {
    return this.publications.get(id);
  }

  async getPublicationsByUser(userId: number): Promise<Publication[]> {
    return Array.from(this.publications.values()).filter(
      (pub) => pub.userId === userId,
    );
  }

  async getAllPublications(): Promise<Publication[]> {
    return Array.from(this.publications.values());
  }

  async updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication> {
    const existing = await this.getPublication(id);
    if (!existing) throw new Error("Publication not found");
    
    const updated = { ...existing, ...publication };
    this.publications.set(id, updated);
    return updated;
  }

  async deletePublication(id: number): Promise<void> {
    this.publications.delete(id);
  }

  async searchPublications(query: string): Promise<Publication[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.publications.values()).filter(
      (pub) =>
        pub.title.toLowerCase().includes(lowercaseQuery) ||
        pub.authors.toLowerCase().includes(lowercaseQuery) ||
        pub.keywords.toLowerCase().includes(lowercaseQuery)
    );
  }
}

export const storage = new MemStorage();
