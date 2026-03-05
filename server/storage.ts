import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  planets, sectors, hyperspaceLanes, fleets,
  type Planet, type InsertPlanet,
  type Sector, type InsertSector,
  type HyperspaceLane, type InsertLane,
  type Fleet, type InsertFleet,
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
    const [updated] = await db.update(planets).set(data).where(eq(planets.id, id)).returning();
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
}

export const storage = new DatabaseStorage();
