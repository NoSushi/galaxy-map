import { pgTable, text, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const planets = pgTable("planets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  sectorId: varchar("sector_id", { length: 64 }),
  faction: text("faction").notNull().default("Independent"),
  habitable: boolean("habitable").notNull().default(true),
  environment: text("environment").notNull().default("Unknown"),
  population: text("population"),
  description: text("description").notNull().default(""),
  image: text("image"),
  markerImage: text("marker_image"),
  isCapital: boolean("is_capital").default(false),
  capitalOf: text("capital_of"),
  isMinor: boolean("is_minor").default(false),
  isPowerbaseCapital: boolean("is_powerbase_capital").default(false),
  powerbaseOf: text("powerbase_of"),
  oversector: text("oversector"),
  travelable: boolean("travelable").default(true),
  labelMode: text("label_mode").default("normal"),
  isWarzone: boolean("is_warzone").default(false),
});

export const sectors = pgTable("sectors", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  points: jsonb("points").notNull().$type<[number, number][]>(),
  faction: text("faction").notNull().default("Independent"),
  isContested: boolean("is_contested").default(false),
  contestedFaction1: text("contested_faction_1"),
  contestedFaction2: text("contested_faction_2"),
});

export const hyperspaceLanes = pgTable("hyperspace_lanes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  planetIds: jsonb("planet_ids").notNull().$type<string[]>(),
  type: text("type").notNull().default("Minor"),
  pathPoints: jsonb("path_points").$type<[number, number][]>(),
});

export const fleets = pgTable("fleets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  icon: text("icon").default("default"),
  faction: text("faction").notNull().default("Independent"),
  description: text("description").notNull().default(""),
  markerImage: text("marker_image"),
  isCapitalShip: boolean("is_capital_ship").default(false),
  labelMode: text("label_mode").default("hover"),
});

export const factions = pgTable("factions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("0 50% 50%"),
});

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  canEditPlanets: boolean("can_edit_planets").notNull().default(false),
  canEditSectors: boolean("can_edit_sectors").notNull().default(false),
  canEditLanes: boolean("can_edit_lanes").notNull().default(false),
  canEditFleets: boolean("can_edit_fleets").notNull().default(false),
  canManageFactions: boolean("can_manage_factions").notNull().default(false),
});

export const insertPlanetSchema = createInsertSchema(planets);
export const insertSectorSchema = createInsertSchema(sectors);
export const insertLaneSchema = createInsertSchema(hyperspaceLanes);
export const insertFleetSchema = createInsertSchema(fleets);
export const insertFactionSchema = createInsertSchema(factions);
export const insertUserSchema = createInsertSchema(users);

export type Planet = typeof planets.$inferSelect;
export type InsertPlanet = z.infer<typeof insertPlanetSchema>;
export type Sector = typeof sectors.$inferSelect;
export type InsertSector = z.infer<typeof insertSectorSchema>;
export type HyperspaceLane = typeof hyperspaceLanes.$inferSelect;
export type InsertLane = z.infer<typeof insertLaneSchema>;
export type Fleet = typeof fleets.$inferSelect;
export type InsertFleet = z.infer<typeof insertFleetSchema>;
export type Faction = typeof factions.$inferSelect;
export type InsertFaction = z.infer<typeof insertFactionSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
