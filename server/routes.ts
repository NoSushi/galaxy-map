import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, verifyPassword } from "./auth";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

type Permission = "canEditPlanets" | "canEditSectors" | "canEditLanes" | "canEditFleets" | "canManageFactions" | "canEditSettlements";

function requireEditor(permission: Permission): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    if (!user.isAdmin && !user[permission]) {
      return res.status(403).json({ error: "Permission denied" });
    }
    next();
  };
}

const DEFAULT_FACTIONS = [
  { id: 'f-republic', name: 'Galactic Republic', color: '210 80% 55%' },
  { id: 'f-empire', name: 'Empire', color: '0 75% 50%' },
  { id: 'f-hutt', name: 'Hutt Cartel', color: '45 80% 50%' },
  { id: 'f-chiss', name: 'Chiss Ascendancy', color: '240 70% 55%' },
  { id: 'f-independent', name: 'Independent', color: '137 41% 31%' },
];

async function seedDefaults() {
  const existingFactions = await storage.getAllFactions();
  if (existingFactions.length === 0) {
    for (const f of DEFAULT_FACTIONS) {
      await storage.createFaction(f);
    }
  }

  const existingUsers = await storage.getAllUsers();
  if (existingUsers.length === 0) {
    const hash = await hashPassword('admin123');
    await storage.createUser({
      id: 'u-admin',
      username: 'admin',
      passwordHash: hash,
      isAdmin: true,
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDefaults();

  // --- Planets ---
  app.get("/api/planets", async (_req, res) => {
    const planets = await storage.getAllPlanets();
    res.json(planets);
  });

  app.post("/api/planets", requireEditor("canEditPlanets"), async (req, res) => {
    const planet = await storage.createPlanet(req.body);
    res.status(201).json(planet);
  });

  // Planet editors can change anything. Settlement administrators (canEditSettlements)
  // may PATCH a planet only when the payload touches nothing but `settlements`.
  app.patch("/api/planets/:id", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const { id: _ignoredId, ...body } = req.body; // never allow primary-key mutation
    const keys = Object.keys(body);
    const settlementsOnly = keys.length > 0 && keys.every(k => k === "settlements");
    const allowed = user.isAdmin || user.canEditPlanets || (user.canEditSettlements && settlementsOnly);
    if (!allowed) return res.status(403).json({ error: "Permission denied" });
    // Settlement administrators can persist nothing but the settlements field
    const patch = (user.isAdmin || user.canEditPlanets) ? body : { settlements: body.settlements };
    const planet = await storage.updatePlanet(String(req.params.id), patch);
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    res.json(planet);
  });

  app.delete("/api/planets/:id", requireEditor("canEditPlanets"), async (req, res) => {
    await storage.deletePlanet(String(req.params.id));
    res.status(204).send();
  });

  // --- Sectors ---
  app.get("/api/sectors", async (_req, res) => {
    const sectors = await storage.getAllSectors();
    res.json(sectors);
  });

  app.post("/api/sectors", requireEditor("canEditSectors"), async (req, res) => {
    const sector = await storage.createSector(req.body);
    res.status(201).json(sector);
  });

  app.patch("/api/sectors/:id", requireEditor("canEditSectors"), async (req, res) => {
    const sector = await storage.updateSector(String(req.params.id), req.body);
    if (!sector) return res.status(404).json({ error: "Sector not found" });
    res.json(sector);
  });

  app.delete("/api/sectors/:id", requireEditor("canEditSectors"), async (req, res) => {
    await storage.deleteSector(String(req.params.id));
    res.status(204).send();
  });

  // --- Hyperspace Lanes ---
  app.get("/api/lanes", async (_req, res) => {
    const lanes = await storage.getAllLanes();
    res.json(lanes);
  });

  app.post("/api/lanes", requireEditor("canEditLanes"), async (req, res) => {
    const lane = await storage.createLane(req.body);
    res.status(201).json(lane);
  });

  app.patch("/api/lanes/:id", requireEditor("canEditLanes"), async (req, res) => {
    const lane = await storage.updateLane(String(req.params.id), req.body);
    if (!lane) return res.status(404).json({ error: "Lane not found" });
    res.json(lane);
  });

  app.delete("/api/lanes/:id", requireEditor("canEditLanes"), async (req, res) => {
    await storage.deleteLane(String(req.params.id));
    res.status(204).send();
  });

  // --- Fleets ---
  app.get("/api/fleets", async (_req, res) => {
    const fleets = await storage.getAllFleets();
    res.json(fleets);
  });

  app.post("/api/fleets", requireEditor("canEditFleets"), async (req, res) => {
    const fleet = await storage.createFleet(req.body);
    res.status(201).json(fleet);
  });

  app.patch("/api/fleets/:id", requireEditor("canEditFleets"), async (req, res) => {
    const fleet = await storage.updateFleet(String(req.params.id), req.body);
    if (!fleet) return res.status(404).json({ error: "Fleet not found" });
    res.json(fleet);
  });

  app.delete("/api/fleets/:id", requireEditor("canEditFleets"), async (req, res) => {
    await storage.deleteFleet(String(req.params.id));
    res.status(204).send();
  });

  // --- Factions ---
  app.get("/api/factions", async (_req, res) => {
    const factionList = await storage.getAllFactions();
    res.json(factionList);
  });

  app.post("/api/factions", requireEditor("canManageFactions"), async (req, res) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const faction = await storage.createFaction({
      id: `f-${Date.now()}`,
      name,
      color: color || '0 50% 50%',
    });
    res.status(201).json(faction);
  });

  app.patch("/api/factions/:id", requireEditor("canManageFactions"), async (req, res) => {
    const faction = await storage.updateFaction(String(req.params.id), req.body);
    if (!faction) return res.status(404).json({ error: "Faction not found" });
    res.json(faction);
  });

  app.delete("/api/factions/:id", requireEditor("canManageFactions"), async (req, res) => {
    const defaultIds = DEFAULT_FACTIONS.map(f => f.id);
    if (defaultIds.includes(String(req.params.id))) {
      return res.status(400).json({ error: "Cannot delete a built-in faction" });
    }
    await storage.deleteFaction(String(req.params.id));
    res.status(204).send();
  });

  // --- Auth ---
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    req.session.userId = user.id;
    res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      canEditPlanets: user.canEditPlanets,
      canEditSectors: user.canEditSectors,
      canEditLanes: user.canEditLanes,
      canEditFleets: user.canEditFleets,
      canManageFactions: user.canManageFactions,
      canEditSettlements: user.canEditSettlements,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      canEditPlanets: user.canEditPlanets,
      canEditSectors: user.canEditSectors,
      canEditLanes: user.canEditLanes,
      canEditFleets: user.canEditFleets,
      canManageFactions: user.canManageFactions,
      canEditSettlements: user.canEditSettlements,
    });
  });

  app.post("/api/auth/change-password", async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "All fields required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Current password incorrect" });
    const newHash = await hashPassword(newPassword);
    await storage.updateUser(user.id, { passwordHash: newHash });
    res.json({ success: true });
  });

  // --- Admin: User management ---
  function serializeUser(u: any) {
    return {
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      canEditPlanets: u.canEditPlanets,
      canEditSectors: u.canEditSectors,
      canEditLanes: u.canEditLanes,
      canEditFleets: u.canEditFleets,
      canManageFactions: u.canManageFactions,
      canEditSettlements: u.canEditSettlements,
    };
  }

  app.get("/api/admin/users", async (req, res) => {
    const { username, password } = req.query as { username: string, password: string };
    const admin = await storage.getUserByUsername(username);
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Admin access required" });
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(serializeUser));
  });

  app.post("/api/admin/users", async (req, res) => {
    const { adminUsername, adminPassword, username, password, isAdmin, canEditPlanets, canEditSectors, canEditLanes, canEditFleets, canManageFactions, canEditSettlements } = req.body;
    const admin = await storage.getUserByUsername(adminUsername);
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const valid = await verifyPassword(adminPassword, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Admin access required" });
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Username already exists" });
    const hash = await hashPassword(password);
    const user = await storage.createUser({
      id: `u-${Date.now()}`,
      username,
      passwordHash: hash,
      isAdmin: isAdmin || false,
      canEditPlanets: canEditPlanets || false,
      canEditSectors: canEditSectors || false,
      canEditLanes: canEditLanes || false,
      canEditFleets: canEditFleets || false,
      canManageFactions: canManageFactions || false,
      canEditSettlements: canEditSettlements || false,
    });
    res.status(201).json(serializeUser(user));
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    const { adminUsername, adminPassword, isAdmin, canEditPlanets, canEditSectors, canEditLanes, canEditFleets, canManageFactions, canEditSettlements } = req.body;
    const admin = await storage.getUserByUsername(adminUsername);
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const valid = await verifyPassword(adminPassword, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Admin access required" });
    const user = await storage.updateUser(String(req.params.id), { isAdmin, canEditPlanets, canEditSectors, canEditLanes, canEditFleets, canManageFactions, canEditSettlements });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(serializeUser(user));
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const { adminUsername, adminPassword } = req.body;
    const admin = await storage.getUserByUsername(adminUsername);
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const valid = await verifyPassword(adminPassword, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Admin access required" });
    if (String(req.params.id) === admin.id) return res.status(400).json({ error: "Cannot delete your own account" });
    await storage.deleteUser(String(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
