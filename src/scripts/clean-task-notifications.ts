/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Cleanup script: notifications tablosundaki type='task_completed' kayıtlarını siler.
 * message ve diğer type'lara kesinlikle dokunmaz.
 *
 * Run:
 *   npx tsx --env-file=.env src/scripts/clean-task-notifications.ts
 */
import { init, tx } from '@instantdb/admin';

const APP_ID      = process.env.INSTANT_APP_ID;
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_KEY;

if (!APP_ID) {
	console.error('❌  INSTANT_APP_ID env var eksik.');
	process.exit(1);
}
if (!ADMIN_TOKEN) {
	console.error('❌  INSTANT_ADMIN_KEY env var eksik.');
	process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function main() {
	// ── ADIM 1: Taze sorgu — sadece task_completed kayıtları ────────────────
	const result = await db.query({ notifications: { $: { where: { type: 'task_completed' } } } } as any);
	const toDelete: any[] = result.notifications ?? [];

	console.log(`\n── SİLİNECEK ADAYLAR: ${toDelete.length} kayıt ─────────────────`);
	for (const n of toDelete) {
		console.log(`  id: ${n.id}  type: ${n.type}  createdAt: ${new Date(n.createdAt).toLocaleString('tr-TR')}`);
	}

	if (toDelete.length === 0) {
		console.log('  Silinecek kayıt yok. Çıkılıyor.');
		return;
	}

	// ── ADIM 2: Güvenlik kontrolü ────────────────────────────────────────────
	const contaminated = toDelete.filter((n) => n.type !== 'task_completed');
	if (contaminated.length > 0) {
		console.error('\n❌  GÜVENLİK HATASI: Listede task_completed dışı kayıt var!');
		for (const n of contaminated) {
			console.error(`    id: ${n.id}  type: ${n.type}`);
		}
		console.error('    Hiçbir şey silinmedi.');
		process.exit(1);
	}
	console.log('\n✅  Güvenlik kontrolü geçti — tüm adaylar type=task_completed.');

	// ── ADIM 3: Sil ──────────────────────────────────────────────────────────
	const ops = toDelete.map((n) => (tx as any).notifications[n.id].delete());
	await db.transact(ops);
	console.log(`\n🗑️   ${toDelete.length} kayıt silindi.`);

	// ── ADIM 4: Doğrulama sorgusu ────────────────────────────────────────────
	const after = await db.query({ notifications: {} } as any);
	const remaining: any[] = after.notifications ?? [];

	const afterTaskCompleted = remaining.filter((n) => n.type === 'task_completed');
	const afterMessage       = remaining.filter((n) => n.type === 'message');

	console.log('\n── SİLME SONRASI DURUM ─────────────────────────────────────');
	console.log(`  task_completed : ${afterTaskCompleted.length} (beklenen: 0)`);
	console.log(`  message        : ${afterMessage.length} (beklenen: 5)`);
	console.log(`  TOPLAM         : ${remaining.length}`);

	if (afterTaskCompleted.length !== 0) {
		console.error('\n⚠️  task_completed kayıtları hâlâ var — silme eksik kalmış olabilir.');
		process.exit(1);
	}
	console.log('\n✅  Temizlik başarılı.');
}

main().catch((err) => {
	console.error('Hata:', err);
	process.exit(1);
});
