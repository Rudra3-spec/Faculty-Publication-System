import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPublicationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Publications API
  app.get("/api/publications", async (req, res) => {
    const publications = await storage.getAllPublications();
    res.json(publications);
  });

  app.get("/api/publications/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    
    const results = await storage.searchPublications(query);
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

  const httpServer = createServer(app);
  return httpServer;
}
