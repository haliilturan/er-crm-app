/**
 * Seed script — development only.
 * Creates 3 companies and links hilalfirca@gmail.com as admin to each.
 *
 * Run:
 *   INSTANT_ADMIN_TOKEN=<token> npx tsx src/scripts/seed.ts
 */
import { init, id, tx } from '@instantdb/admin';

const APP_ID     = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;
const TARGET_EMAIL = 'hilalfirca@gmail.com';
const API_BASE   = 'https://api.instantdb.com';

if (!ADMIN_TOKEN) {
	console.error('❌  INSTANT_ADMIN_TOKEN env var eksik.');
	process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// ─── REST API helpers ─────────────────────────────────────────────────────────

async function apiGet(path: string) {
	const r = await fetch(`${API_BASE}${path}`, {
		headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
	});
	const data = (await r.json()) as Record<string, unknown>;
	if (!r.ok) throw new Error(JSON.stringify(data, null, 2));
	return data;
}

// ─── Company definitions ──────────────────────────────────────────────────────

const COMPANIES = [
	{ name: 'Hilal Fırça', slug: 'hilal-firca' },
	{ name: 'Euromak',     slug: 'euromak'     },
	{ name: 'Mix7',        slug: 'mix7'        },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log('🌱  Seed başlıyor...\n');

	// ── 1. Kullanıcıyı bul ──────────────────────────────────────────────────
	console.log(`→ Kullanıcı aranıyor: ${TARGET_EMAIL}`);
	const userRes = await apiGet(
		`/admin/users?app_id=${APP_ID}&email=${encodeURIComponent(TARGET_EMAIL)}`
	);
	const userId = (userRes.user as { id: string } | undefined)?.id;
	if (!userId) {
		throw new Error(
			`Kullanıcı bulunamadı: ${TARGET_EMAIL}\n` +
			'Kullanıcının en az bir kez magic-link ile giriş yapmış olması gerekiyor.'
		);
	}
	console.log(`✓  Kullanıcı: ${userId}\n`);

	// ── 2. ID'leri üret ────────────────────────────────────────────────────
	const now = Date.now();

	const companies = COMPANIES.map(c => ({
		...c,
		companyId: id(),
		ucId:      id(),
	}));
	const profileId = id();

	// ── 3. Transaction ────────────────────────────────────────────────────
	console.log('→ Veriler yazılıyor...');

	await db.transact([
		// Şirketler
		...companies.map(c =>
			tx.companies[c.companyId].update({
				name:      c.name,
				slug:      c.slug,
				isActive:  true,
				createdAt: now,
			})
		),

		// userProfile + $users linkini kur
		tx.userProfiles[profileId].update({
			email:     TARGET_EMAIL,
			fullName:  'Hilal',
			createdAt: now,
			updatedAt: now,
		}),
		tx.userProfiles[profileId].link({ user: userId }),

		// Her şirket için üyelik kaydı ve linkler
		...companies.flatMap(c => [
			tx.userCompanies[c.ucId].update({
				userId,
				companyId: c.companyId,
				role:      'admin',
				joinedAt:  now,
			}),
			tx.userCompanies[c.ucId].link({ profile: profileId }),
			tx.userCompanies[c.ucId].link({ company: c.companyId }),
		]),
	]);

	// ── 4. Özet ────────────────────────────────────────────────────────────
	console.log('\n✅  Seed tamamlandı!\n');
	console.log('Oluşturulan şirketler:');
	companies.forEach(c => console.log(`  ✓  ${c.name}  (${c.companyId})`));
	console.log(`\nuserProfile  : ${profileId}`);
	console.log(`userCompanies: ${companies.map(c => c.ucId).join(', ')}`);
	console.log(`\n${TARGET_EMAIL} → 3 şirkette admin olarak tanımlandı.`);
}

main().catch(err => {
	console.error('\n❌  Seed başarısız:', (err as Error)?.message ?? err);
	process.exit(1);
});
