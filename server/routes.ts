import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertPublicationSchema, updateUserSchema, insertResearchGroupSchema, insertProjectSchema, insertCommentSchema } from "@shared/schema";
import { generatePublicationSummary } from "./utils/summary";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads/profiles",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Ensure uploads directory exists
if (!fs.existsSync("./uploads/profiles")) {
  fs.mkdirSync("./uploads/profiles", { recursive: true });
}

// Store OTPs with expiration (5 minutes)
const otpStore = new Map<string, { otp: string; expires: Date }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(email: string, otp: string) {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 5); // 5 minutes expiration
  otpStore.set(email, { otp, expires });
}

function verifyOTP(email: string, otp: string): boolean {
  const storedData = otpStore.get(email);
  if (!storedData) return false;
  if (new Date() > storedData.expires) {
    otpStore.delete(email);
    return false;
  }
  return storedData.otp === otp;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Password Reset Routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email" });
      }

      const otp = generateOTP();
      storeOTP(email, otp);

      // For development, log the OTP (in production this would be sent via email)
      console.log(`[DEV] OTP for ${email}: ${otp}`);

      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process forgot password request" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      if (!verifyOTP(email, otp)) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!verifyOTP(email, otp)) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });

      // Clear the OTP after successful password reset
      otpStore.delete(email);

      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Add photo upload route
  app.post("/api/user/photo", upload.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      // Update user's profile picture URL
      const photoUrl = `/uploads/profiles/${req.file.filename}`;
      const user = await storage.updateUser(req.user!.id, {
        profilePicture: photoUrl,
      });

      res.json(user);
    } catch (error) {
      // Clean up uploaded file if update fails
      fs.unlinkSync(req.file.path);
      res.status(500).json({ message: "Failed to update profile picture" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Admin Registration
  app.post("/api/admin/register", async (req, res) => {
    if (req.body.adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ message: "Invalid admin secret" });
    }

    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await hashPassword(req.body.password);
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword,
      isAdmin: true,
    });

    res.status(201).json(user);
  });

  // User Profile
  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = updateUserSchema.parse(req.body);
    const user = await storage.updateUser(req.user!.id, parsed);
    res.json(user);
  });

  // Publications API
  app.get("/api/publications", async (req, res) => {
    const publications = await storage.getAllPublications();
    res.json(publications);
  });

  app.get("/api/publications/search", async (req, res) => {
    const query = req.query.query as string;
    const type = req.query.type as string;
    const year = req.query.year as string;

    let results = await storage.searchPublications(query || "");

    // Apply filters if they're not set to "All"
    if (type && type !== "All Types") {
      results = results.filter(pub => pub.type === type);
    }

    if (year && year !== "All Years") {
      results = results.filter(pub => pub.year.toString() === year);
    }

    res.json(results);
  });

  app.get("/api/publications/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const publications = await storage.getPublicationsByUser(userId);
    res.json(publications);
  });

  app.post("/api/publications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertPublicationSchema.parse(req.body);
    const publication = await storage.createPublication({
      ...parsed,
      userId: req.user!.id,
    });
    res.status(201).json(publication);
  });

  app.put("/api/publications/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const publication = await storage.getPublication(id);

    if (!publication) return res.sendStatus(404);
    if (publication.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.sendStatus(403);
    }

    const parsed = insertPublicationSchema.partial().parse(req.body);
    const updated = await storage.updatePublication(id, parsed);
    res.json(updated);
  });

  app.delete("/api/publications/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseInt(req.params.id);
    const publication = await storage.getPublication(id);

    if (!publication) return res.sendStatus(404);
    if (publication.userId !== req.user!.id && !req.user!.isAdmin) {
      return res.sendStatus(403);
    }

    await storage.deletePublication(id);
    res.sendStatus(204);
  });

  // Summary Generation
  app.get("/api/publications/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const format = req.query.format as string;
    const filter = req.query.filter as string;
    const userId = req.user!.id;

    const publications = await storage.getPublicationsByUser(userId);
    const summary = await generatePublicationSummary(publications, format, filter);

    res.setHeader("Content-Type", summary.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="publications_summary.${summary.extension}"`
    );
    res.send(summary.content);
  });

  // Social Features Routes

  // Follow/Unfollow
  app.post("/api/users/:id/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const followingId = parseInt(req.params.id);
    if (followingId === req.user!.id) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    try {
      await storage.followUser(req.user!.id, followingId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.post("/api/users/:id/unfollow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const followingId = parseInt(req.params.id);
    try {
      await storage.unfollowUser(req.user!.id, followingId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Get followers/following
  app.get("/api/users/:id/followers", async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (err) {
      res.status(500).json({ message: "Failed to get followers" });
    }
  });

  app.get("/api/users/:id/following", async (req, res) => {
    const userId = parseInt(req.params.id);
    try {
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (err) {
      res.status(500).json({ message: "Failed to get following" });
    }
  });

  // Check if following
  app.get("/api/users/:id/is-following", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const followingId = parseInt(req.params.id);
    try {
      const isFollowing = await storage.isFollowing(req.user!.id, followingId);
      res.json({ isFollowing });
    } catch (err) {
      res.status(500).json({ message: "Failed to check following status" });
    }
  });

  // Friend Requests
  app.post("/api/friend-requests/send/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const receiverId = parseInt(req.params.id);
    if (receiverId === req.user!.id) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    try {
      await storage.sendFriendRequest(req.user!.id, receiverId);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  app.post("/api/friend-requests/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const requestId = parseInt(req.params.id);
    try {
      await storage.acceptFriendRequest(requestId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  app.post("/api/friend-requests/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const requestId = parseInt(req.params.id);
    try {
      await storage.rejectFriendRequest(requestId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Failed to reject friend request" });
    }
  });

  app.get("/api/friend-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const requests = await storage.getFriendRequests(req.user!.id);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });


  // Research Groups API
  app.post("/api/research-groups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const parsed = insertResearchGroupSchema.parse(req.body);
      const group = await storage.createResearchGroup({
        ...parsed,
        creatorId: req.user!.id,
      });
      res.status(201).json(group);
    } catch (err) {
      res.status(400).json({ message: "Invalid research group data" });
    }
  });

  app.get("/api/research-groups", async (req, res) => {
    try {
      const groups = await storage.getResearchGroups();
      res.json(groups);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch research groups" });
    }
  });

  app.get("/api/research-groups/:id", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getResearchGroup(groupId);
      if (!group) return res.sendStatus(404);
      res.json(group);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch research group" });
    }
  });

  app.put("/api/research-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getResearchGroup(groupId);
      if (!group) return res.sendStatus(404);
      if (group.creatorId !== req.user!.id) return res.sendStatus(403);

      const parsed = insertResearchGroupSchema.partial().parse(req.body);
      const updated = await storage.updateResearchGroup(groupId, parsed);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/research-groups/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getResearchGroup(groupId);
      if (!group) return res.sendStatus(404);
      if (group.creatorId !== req.user!.id) return res.sendStatus(403);

      await storage.deleteResearchGroup(groupId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete research group" });
    }
  });

  // Group Memberships API
  app.post("/api/research-groups/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const groupId = parseInt(req.params.id);
      const { userId, role } = req.body;

      const group = await storage.getResearchGroup(groupId);
      if (!group) return res.sendStatus(404);
      if (group.creatorId !== req.user!.id) return res.sendStatus(403);

      await storage.addGroupMember(groupId, userId, role);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

  app.delete("/api/research-groups/:groupId/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);

      const group = await storage.getResearchGroup(groupId);
      if (!group) return res.sendStatus(404);
      if (group.creatorId !== req.user!.id && userId !== req.user!.id) {
        return res.sendStatus(403);
      }

      await storage.removeGroupMember(groupId, userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  app.get("/api/research-groups/:id/members", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  // Projects API
  app.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const parsed = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...parsed,
        creatorId: req.user!.id,
      });
      res.status(201).json(project);
    } catch (err) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.sendStatus(404);
      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/research-groups/:id/projects", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const projects = await storage.getProjectsByGroup(groupId);
      res.json(projects);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch group projects" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.sendStatus(404);
      if (project.creatorId !== req.user!.id) return res.sendStatus(403);

      const parsed = insertProjectSchema.partial().parse(req.body);
      const updated = await storage.updateProject(projectId, parsed);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) return res.sendStatus(404);
      if (project.creatorId !== req.user!.id) return res.sendStatus(403);

      await storage.deleteProject(projectId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project Collaborators API
  app.post("/api/projects/:id/collaborators", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const projectId = parseInt(req.params.id);
      const { userId, role } = req.body;

      const project = await storage.getProject(projectId);
      if (!project) return res.sendStatus(404);
      if (project.creatorId !== req.user!.id) return res.sendStatus(403);

      await storage.addProjectCollaborator(projectId, userId, role);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });

  app.delete("/api/projects/:projectId/collaborators/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);

      const project = await storage.getProject(projectId);
      if (!project) return res.sendStatus(404);
      if (project.creatorId !== req.user!.id && userId !== req.user!.id) {
        return res.sendStatus(403);
      }

      await storage.removeProjectCollaborator(projectId, userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });

  app.get("/api/projects/:id/collaborators", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const collaborators = await storage.getProjectCollaborators(projectId);
      res.json(collaborators);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  // Comments API
  app.post("/api/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const parsed = insertCommentSchema.parse(req.body);
      const comment = await storage.createComment({
        ...parsed,
        userId: req.user!.id,
      });
      res.status(201).json(comment);
    } catch (err) {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const replies = await storage.getCommentsByParent(parentId);
      res.json(replies);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch replies" });
    }
  });

  app.get("/api/publications/:id/comments", async (req, res) => {
    try {
      const publicationId = parseInt(req.params.id);
      const comments = await storage.getCommentsByPublication(publicationId);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.get("/api/projects/:id/comments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const comments = await storage.getCommentsByProject(projectId);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const commentId = parseInt(req.params.id);
      const comment = await storage.getComment(commentId);
      if (!comment) return res.sendStatus(404);
      if (comment.userId !== req.user!.id) return res.sendStatus(403);

      await storage.deleteComment(commentId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Reactions API
  app.post("/api/reactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { type, publicationId, projectId, commentId } = req.body;
      if (!publicationId && !projectId && !commentId) {
        return res.status(400).json({ message: "Target is required" });
      }

      await storage.addReaction(type, req.user!.id, {
        publicationId,
        projectId,
        commentId,
      });
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  app.delete("/api/reactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { publicationId, projectId, commentId } = req.body;
      if (!publicationId && !projectId && !commentId) {
        return res.status(400).json({ message: "Target is required" });
      }

      await storage.removeReaction(req.user!.id, {
        publicationId,
        projectId,
        commentId,
      });
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  app.get("/api/reactions", async (req, res) => {
    const { publicationId, projectId, commentId } = req.query;

    try {
      const reactions = await storage.getReactionsByTarget({
        publicationId: publicationId ? parseInt(publicationId as string) : undefined,
        projectId: projectId ? parseInt(projectId as string) : undefined,
        commentId: commentId ? parseInt(commentId as string) : undefined,
      });
      res.json(reactions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch reactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}