/** Stable Eisenhower quadrants. Their IDs are seeded by migration 0005. */
export const TASK_PRIORITIES = [
  { id: "e1500000-0000-4000-8000-000000000001", name: "Q1 - hitno i bitno", color: "#ef4444", rank: 1 },
  { id: "e1500000-0000-4000-8000-000000000002", name: "Q2 - nije hitno, jeste bitno", color: "#22c55e", rank: 2 },
  { id: "e1500000-0000-4000-8000-000000000003", name: "Q3 - jeste hitno, nije bitno", color: "#f59e0b", rank: 3 },
  { id: "e1500000-0000-4000-8000-000000000004", name: "Q4 - nije hitno, nije bitno", color: "#64748b", rank: 4 },
] as const;
