import { getDb } from '../database/connection.ts';

export interface StoreSettings {
  cod_enabled: boolean;
  free_shipping_threshold: number;
  shipping_fee: number;
  low_stock_threshold: number;
  demo_payment_enabled: boolean;
}

const DEFAULTS: StoreSettings = {
  cod_enabled: true,
  free_shipping_threshold: 150,
  shipping_fee: 12,
  low_stock_threshold: 5,
  demo_payment_enabled: true,
};

export function getStoreSettings(): StoreSettings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM store_settings').all() as Array<{
    key: string;
    value: string;
  }>;

  const merged: StoreSettings = { ...DEFAULTS };
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value);
      if (row.key === 'cod_enabled' && typeof parsed === 'boolean') {
        merged.cod_enabled = parsed;
      } else if (row.key === 'free_shipping_threshold' && typeof parsed === 'number') {
        merged.free_shipping_threshold = parsed;
      } else if (row.key === 'shipping_fee' && typeof parsed === 'number') {
        merged.shipping_fee = parsed;
      } else if (row.key === 'low_stock_threshold' && typeof parsed === 'number') {
        merged.low_stock_threshold = parsed;
      } else if (row.key === 'demo_payment_enabled' && typeof parsed === 'boolean') {
        merged.demo_payment_enabled = parsed;
      }
    } catch {
      // ignore malformed value
    }
  }
  return merged;
}

export function updateStoreSettings(patch: Partial<StoreSettings>): StoreSettings {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO store_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );

  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) {
        upsert.run(k, JSON.stringify(v));
      }
    }
  });
  tx();
  return getStoreSettings();
}
