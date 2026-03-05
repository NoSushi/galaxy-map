import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Planets ---
  app.get("/api/planets", async (_req, res) => {
    const planets = await storage.getAllPlanets();
    res.json(planets);
  });

  app.post("/api/planets", async (req, res) => {
    const planet = await storage.createPlanet(req.body);
    res.status(201).json(planet);
  });

  app.patch("/api/planets/:id", async (req, res) => {
    const planet = await storage.updatePlanet(req.params.id, req.body);
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    res.json(planet);
  });

  app.delete("/api/planets/:id", async (req, res) => {
    await storage.deletePlanet(req.params.id);
    res.status(204).send();
  });

  // --- Sectors ---
  app.get("/api/sectors", async (_req, res) => {
    const sectors = await storage.getAllSectors();
    res.json(sectors);
  });

  app.post("/api/sectors", async (req, res) => {
    const sector = await storage.createSector(req.body);
    res.status(201).json(sector);
  });

  app.patch("/api/sectors/:id", async (req, res) => {
    const sector = await storage.updateSector(req.params.id, req.body);
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    res.json(sector);
  });

  app.delete("/api/sectors/:id", async (req, res) => {
    await storage.deleteSector(req.params.id);
    res.status(204).send();
  });

  // --- Hyperspace Lanes ---
  app.get("/api/lanes", async (_req, res) => {
    const lanes = await storage.getAllLanes();
    res.json(lanes);
  });

  app.post("/api/lanes", async (req, res) => {
    const lane = await storage.createLane(req.body);
    res.status(201).json(lane);
  });

  app.patch("/api/lanes/:id", async (req, res) => {
    const lane = await storage.updateLane(req.params.id, req.body);
    if (!lane) return res.status(404).json({ error: "Lane not found" });
    res.json(lane);
  });

  app.delete("/api/lanes/:id", async (req, res) => {
    await storage.deleteLane(req.params.id);
    res.status(204).send();
  });

  // --- Fleets ---
  app.get("/api/fleets", async (_req, res) => {
    const fleets = await storage.getAllFleets();
    res.json(fleets);
  });

  app.post("/api/fleets", async (req, res) => {
    const fleet = await storage.createFleet(req.body);
    res.status(201).json(fleet);
  });

  app.patch("/api/fleets/:id", async (req, res) => {
    const fleet = await storage.updateFleet(req.params.id, req.body);
    if (!fleet) return res.status(404).json({ error: "Fleet not found" });
    res.json(fleet);
  });

  app.delete("/api/fleets/:id", async (req, res) => {
    await storage.deleteFleet(req.params.id);
    res.status(204).send();
  });

  return httpServer;
}
