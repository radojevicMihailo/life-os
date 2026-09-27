import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const noteKindEnum = pgEnum("note_kind", ["free", "todo"]);

export type NoteKind = (typeof noteKindEnum.enumValues)[number];

export const noteKindLabel: Record<NoteKind, string> = {
  free: "Slobodna beleška",
  todo: "Lista zadataka",
};

export const noteCategory = pgTable("note_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const note = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    kind: noteKindEnum("kind").notNull().default("free"),
    body: text("body").notNull().default(""),
    categoryId: uuid("category_id").references(() => noteCategory.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_updated_at_idx").on(t.updatedAt), index("notes_category_idx").on(t.categoryId)],
);

export const noteItem = pgTable(
  "note_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => note.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("note_items_note_position_idx").on(t.noteId, t.position)],
);
