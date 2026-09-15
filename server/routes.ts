import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, verifyPassword } from "./auth";
import { z } from "zod";
import { convertImageToWebP, ImageConversionError } from "./image-conversion";
import { getRegionImportPreview, applyRegionImport } from "./region-import";
import { getAppendixPreview, applyAppendixRegions } from "./appendix-import";

const settlementSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(200),
  size: z.enum(["Outpost", "Village", "Town", "City"]),
  settlementType: z.string().max(200).optional(),
  holder: z.string().max(200).optional(),
  exports: z.string().max(500),
  administration: z.number().int().min(0).max(4),
  defenses: z.number().int().min(0).max(4),
  communications: z.number().int().min(0).max(4),
  infrastructure: z.number().int().min(0).max(4),
  portSize: z.number().int().min(0).max(4),
  medical: z.number().int().min(0).max(4),
  shieldGenerator: z.boolean(),
});
const settlementsSchema = z.array(settlementSchema).max(50).nullable();

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

type Permission = "canEditPlanets" | "canEditSectors" | "canEditLanes" | "canEditFleets" | "canManageFactions" | "canEditSettlements" | "canEditWarzones";

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
    if (req.body.settlements !== undefined) {
      const parsed = settlementsSchema.safeParse(req.body.settlements);
      if (!parsed.success) return res.status(400).json({ error: "Invalid settlements payload" });
      req.body.settlements = parsed.data;
    }
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
    const warzoneToggleOnly = keys.length > 0 && keys.every(k => k === "isWarzone");
    const warzoneContentFields = new Set([
      "warzoneBattleName", "warzoneBattlesWon", "warzoneBattlesLost",
      "warzoneObjectives", "warzoneSystemLayout", "warzoneForces",
    ]);
    const warzoneContentOnly = keys.length > 0 && keys.every(k => warzoneContentFields.has(k));
    const targetPlanet = (user.canEditWarzones && (warzoneToggleOnly || warzoneContentOnly))
      ? await storage.getPlanet(String(req.params.id))
      : undefined;
    const canEditWarzoneContent = !!(user.canEditWarzones && warzoneContentOnly && targetPlanet?.isWarzone);
    const allowed = user.isAdmin || user.canEditPlanets ||
      (user.canEditSettlements && settlementsOnly) ||
      (user.canEditWarzones && warzoneToggleOnly) ||
      canEditWarzoneContent;
    if (!allowed) return res.status(403).json({ error: "Permission denied" });
    if (body.settlements !== undefined) {
      const parsed = settlementsSchema.safeParse(body.settlements);
      if (!parsed.success) return res.status(400).json({ error: "Invalid settlements payload" });
      body.settlements = parsed.data;
    }
    // Settlement administrators can persist nothing but the settlements field
    const patch = (user.isAdmin || user.canEditPlanets)
      ? body
      : settlementsOnly
        ? { settlements: body.settlements }
        : warzoneToggleOnly
          ? { isWarzone: body.isWarzone }
          : body;
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

  app.post("/api/fleets", async (req, res) => {
    const userId = req.session?.userId;
    const user = userId ? await storage.getUser(userId) : undefined;
    if (!user) return res.status(401).json({ error: "Authentication required" });

    if (!user.isAdmin && !user.canEditFleets) {
      if (!user.canEditWarzones) return res.status(403).json({ error: "Permission denied" });
      const theatre = req.body.warzonePlanetId
        ? await storage.getPlanet(String(req.body.warzonePlanetId))
        : undefined;
      if (!theatre?.isWarzone) return res.status(403).json({ error: "A warzone theatre is required" });
      const fleet = await storage.createFleet({
        ...req.body,
        x: theatre.x,
        y: theatre.y,
        warzonePlanetId: theatre.id,
        theatreOnly: true,
      });
      return res.status(201).json(fleet);
    }

    const fleet = await storage.createFleet(req.body);
    res.status(201).json(fleet);
  });

  app.patch("/api/fleets/:id", async (req, res) => {
    const userId = req.session?.userId;
    const user = userId ? await storage.getUser(userId) : undefined;
    if (!user) return res.status(401).json({ error: "Authentication required" });

    let patch = req.body;
    if (!user.isAdmin && !user.canEditFleets) {
      const existing = await storage.getFleet(String(req.params.id));
      const theatreId = existing?.warzonePlanetId;
      const theatre = theatreId ? await storage.getPlanet(theatreId) : undefined;
      if (!user.canEditWarzones || !existing || !theatre?.isWarzone ||
          req.body.warzonePlanetId !== theatre.id) {
        return res.status(403).json({ error: "Permission denied" });
      }
      const theatreFleetFields = [
        "name", "faction", "description", "markerImage", "isCapitalShip",
        "labelMode", "color", "theatreX", "theatreY",
      ];
      patch = Object.fromEntries(
        theatreFleetFields
          .filter(key => Object.prototype.hasOwnProperty.call(req.body, key))
          .map(key => [key, req.body[key]])
      );
    }

    const fleet = await storage.updateFleet(String(req.params.id), patch);
    if (!fleet) return res.status(404).json({ error: "Fleet not found" });
    res.json(fleet);
  });

  app.delete("/api/fleets/:id", async (req, res) => {
    const userId = req.session?.userId;
    const user = userId ? await storage.getUser(userId) : undefined;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    if (!user.isAdmin && !user.canEditFleets) {
      const existing = await storage.getFleet(String(req.params.id));
      const theatre = existing?.warzonePlanetId
        ? await storage.getPlanet(existing.warzonePlanetId)
        : undefined;
      if (!user.canEditWarzones || !existing || !theatre?.isWarzone) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }
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

  // --- Map overlays ---
  app.get("/api/appendix-regions", requireEditor("canEditPlanets"), async (_req, res) => {
    res.json(await getAppendixPreview());
  });
  app.post("/api/appendix-regions", requireEditor("canEditPlanets"), async (req, res) => {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ error: "Confirm the appendix region changes before applying them" });
    }
    res.json(await applyAppendixRegions());
  });

  app.get("/api/region-import", requireEditor("canEditPlanets"), async (_req, res) => {
    res.json(await getRegionImportPreview());
  });

  app.post("/api/region-import", requireEditor("canEditPlanets"), async (req, res) => {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ error: "Confirm the region import before applying it" });
    }
    res.json(await applyRegionImport());
  });

  app.get("/api/overlays", async (_req, res) => {
    res.json(await storage.getAllMapOverlays());
  });

  app.post("/api/overlays", requireEditor("canEditPlanets"), async (req, res) => {
    const { id, name, imageData, x, y, width, height, opacity } = req.body;
    if (!id || !name || typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
      return res.status(400).json({ error: "A name and image upload are required" });
    }
    if (imageData.length > 12_000_000) {
      return res.status(413).json({ error: "Overlay image is too large" });
    }
    let convertedImage: string;
    try {
      convertedImage = await convertImageToWebP(imageData);
    } catch (error) {
      if (error instanceof ImageConversionError) return res.status(error.status).json({ error: error.message });
      throw error;
    }
    const overlay = await storage.createMapOverlay({
      id: String(id),
      name: String(name).slice(0, 120),
      imageData: convertedImage,
      x: Number.isFinite(x) ? Math.round(x) : 0,
      y: Number.isFinite(y) ? Math.round(y) : 0,
      width: Number.isFinite(width) ? Math.max(100, Math.round(width)) : 5000,
      height: Number.isFinite(height) ? Math.max(100, Math.round(height)) : 5000,
      opacity: Number.isFinite(opacity) ? Math.max(0, Math.min(100, Math.round(opacity))) : 50,
    });
    res.status(201).json(overlay);
  });

  app.patch("/api/overlays/:id", requireEditor("canEditPlanets"), async (req, res) => {
    const patch: Record<string, unknown> = {};
    for (const key of ["name", "x", "y", "width", "height", "opacity"]) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) patch[key] = req.body[key];
    }
    if (typeof req.body.imageData === "string") {
      if (!req.body.imageData.startsWith("data:image/") || req.body.imageData.length > 12_000_000) {
        return res.status(400).json({ error: "Invalid overlay image" });
      }
      // Ordinary edits send the existing image too; do not recompress it.
      const existing = await storage.getMapOverlay(String(req.params.id));
      if (!existing) return res.status(404).json({ error: "Overlay not found" });
      if (existing.imageData !== req.body.imageData) {
        try {
          patch.imageData = await convertImageToWebP(req.body.imageData);
        } catch (error) {
          if (error instanceof ImageConversionError) return res.status(error.status).json({ error: error.message });
          throw error;
        }
      }
    }
    if (typeof patch.name === "string") patch.name = patch.name.slice(0, 120);
    for (const key of ["x", "y", "width", "height", "opacity"]) {
      if (key in patch) {
        const value = Number(patch[key]);
        if (!Number.isFinite(value)) return res.status(400).json({ error: `Invalid overlay ${key}` });
        patch[key] = key === "opacity"
          ? Math.max(0, Math.min(100, Math.round(value)))
          : Math.round(value);
      }
    }
    const overlay = await storage.updateMapOverlay(String(req.params.id), patch);
    if (!overlay) return res.status(404).json({ error: "Overlay not found" });
    res.json(overlay);
  });

  app.delete("/api/overlays/:id", requireEditor("canEditPlanets"), async (req, res) => {
    await storage.deleteMapOverlay(String(req.params.id));
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
      canEditWarzones: user.canEditWarzones,
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
      canEditWarzones: user.canEditWarzones,
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
      canEditWarzones: u.canEditWarzones,
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
    const { adminUsername, adminPassword, username, password, isAdmin, canEditPlanets, canEditSectors, canEditLanes, canEditFleets, canManageFactions, canEditSettlements, canEditWarzones } = req.body;
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
      canEditWarzones: canEditWarzones || false,
    });
    res.status(201).json(serializeUser(user));
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    const { adminUsername, adminPassword, isAdmin, canEditPlanets, canEditSectors, canEditLanes, canEditFleets, canManageFactions, canEditSettlements, canEditWarzones } = req.body;
    const admin = await storage.getUserByUsername(adminUsername);
    if (!admin || !admin.isAdmin) return res.status(403).json({ error: "Admin access required" });
    const valid = await verifyPassword(adminPassword, admin.passwordHash);
    if (!valid) return res.status(403).json({ error: "Admin access required" });
    const user = await storage.updateUser(String(req.params.id), { isAdmin, canEditPlanets, canEditSectors, canEditLanes, canEditFleets, canManageFactions, canEditSettlements, canEditWarzones });
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
