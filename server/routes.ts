import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertPublicationSchema, updateUserSchema } from "@shared/schema";
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
    const { email } = req.body;
    const user = await storage.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();
    storeOTP(email, otp);

    // In a real application, send the OTP via email
    // For now, just console log it
    console.log(`OTP for ${email}: ${otp}`);

    res.status(200).json({ message: "OTP sent successfully" });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (!verifyOTP(email, otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ message: "OTP verified successfully" });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;

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

  const httpServer = createServer(app);
  return httpServer;
}