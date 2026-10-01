import type { Pool } from "pg";
import type { PushDevice, PushStore, Reminder, SubscriptionInput } from "./types";
type DeviceRow = { id: string; endpoint: string; p256dh: string; auth: string; vapid_public_key: string };
const device = (r: DeviceRow): PushDevice => ({ id: r.id, endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth }, vapidPublicKey: r.vapid_public_key });
const params = (id: string, r: Reminder, lead: number) => [id, r.key, r.startsAt.toISOString(), lead];
export class PgPushStore implements PushStore {
  constructor(private readonly pool: Pool) {}
  async listDevices(publicKey?: string) {
    const { rows } = await this.pool.query<DeviceRow>("SELECT * FROM push_subscriptions WHERE ($1::text IS NULL OR vapid_public_key = $1) ORDER BY created_at", [publicKey ?? null]);
    return rows.map(device);
  }
  async upsertDevice(s: SubscriptionInput, publicKey: string) {
    await this.pool.query(`INSERT INTO push_subscriptions(endpoint,p256dh,auth,vapid_public_key) VALUES($1,$2,$3,$4)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,vapid_public_key=EXCLUDED.vapid_public_key,updated_at=now()`, [s.endpoint, s.keys.p256dh, s.keys.auth, publicKey]);
  }
  async findDevice(endpoint: string) {
    const { rows } = await this.pool.query<DeviceRow>("SELECT * FROM push_subscriptions WHERE endpoint=$1", [endpoint]);
    return rows[0] ? device(rows[0]) : null;
  }
  async removeEndpoint(endpoint: string) { await this.pool.query("DELETE FROM push_subscriptions WHERE endpoint=$1", [endpoint]); }
  async removeDevice(id: string) { await this.pool.query("DELETE FROM push_subscriptions WHERE id=$1", [id]); }
  async claim(id: string, r: Reminder, lead: number) {
    const result = await this.pool.query(`INSERT INTO push_deliveries(subscription_id,reminder_key,starts_at,lead) VALUES($1,$2,$3,$4)
      ON CONFLICT(subscription_id,reminder_key,starts_at,lead) DO UPDATE SET claimed_at=now()
      WHERE push_deliveries.sent_at IS NULL AND push_deliveries.claimed_at < now() - interval '30 seconds'
      RETURNING subscription_id`, params(id, r, lead));
    return (result.rowCount ?? 0) > 0;
  }
  async retryLead(id: string, r: Reminder) {
    const { rows } = await this.pool.query<{ lead: number }>(`SELECT lead FROM push_deliveries
      WHERE subscription_id=$1 AND reminder_key=$2 AND starts_at=$3 AND sent_at IS NULL
      AND claimed_at < now() - interval '30 seconds' ORDER BY lead DESC LIMIT 1`, [id, r.key, r.startsAt.toISOString()]);
    return rows[0]?.lead ?? null;
  }
  async complete(id: string, r: Reminder, lead: number) { await this.pool.query("UPDATE push_deliveries SET sent_at=now() WHERE subscription_id=$1 AND reminder_key=$2 AND starts_at=$3 AND lead=$4", params(id, r, lead)); }
  async release(id: string, r: Reminder, lead: number) { await this.pool.query("DELETE FROM push_deliveries WHERE subscription_id=$1 AND reminder_key=$2 AND starts_at=$3 AND lead=$4 AND sent_at IS NULL", params(id, r, lead)); }
  async prune() { await this.pool.query("DELETE FROM push_deliveries WHERE starts_at < now() - interval '7 days'"); }
}
