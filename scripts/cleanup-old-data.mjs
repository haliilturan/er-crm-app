// ONE-TIME cleanup script — run once after the quotes→orders schema migration.
// Deletes:
//   • orders with null assignedTo or null language (malformed draft records)
//   • all remaining records in legacy namespaces: quotes, quoteItems, quoteStatusHistory
//
// Usage: INSTANT_ADMIN_KEY=xxx node scripts/cleanup-old-data.mjs

import { init } from '@instantdb/admin';

const APP_ID    = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_KEY = process.env.INSTANT_ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error('INSTANT_ADMIN_KEY env değişkeni eksik.');
  console.error('Kullanım: INSTANT_ADMIN_KEY=xxx node scripts/cleanup-old-data.mjs');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_KEY });

// ─── Helper: query a namespace, return [] on "namespace not found" errors ─────
async function safeQuery(namespace) {
  try {
    const result = await db.query({ [namespace]: {} });
    return result[namespace] ?? [];
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (msg.includes('not found') || msg.includes('unknown') || msg.includes('invalid')) {
      console.log(`  [${namespace}] Namespace bulunamadı, atlanıyor.`);
      return [];
    }
    throw err;
  }
}

// ─── Helper: delete in batches to avoid oversized transactions ────────────────
async function deleteBatch(namespace, records) {
  if (records.length === 0) return;
  const BATCH = 200;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    await db.transact(chunk.map(r => db.tx[namespace][r.id].delete()));
    console.log(`  [${namespace}] ${Math.min(i + BATCH, records.length)}/${records.length} silindi...`);
  }
}

async function run() {
  console.log('=== Cleanup başlatılıyor ===\n');

  // ── 1. Orders: null assignedTo veya null language ──────────────────────────
  console.log('1. Hatalı orders sorgulanıyor (assignedTo veya language eksik)...');
  const allOrders = await safeQuery('orders');
  const badOrders = allOrders.filter(o => !o.assignedTo || !o.language);
  console.log(`   Toplam orders: ${allOrders.length}, silinecek: ${badOrders.length}`);
  await deleteBatch('orders', badOrders);

  // ── 2. Legacy namespace: quotes ────────────────────────────────────────────
  console.log('\n2. Legacy "quotes" namespace sorgulanıyor...');
  const quotes = await safeQuery('quotes');
  console.log(`   Bulunan kayıt: ${quotes.length}`);
  await deleteBatch('quotes', quotes);

  // ── 3. Legacy namespace: quoteItems ───────────────────────────────────────
  console.log('\n3. Legacy "quoteItems" namespace sorgulanıyor...');
  const quoteItems = await safeQuery('quoteItems');
  console.log(`   Bulunan kayıt: ${quoteItems.length}`);
  await deleteBatch('quoteItems', quoteItems);

  // ── 4. Legacy namespace: quoteStatusHistory ────────────────────────────────
  console.log('\n4. Legacy "quoteStatusHistory" namespace sorgulanıyor...');
  const quoteHistory = await safeQuery('quoteStatusHistory');
  console.log(`   Bulunan kayıt: ${quoteHistory.length}`);
  await deleteBatch('quoteStatusHistory', quoteHistory);

  // ── Özet ───────────────────────────────────────────────────────────────────
  console.log('\n=== Özet ===');
  console.log(`  orders silindi       : ${badOrders.length}`);
  console.log(`  quotes silindi       : ${quotes.length}`);
  console.log(`  quoteItems silindi   : ${quoteItems.length}`);
  console.log(`  quoteStatusHistory   : ${quoteHistory.length}`);
  console.log('\nTamamlandı.');
}

run().catch(err => { console.error('Hata:', err); process.exit(1); });
