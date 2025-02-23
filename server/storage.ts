import { User, InsertUser, Publication, InsertPublication, followers, friendRequests, users, publications } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Existing methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<UpdateUser>): Promise<User>;

  // Publications
  createPublication(publication: InsertPublication & { userId: number }): Promise<Publication>;
  getPublication(id: number): Promise<Publication | undefined>;
  getPublicationsByUser(userId: number): Promise<Publication[]>;
  getAllPublications(): Promise<Publication[]>;
  updatePublication(id: number, publication: Partial<InsertPublication>): Promise<Publication>;
  deletePublication(id: number): Promise<void>;
  searchPublications(query: string): Promise<Publication[]>;

  // New social methods
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  // Friend requests
  sendFriendRequest(senderId: number, receiverId: number): Promise<void>;
  acceptFriendRequest(requestId: number): Promise<void>;
  rejectFriendRequest(requestId: number): Promise<void>;
  getFriendRequests(userId: number): Promise<{
    sent: Array<{ request: typeof friendRequests.$inferSelect; receiver: User }>;
    received: Array<{ request: typeof friendRequests.$inferSelect; sender: User }>;
  }>;

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

  // Keep existing methods...
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  // New social methods implementation
  async followUser(followerId: number, followingId: number): Promise<void> {
    await db.insert(followers).values({
      followerId,
      followingId,
    });
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db
      .delete(followers)
      .where(
        and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        )
      );
  }

  async getFollowers(userId: number): Promise<User[]> {
    const result = await db
      .select({
        follower: users,
      })
      .from(followers)
      .where(eq(followers.followingId, userId))
      .innerJoin(users, eq(users.id, followers.followerId));

    return result.map(r => r.follower);
  }

  async getFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select({
        following: users,
      })
      .from(followers)
      .where(eq(followers.followerId, userId))
      .innerJoin(users, eq(users.id, followers.followingId));

    return result.map(r => r.following);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        )
      );
    return !!result;
  }

  async sendFriendRequest(senderId: number, receiverId: number): Promise<void> {
    await db.insert(friendRequests).values({
      senderId,
      receiverId,
      status: "pending",
    });
  }

  async acceptFriendRequest(requestId: number): Promise<void> {
    await db
      .update(friendRequests)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(friendRequests.id, requestId));
  }

  async rejectFriendRequest(requestId: number): Promise<void> {
    await db
      .update(friendRequests)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(friendRequests.id, requestId));
  }

  async getFriendRequests(userId: number) {
    const sent = await db
      .select({
        request: friendRequests,
        receiver: users,
      })
      .from(friendRequests)
      .where(eq(friendRequests.senderId, userId))
      .innerJoin(users, eq(users.id, friendRequests.receiverId));

    const received = await db
      .select({
        request: friendRequests,
        sender: users,
      })
      .from(friendRequests)
      .where(eq(friendRequests.receiverId, userId))
      .innerJoin(users, eq(users.id, friendRequests.senderId));

    return {
      sent: sent.map(({ request, receiver }) => ({ request, receiver })),
      received: received.map(({ request, sender }) => ({ request, sender })),
    };
  }
}

export const storage = new DatabaseStorage();

interface UpdateUser {
  username?: string;
  email?: string;
  password?: string;
  name?: string;
  department?: string;
  designation?: string;
  bio?: string;
  researchInterests?: string;
  contactEmail?: string;
  profilePicture?: string;
  linkedinUrl?: string;
  googleScholarUrl?: string;
  researchGateUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  personalWebsite?: string;
  education?: string;
  awards?: string;
  officeHours?: string;
  officeLocation?: string;
  college?: string;
  school?: string;
  currentCity?: string;
  currentState?: string;
  almaCollege?: string;
  almaSchool?: string;
  almaCity?: string;
  almaState?: string;
  isPublic?: boolean;
}