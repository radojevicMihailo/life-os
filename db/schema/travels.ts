import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const travelRegionEnum = pgEnum("travel_region", [
  "srbija",
  "okolne_drzave",
  "evropa",
  "svet",
]);

export const travelStatusEnum = pgEnum("travel_status", [
  "idea",
  "planning",
  "booked",
  "done",
]);

export type TravelRegion = (typeof travelRegionEnum.enumValues)[number];
export type TravelStatus = (typeof travelStatusEnum.enumValues)[number];

export const travelRegionLabel: Record<TravelRegion, string> = {
  srbija: "Srbija",
  okolne_drzave: "Okolne države",
  evropa: "Evropa",
  svet: "Svet",
};

export const travelStatusLabel: Record<TravelStatus, string> = {
  idea: "Idea",
  planning: "Planning",
  booked: "Booked",
  done: "Done",
};

export const travel = pgTable(
  "travels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    region: travelRegionEnum("region").notNull().default("srbija"),
    status: travelStatusEnum("status").notNull().default("idea"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    people: text("people"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("travel_status_idx").on(t.status),
    index("travel_start_date_idx").on(t.startDate),
  ],
);

export type Travel = typeof travel.$inferSelect;
export type NewTravel = typeof travel.$inferInsert;
