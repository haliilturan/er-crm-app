/**
 * Migration:
 *   1. orderId field'ı olan ama InstantDB link'i eksik orderItems kayıtlarını linkler.
 *   2. companyId field'ı eksik orderItems'a parent order'dan backfill eder.
 *
 * Run:
 *   INSTANT_ADMIN_TOKEN=<token> npx tsx src/scripts/migrate-links.ts
 */
import { init, tx } from '@instantdb/admin';

const APP_ID      = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;

if (!ADMIN_TOKEN) {
	console.error('❌  INSTANT_ADMIN_TOKEN env var eksik.');
	process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const CHUNK = 100;

function inChunks<T>(arr: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

async function main() {
	console.log('🔗  Link + companyId migration başlıyor...\n');

	// ── 1. Tüm kayıtları çek ────────────────────────────────────────────────
	type OrderRaw     = { id: string; companyId?: string };
	type OrderItemRaw = { id: string; orderId?: string; companyId?: string; order?: any };

	const data = await db.query({
		orders:     {},
		orderItems: { order: {} }
	}) as {
		orders:     OrderRaw[];
		orderItems: OrderItemRaw[];
	};

	const { orders, orderItems } = data;

	console.log(`orders     : ${orders.length}`);
	console.log(`orderItems : ${orderItems.length}\n`);

	// Lookup maps
	const orderById = new Map(orders.map(o => [o.id, o]));

	// ── 2. orderItems — link eksik olanları bul ─────────────────────────────
	const oLinkMissing = orderItems.filter(i => {
		const linked = Array.isArray(i.order) ? i.order.length > 0 : !!i.order;
		return i.orderId && !linked;
	});

	// ── 3. orderItems — companyId eksik olanları bul ────────────────────────
	const oCompanyMissing = orderItems.filter(i => !i.companyId && i.orderId);

	console.log(`orderItems — link eksik    : ${oLinkMissing.length}`);
	console.log(`orderItems — companyId eksik: ${oCompanyMissing.length}\n`);

	if (oLinkMissing.length + oCompanyMissing.length === 0) {
		console.log('✅  Tüm linkler ve companyId\'ler mevcut, işlem yapılmadı.');
		return;
	}

	// ── 4. orderItems link ───────────────────────────────────────────────────
	if (oLinkMissing.length > 0) {
		console.log(`→ orderItems link oluşturuluyor...`);
		for (const batch of inChunks(oLinkMissing, CHUNK)) {
			await db.transact(batch.map(i => tx.orderItems[i.id].link({ order: i.orderId! })));
			console.log(`  ${batch.length} orderItem linklendi`);
		}
	}

	// ── 5. orderItems companyId backfill ────────────────────────────────────
	if (oCompanyMissing.length > 0) {
		console.log(`→ orderItems companyId backfill...`);
		const toUpdate = oCompanyMissing
			.map(i => ({ i, companyId: orderById.get(i.orderId!)?.companyId }))
			.filter(x => x.companyId);

		for (const batch of inChunks(toUpdate, CHUNK)) {
			await db.transact(batch.map(x => tx.orderItems[x.i.id].update({ companyId: x.companyId! })));
			console.log(`  ${batch.length} orderItem companyId güncellendi`);
		}

		const skipped = oCompanyMissing.length - toUpdate.length;
		if (skipped > 0) console.log(`  ⚠  ${skipped} orderItem için parent order bulunamadı, atlandı`);
	}

	// ── 6. Özet ─────────────────────────────────────────────────────────────
	console.log('\n✅  Migration tamamlandı!');
	console.log(`  orderItems linklendi    : ${oLinkMissing.length}`);
	console.log(`  orderItems companyId    : ${oCompanyMissing.length}`);
}

main().catch(err => {
	console.error('\n❌  Migration başarısız:', (err as Error)?.message ?? err);
	process.exit(1);
});
