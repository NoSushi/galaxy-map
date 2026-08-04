import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  planets, sectors, hyperspaceLanes, fleets, factions, users,
  type Planet, type InsertPlanet,
  type Sector, type InsertSector,
  type HyperspaceLane, type InsertLane,
  type Fleet, type InsertFleet,
  type Faction, type InsertFaction,
  type User, type InsertUser,
} from "@shared/schema";

export interface IStorage {
  getAllPlanets(): Promise<Planet[]>;
  getPlanet(id: string): Promise<Planet | undefined>;
  createPlanet(planet: InsertPlanet): Promise<Planet>;
  updatePlanet(id: string, planet: Partial<InsertPlanet>): Promise<Planet | undefined>;
  deletePlanet(id: string): Promise<void>;

  getAllSectors(): Promise<Sector[]>;
  getSector(id: string): Promise<Sector | undefined>;
  createSector(sector: InsertSector): Promise<Sector>;
  updateSector(id: string, sector: Partial<InsertSector>): Promise<Sector | undefined>;
  deleteSector(id: string): Promise<void>;

  getAllLanes(): Promise<HyperspaceLane[]>;
  getLane(id: string): Promise<HyperspaceLane | undefined>;
  createLane(lane: InsertLane): Promise<HyperspaceLane>;
  updateLane(id: string, lane: Partial<InsertLane>): Promise<HyperspaceLane | undefined>;
  deleteLane(id: string): Promise<void>;

  getAllFleets(): Promise<Fleet[]>;
  getFleet(id: string): Promise<Fleet | undefined>;
  createFleet(fleet: InsertFleet): Promise<Fleet>;
  updateFleet(id: string, fleet: Partial<InsertFleet>): Promise<Fleet | undefined>;
  deleteFleet(id: string): Promise<void>;

  getAllFactions(): Promise<Faction[]>;
  getFaction(id: string): Promise<Faction | undefined>;
  createFaction(faction: InsertFaction): Promise<Faction>;
  updateFaction(id: string, faction: Partial<InsertFaction>): Promise<Faction | undefined>;
  deleteFaction(id: string): Promise<void>;

  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllPlanets(): Promise<Planet[]> {
    return db.select().from(planets);
  }
  async getPlanet(id: string): Promise<Planet | undefined> {
    const [planet] = await db.select().from(planets).where(eq(planets.id, id));
    return planet;
  }
  async createPlanet(planet: InsertPlanet): Promise<Planet> {
    const [created] = await db.insert(planets).values(planet).returning();
    return created;
  }
  async updatePlanet(id: string, data: Partial<InsertPlanet>): Promise<Planet | undefined> {
    // Field-level merge: only the supplied fields are written. Strip any
    // client-sent id so the primary key can never be rewritten by a PATCH.
    const { id: _ignored, ...fields } = data as Record<string, unknown>;
    if (Object.keys(fields).length === 0) return this.getPlanet(id);
    const [updated] = await db.update(planets).set(fields).where(eq(planets.id, id)).returning();
    return updated;
  }
  async deletePlanet(id: string): Promise<void> {
    await db.delete(planets).where(eq(planets.id, id));
  }

  async getAllSectors(): Promise<Sector[]> {
    return db.select().from(sectors);
  }
  async getSector(id: string): Promise<Sector | undefined> {
    const [sector] = await db.select().from(sectors).where(eq(sectors.id, id));
    return sector;
  }
  async createSector(sector: InsertSector): Promise<Sector> {
    const [created] = await db.insert(sectors).values(sector).returning();
    return created;
  }
  async updateSector(id: string, data: Partial<InsertSector>): Promise<Sector | undefined> {
    const [updated] = await db.update(sectors).set(data).where(eq(sectors.id, id)).returning();
    return updated;
  }
  async deleteSector(id: string): Promise<void> {
    await db.delete(sectors).where(eq(sectors.id, id));
  }

  async getAllLanes(): Promise<HyperspaceLane[]> {
    return db.select().from(hyperspaceLanes);
  }
  async getLane(id: string): Promise<HyperspaceLane | undefined> {
    const [lane] = await db.select().from(hyperspaceLanes).where(eq(hyperspaceLanes.id, id));
    return lane;
  }
  async createLane(lane: InsertLane): Promise<HyperspaceLane> {
    const [created] = await db.insert(hyperspaceLanes).values(lane).returning();
    return created;
  }
  async updateLane(id: string, data: Partial<InsertLane>): Promise<HyperspaceLane | undefined> {
    const [updated] = await db.update(hyperspaceLanes).set(data).where(eq(hyperspaceLanes.id, id)).returning();
    return updated;
  }
  async deleteLane(id: string): Promise<void> {
    await db.delete(hyperspaceLanes).where(eq(hyperspaceLanes.id, id));
  }

  async getAllFleets(): Promise<Fleet[]> {
    return db.select().from(fleets);
  }
  async getFleet(id: string): Promise<Fleet | undefined> {
    const [fleet] = await db.select().from(fleets).where(eq(fleets.id, id));
    return fleet;
  }
  async createFleet(fleet: InsertFleet): Promise<Fleet> {
    const [created] = await db.insert(fleets).values(fleet).returning();
    return created;
  }
  async updateFleet(id: string, data: Partial<InsertFleet>): Promise<Fleet | undefined> {
    const [updated] = await db.update(fleets).set(data).where(eq(fleets.id, id)).returning();
    return updated;
  }
  async deleteFleet(id: string): Promise<void> {
    await db.delete(fleets).where(eq(fleets.id, id));
  }

  async getAllFactions(): Promise<Faction[]> {
    return db.select().from(factions);
  }
  async getFaction(id: string): Promise<Faction | undefined> {
    const [faction] = await db.select().from(factions).where(eq(factions.id, id));
    return faction;
  }
  async createFaction(faction: InsertFaction): Promise<Faction> {
    const [created] = await db.insert(factions).values(faction).returning();
    return created;
  }
  async updateFaction(id: string, data: Partial<InsertFaction>): Promise<Faction | undefined> {
    const [updated] = await db.update(factions).set(data).where(eq(factions.id, id)).returning();
    return updated;
  }
  async deleteFaction(id: string): Promise<void> {
    await db.delete(factions).where(eq(factions.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();
