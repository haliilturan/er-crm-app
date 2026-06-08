/**
 * Migration:
 *   1. quoteId/orderId field'ı olan ama InstantDB link'i eksik kayıtları linkler.
 *   2. companyId field'ı eksik quoteItems/orderItems'a parent'tan backfill eder.
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
	type QuoteRaw     = { id: string; companyId?: string };
	type OrderRaw     = { id: string; companyId?: string };
	type QuoteItemRaw = { id: string; quoteId?: string; companyId?: string; quote?: any };
	type OrderItemRaw = { id: string; orderId?: string; companyId?: string; order?: any };

	const data = await db.query({
		quotes:     {},
		orders:     {},
		quoteItems: { quote: {} },
		orderItems: { order: {} }
	}) as {
		quotes:     QuoteRaw[];
		orders:     OrderRaw[];
		quoteItems: QuoteItemRaw[];
		orderItems: OrderItemRaw[];
	};

	const { quotes, orders, quoteItems, orderItems } = data;

	console.log(`quotes     : ${quotes.length}`);
	console.log(`orders     : ${orders.length}`);
	console.log(`quoteItems : ${quoteItems.length}`);
	console.log(`orderItems : ${orderItems.length}\n`);

	// Lookup maps
	const quoteById = new Map(quotes.map(q => [q.id, q]));
	const orderById = new Map(orders.map(o => [o.id, o]));

	// ── 2. quoteItems — link eksik olanları bul ─────────────────────────────
	// InstantDB has:one join → dizi döner; boş dizi = link yok
	const qLinkMissing = quoteItems.filter(i => {
		const linked = Array.isArray(i.quote) ? i.quote.length > 0 : !!i.quote;
		return i.quoteId && !linked;
	});

	// ── 3. quoteItems — companyId eksik olanları bul ────────────────────────
	const qCompanyMissing = quoteItems.filter(i => !i.companyId && i.quoteId);

	// ── 4. orderItems — link eksik olanları bul ─────────────────────────────
	const oLinkMissing = orderItems.filter(i => {
		const linked = Array.isArray(i.order) ? i.order.length > 0 : !!i.order;
		return i.orderId && !linked;
	});

	// ── 5. orderItems — companyId eksik olanları bul ────────────────────────
	const oCompanyMissing = orderItems.filter(i => !i.companyId && i.orderId);

	console.log(`quoteItems — link eksik    : ${qLinkMissing.length}`);
	console.log(`quoteItems — companyId eksik: ${qCompanyMissing.length}`);
	console.log(`orderItems — link eksik    : ${oLinkMissing.length}`);
	console.log(`orderItems — companyId eksik: ${oCompanyMissing.length}\n`);

	let totalOps = qLinkMissing.length + qCompanyMissing.length + oLinkMissing.length + oCompanyMissing.length;
	if (totalOps === 0) {
		console.log('✅  Tüm linkler ve companyId\'ler mevcut, işlem yapılmadı.');
		return;
	}

	// ── 6. quoteItems link ───────────────────────────────────────────────────
	if (qLinkMissing.length > 0) {
		console.log(`→ quoteItems link oluşturuluyor...`);
		for (const batch of inChunks(qLinkMissing, CHUNK)) {
			await db.transact(batch.map(i => tx.quoteItems[i.id].link({ quote: i.quoteId! })));
			console.log(`  ${batch.length} quoteItem linklendi`);
		}
	}

	// ── 7. quoteItems companyId backfill ────────────────────────────────────
	if (qCompanyMissing.length > 0) {
		console.log(`→ quoteItems companyId backfill...`);
		const toUpdate = qCompanyMissing
			.map(i => ({ i, companyId: quoteById.get(i.quoteId!)?.companyId }))
			.filter(x => x.companyId);

		for (const batch of inChunks(toUpdate, CHUNK)) {
			await db.transact(batch.map(x => tx.quoteItems[x.i.id].update({ companyId: x.companyId! })));
			console.log(`  ${batch.length} quoteItem companyId güncellendi`);
		}

		const skipped = qCompanyMissing.length - toUpdate.length;
		if (skipped > 0) console.log(`  ⚠  ${skipped} quoteItem için parent quote bulunamadı, atlandı`);
	}

	// ── 8. orderItems link ───────────────────────────────────────────────────
	if (oLinkMissing.length > 0) {
		console.log(`→ orderItems link oluşturuluyor...`);
		for (const batch of inChunks(oLinkMissing, CHUNK)) {
			await db.transact(batch.map(i => tx.orderItems[i.id].link({ order: i.orderId! })));
			console.log(`  ${batch.length} orderItem linklendi`);
		}
	}

	// ── 9. orderItems companyId backfill ────────────────────────────────────
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

	// ── 10. Özet ─────────────────────────────────────────────────────────────
	console.log('\n✅  Migration tamamlandı!');
	console.log(`  quoteItems linklendi    : ${qLinkMissing.length}`);
	console.log(`  quoteItems companyId    : ${qCompanyMissing.length}`);
	console.log(`  orderItems linklendi    : ${oLinkMissing.length}`);
	console.log(`  orderItems companyId    : ${oCompanyMissing.length}`);
}

main().catch(err => {
	console.error('\n❌  Migration başarısız:', (err as Error)?.message ?? err);
	process.exit(1);
});
