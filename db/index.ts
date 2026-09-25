import "server-only";
import { pool } from "./pool";
import { drizzle } from "drizzle-orm/node-postgres";
import * as tasksSchema from "./schema/tasks";
import * as physicalSchema from "./schema/physical";

import * as settingsSchema from "./schema/settings";
import * as goalsSchema from "./schema/goals";
import * as habitsSchema from "./schema/habits";
import * as mealsSchema from "./schema/meals";
import * as travelsSchema from "./schema/travels";
import * as notificationsSchema from "./schema/notifications";
import * as notesSchema from "./schema/notes";

export const db = drizzle(pool, {
  schema: {
    ...tasksSchema,
    ...physicalSchema,

    ...settingsSchema,
    ...goalsSchema,
    ...habitsSchema,
    ...mealsSchema,
    ...travelsSchema,
    ...notificationsSchema,
    ...notesSchema,
  },
});
