import { z } from "zod";

export const travelRegionSchema = z.enum(["srbija", "okolne_drzave", "evropa", "svet"]);
export const travelStatusSchema = z.enum(["idea", "planning", "booked", "done"]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .optional()
  .nullable();

export const createTravelSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(500),
  region: travelRegionSchema.optional(),
  status: travelStatusSchema.optional(),
  startDate: isoDate,
  endDate: isoDate,
  people: z.string().max(1000).optional().nullable(),
  notes: z.string().max(10_000).optional().nullable(),
});

export const updateTravelSchema = createTravelSchema.partial().extend({
  id: z.uuid(),
});

export type CreateTravelInput = z.infer<typeof createTravelSchema>;
export type UpdateTravelInput = z.infer<typeof updateTravelSchema>;
