import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertPublicationSchema, updateUserSchema } from "@shared/schema";
import { generatePublicationSummary } from "./utils/summary";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
    const query = req.query.q as string;
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