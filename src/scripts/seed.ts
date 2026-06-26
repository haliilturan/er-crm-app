/**
 * Seed script — development only.
 * Creates 5 companies and links hilalfirca@gmail.com as admin to each.
 * Idempotent: skips records that already exist (checks by slug / email).
 *
 * Run:
 *   INSTANT_ADMIN_TOKEN=<token> npx tsx src/scripts/seed.ts
 */
import { init, id, tx } from '@instantdb/admin';

const APP_ID      = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;
const TARGET_EMAIL = 'hilalfirca@gmail.com';
const API_BASE    = 'https://api.instantdb.com';

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
	{ name: 'Teknocall',   slug: 'teknocall'   },
	{ name: 'Teksa',       slug: 'teksa'       },
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

	// ── 2. Mevcut verileri sorgula (idempotency) ───────────────────────────
	console.log('→ Mevcut veriler kontrol ediliyor...');

	type Company     = { id: string; slug: string; name: string };
	type UserProfile = { id: string; email: string };
	type UserCompany = { id: string; companyId: string };

	const existing = await db.query({
		companies:    {},
		userProfiles: {},
		userCompanies: { $: { where: { userId } } },
	}) as {
		companies:    Company[];
		userProfiles: UserProfile[];
		userCompanies: UserCompany[];
	};

	const existingNames      = new Set(existing.companies.map(c => c.name.toLowerCase().trim()));
	const existingProfile    = existing.userProfiles.find(p => p.email === TARGET_EMAIL);
	const existingCompanyIds = new Set(existing.userCompanies.map(uc => uc.companyId));

	console.log(`  Mevcut şirket isimleri  : [${[...existingNames].join(', ')}]`);
	console.log(`  Mevcut profil           : ${existingProfile ? existingProfile.id : 'yok'}`);
	console.log(`  Mevcut üyelik sayısı    : ${existingCompanyIds.size}\n`);

	// ── 3. Eksik şirket ve üyelikleri hesapla ─────────────────────────────
	const now = Date.now();

	const toCreate = COMPANIES
		.filter(c => !existingNames.has(c.name.toLowerCase().trim()))
		.map(c => ({ ...c, companyId: id(), ucId: id() }));

	const profileId   = existingProfile?.id ?? id();
	const needsProfile = !existingProfile;

	if (toCreate.length === 0 && !needsProfile) {
		console.log('✅  Tüm veriler zaten mevcut, işlem yapılmadı.');
		COMPANIES.forEach(c => console.log(`  ⚠  ${c.name} (mevcut)`));
		return;
	}

	console.log(`→ Yazılacak şirket sayısı : ${toCreate.length}`);
	console.log(`→ Profil                  : ${needsProfile ? 'oluşturulacak' : 'mevcut (atlanıyor)'}\n`);

	// ── 4. Transaction ────────────────────────────────────────────────────
	console.log('→ Veriler yazılıyor...');

	const ops = [
		// Yeni şirketler
		...toCreate.map(c =>
			tx.companies[c.companyId].update({
				name:      c.name,
				slug:      c.slug,
				isActive:  true,
				createdAt: now,
			})
		),

		// userProfile (gerekirse)
		...(needsProfile ? [
			tx.userProfiles[profileId].update({
				email:     TARGET_EMAIL,
				fullName:  'Hilal',
				createdAt: now,
				updatedAt: now,
			}),
			tx.userProfiles[profileId].link({ user: userId }),
		] : []),

		// Her yeni şirket için üyelik + linkler
		...toCreate.flatMap(c => [
			tx.userCompanies[c.ucId].update({
				userId,
				companyId: c.companyId,
				role:      'admin',
				joinedAt:  now,
			}),
			tx.userCompanies[c.ucId].link({ profile: profileId }),
			tx.userCompanies[c.ucId].link({ company: c.companyId }),
		]),
	];

	await db.transact(ops);

	// ── 5. Özet ────────────────────────────────────────────────────────────
	console.log('\n✅  Seed tamamlandı!\n');

	if (toCreate.length > 0) {
		console.log('Oluşturulan şirketler:');
		toCreate.forEach(c => console.log(`  ✓  ${c.name}  (${c.companyId})`));
	}

	const skipped = COMPANIES.filter(c => existingNames.has(c.name.toLowerCase().trim()));
	if (skipped.length > 0) {
		console.log('\nAtlanan şirketler (zaten mevcut):');
		skipped.forEach(c => console.log(`  ⚠  ${c.name}`));
	}

	console.log(`\nuserProfile  : ${profileId}${needsProfile ? ' (yeni)' : ' (mevcut)'}`);
	console.log(`userCompanies: ${toCreate.map(c => c.ucId).join(', ') || 'yok (hepsi mevcut)'}`);
	console.log(`\n${TARGET_EMAIL} → 5 şirkette admin olarak tanımlandı.`);
}

main().catch(err => {
	console.error('\n❌  Seed başarısız:', (err as Error)?.message ?? err);
	process.exit(1);
});
