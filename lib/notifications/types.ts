export type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushDevice = SubscriptionInput & { id: string; vapidPublicKey: string };
export type Reminder = { key: string; title: string; startsAt: Date; type: "task" | "due" | "google"; url: string };
export type PushPayload = { title: string; body: string; url: string; tag: string };
export type PushSender = (device: PushDevice, payload: PushPayload, ttl?: number) => Promise<void>;
export interface PushStore {
  listDevices(publicKey?: string): Promise<PushDevice[]>;
  upsertDevice(subscription: SubscriptionInput, publicKey: string): Promise<void>;
  findDevice(endpoint: string): Promise<PushDevice | null>;
  removeEndpoint(endpoint: string): Promise<void>;
  removeDevice(id: string): Promise<void>;
  claim(id: string, reminder: Reminder, lead: number): Promise<boolean>;
  retryLead(id: string, reminder: Reminder): Promise<number | null>;
  complete(id: string, reminder: Reminder, lead: number): Promise<void>;
  release(id: string, reminder: Reminder, lead: number): Promise<void>;
  prune(): Promise<void>;
}
