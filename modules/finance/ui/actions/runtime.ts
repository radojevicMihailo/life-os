import "server-only";

import { randomUUID } from "node:crypto";

import type { ApplicationDependencies } from "../../application/ports";
import { unitOfWork } from "../../db/unit-of-work";

export function mutationDependencies(): ApplicationDependencies {
  return {
    unitOfWork,
    clock: { now: () => new Date() },
    ids: { nextId: (kind) => `${kind}-${randomUUID()}` },
  };
}
