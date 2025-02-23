import { 
  User, InsertUser, Publication, InsertPublication, followers, friendRequests, users, publications,
  researchGroups, groupMemberships, projects, projectCollaborators, comments, reactions,
  InsertResearchGroup, ResearchGroup, Project, InsertProject, Comment, InsertComment, Reaction
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Existing methods remain the same
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

  // Existing social methods
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

  // New methods for research groups
  createResearchGroup(group: InsertResearchGroup & { creatorId: number }): Promise<ResearchGroup>;
  getResearchGroup(id: number): Promise<ResearchGroup | undefined>;
  getResearchGroups(): Promise<ResearchGroup[]>;
  updateResearchGroup(id: number, group: Partial<InsertResearchGroup>): Promise<ResearchGroup>;
  deleteResearchGroup(id: number): Promise<void>;

  // Group memberships
  addGroupMember(groupId: number, userId: number, role?: string): Promise<void>;
  removeGroupMember(groupId: number, userId: number): Promise<void>;
  getGroupMembers(groupId: number): Promise<User[]>;
  getGroupMembership(groupId: number, userId: number): Promise<string | undefined>;

  // Projects
  createProject(project: InsertProject & { creatorId: number }): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByGroup(groupId: number): Promise<Project[]>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Project collaborators
  addProjectCollaborator(projectId: number, userId: number, role?: string): Promise<void>;
  removeProjectCollaborator(projectId: number, userId: number): Promise<void>;
  getProjectCollaborators(projectId: number): Promise<User[]>;

  // Comments
  createComment(comment: InsertComment & { userId: number }): Promise<Comment>;
  getComment(id: number): Promise<Comment | undefined>;
  getCommentsByParent(parentId: number): Promise<Comment[]>;
  getCommentsByPublication(publicationId: number): Promise<Comment[]>;
  getCommentsByProject(projectId: number): Promise<Comment[]>;
  getCommentsByGroup(groupId: number): Promise<Comment[]>;
  deleteComment(id: number): Promise<void>;

  // Reactions
  addReaction(type: string, userId: number, target: {
    publicationId?: number;
    projectId?: number;
    commentId?: number;
  }): Promise<void>;
  removeReaction(userId: number, target: {
    publicationId?: number;
    projectId?: number;
    commentId?: number;
  }): Promise<void>;
  getReactionsByUser(userId: number): Promise<Reaction[]>;
  getReactionsByTarget(target: {
    publicationId?: number;
    projectId?: number;
    commentId?: number;
  }): Promise<Reaction[]>;

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

  // Keep existing method implementations...
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
        doi: publication.doi || null,
        pdfUrl: publication.pdfUrl || null,
        researchArea: publication.researchArea || null,
        citations: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    if (!newPublication) {
      throw new Error('Failed to create publication');
    }

    return newPublication;
  }

  async getPublication(id: number): Promise<Publication | undefined> {
    const result = await db
      .select()
      .from(publications)
      .where(eq(publications.id, id));

    return result[0];
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

  // Research Groups
  async createResearchGroup(group: InsertResearchGroup & { creatorId: number }): Promise<ResearchGroup> {
    const [newGroup] = await db
      .insert(researchGroups)
      .values(group)
      .returning();
    return newGroup;
  }

  async getResearchGroup(id: number): Promise<ResearchGroup | undefined> {
    const [group] = await db
      .select()
      .from(researchGroups)
      .where(eq(researchGroups.id, id));
    return group;
  }

  async getResearchGroups(): Promise<ResearchGroup[]> {
    return await db.select().from(researchGroups);
  }

  async updateResearchGroup(id: number, group: Partial<InsertResearchGroup>): Promise<ResearchGroup> {
    const [updated] = await db
      .update(researchGroups)
      .set(group)
      .where(eq(researchGroups.id, id))
      .returning();
    return updated;
  }

  async deleteResearchGroup(id: number): Promise<void> {
    await db.delete(researchGroups).where(eq(researchGroups.id, id));
  }

  // Group Memberships
  async addGroupMember(groupId: number, userId: number, role: string = 'member'): Promise<void> {
    await db
      .insert(groupMemberships)
      .values({ groupId, userId, role });
  }

  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    await db
      .delete(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId)
        )
      );
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId))
      .innerJoin(users, eq(users.id, groupMemberships.userId));

    return result.map(r => r.user);
  }

  async getGroupMembership(groupId: number, userId: number): Promise<string | undefined> {
    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId)
        )
      );
    return membership?.role;
  }

  // Projects
  async createProject(project: InsertProject & { creatorId: number }): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByGroup(groupId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.groupId, groupId));
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.creatorId, userId));
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project Collaborators
  async addProjectCollaborator(projectId: number, userId: number, role: string = 'collaborator'): Promise<void> {
    await db
      .insert(projectCollaborators)
      .values({ projectId, userId, role });
  }

  async removeProjectCollaborator(projectId: number, userId: number): Promise<void> {
    await db
      .delete(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, projectId),
          eq(projectCollaborators.userId, userId)
        )
      );
  }

  async getProjectCollaborators(projectId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(projectCollaborators)
      .where(eq(projectCollaborators.projectId, projectId))
      .innerJoin(users, eq(users.id, projectCollaborators.userId));

    return result.map(r => r.user);
  }

  // Comments
  async createComment(comment: InsertComment & { userId: number }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));
    return comment;
  }

  async getCommentsByParent(parentId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.parentId, parentId));
  }

  async getCommentsByPublication(publicationId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.publicationId, publicationId));
  }

  async getCommentsByProject(projectId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.projectId, projectId));
  }

  async getCommentsByGroup(groupId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.groupId, groupId));
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Reactions
  async addReaction(
    type: string,
    userId: number,
    target: {
      publicationId?: number;
      projectId?: number;
      commentId?: number;
    }
  ): Promise<void> {
    await db.insert(reactions).values({
      type,
      userId,
      ...target,
    });
  }

  async removeReaction(
    userId: number,
    target: {
      publicationId?: number;
      projectId?: number;
      commentId?: number;
    }
  ): Promise<void> {
    const conditions = [eq(reactions.userId, userId)];

    if (target.publicationId) {
      conditions.push(eq(reactions.publicationId, target.publicationId));
    }
    if (target.projectId) {
      conditions.push(eq(reactions.projectId, target.projectId));
    }
    if (target.commentId) {
      conditions.push(eq(reactions.commentId, target.commentId));
    }

    await db
      .delete(reactions)
      .where(and(...conditions));
  }

  async getReactionsByUser(userId: number): Promise<Reaction[]> {
    return await db
      .select()
      .from(reactions)
      .where(eq(reactions.userId, userId));
  }

  async getReactionsByTarget(target: {
    publicationId?: number;
    projectId?: number;
    commentId?: number;
  }): Promise<Reaction[]> {
    const conditions = [];

    if (target.publicationId) {
      conditions.push(eq(reactions.publicationId, target.publicationId));
    }
    if (target.projectId) {
      conditions.push(eq(reactions.projectId, target.projectId));
    }
    if (target.commentId) {
      conditions.push(eq(reactions.commentId, target.commentId));
    }

    return await db
      .select()
      .from(reactions)
      .where(or(...conditions));
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