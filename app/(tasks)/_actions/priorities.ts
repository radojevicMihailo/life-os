"use server";
import type { CreatePriorityInput, UpdatePriorityInput } from "@/lib/validation/priorities";

// Keep old action entry points safe for tabs opened before the deployment.
const message = "Prioriteti su fiksni kvadranti Q1–Q4 i ne mogu se menjati.";
export async function createPriority(_input: CreatePriorityInput): Promise<{ ok: false; error: string }> {
  void _input;
  return { ok: false, error: message };
}
export async function updatePriority(_input: UpdatePriorityInput): Promise<{ ok: false; error: string }> {
  void _input;
  return { ok: false, error: message };
}
export async function deletePriority(_id: string): Promise<{ ok: false; error: string }> {
  void _id;
  return { ok: false, error: message };
}
