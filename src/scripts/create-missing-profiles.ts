/**
 * Migration: $users içinde userProfiles'ı olmayan kullanıcılar için profil oluşturur.
 *
 * Admin API'de has:'one' link'leri dizi döndürür:
 *   user.profile === []          → profil yok
 *   user.profile === [{...}]     → profil var
 *
 * Run:
 *   $env:INSTANT_ADMIN_TOKEN="<token>"; npx tsx src/scripts/create-missing-profiles.ts
 */
import { init, id, tx } from '@instantdb/admin';

const APP_ID      = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN!;

if (!ADMIN_TOKEN) {
	console.error('❌  INSTANT_ADMIN_TOKEN env var eksik.');
	process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function run() {
	// 1. Tüm $users'ı admin SDK ile çek
	console.log('📋  $users çekiliyor...');
	const usersResult = await db.query({ $users: {} } as any);
	const usersData   = usersResult.data ?? usersResult as any;
	// Admin SDK bazı versiyonlarda key'i '$users' yerine 'users' olarak döndürebilir
	const users: Array<{ id: string; email: string }> =
		usersData['$users'] ?? usersData['users'] ?? [];
	console.log(`   ${users.length} kullanıcı bulundu`);

	// 2. Tüm mevcut userProfiles'ı çek
	console.log('📋  userProfiles çekiliyor...');
	const profileResult = await db.query({ userProfiles: {} });
	const profileData   = profileResult.data ?? profileResult as any;
	const profiles      = profileData['userProfiles'] ?? [];
	console.log(`   ${profiles.length} mevcut profil bulundu`);

	// 3. Email → userId map (users listesinden)
	const emailToUserId = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));

	// 4. Profili hiç olmayan kullanıcılar
	const profileEmails = new Set(profiles.map((p: any) => (p.email as string).toLowerCase()));
	const missing       = users.filter((u) => !profileEmails.has(u.email.toLowerCase()));
	console.log(`   ${missing.length} profil eksik (yeni oluşturulacak)`);

	// 5. Profili var ama userId field'ı eksik olanlar
	const noUserId = profiles.filter((p: any) => !p.userId);
	console.log(`   ${noUserId.length} profilde userId field'ı eksik (backfill yapılacak)`);

	if (missing.length === 0 && noUserId.length === 0) {
		console.log('✅  Tüm profiller güncel. İşlem yok.');
		return;
	}

	const txOps: any[] = [];

	// 6. Yeni profil oluştur
	if (missing.length > 0) {
		console.log('\n🔨  Yeni profiller oluşturuluyor...');
		for (const user of missing) {
			const profileId = id();
			txOps.push(
				tx.userProfiles[profileId]
					.update({
						email:     user.email,
						fullName:  user.email.split('@')[0],
						userId:    user.id,
						createdAt: Date.now()
					})
					.link({ user: user.id })
			);
		}
	}

	// 7. Mevcut profilllere userId backfill
	if (noUserId.length > 0) {
		console.log('🔨  userId backfill yapılıyor...');
		for (const profile of noUserId) {
			const uid = emailToUserId.get((profile.email as string).toLowerCase());
			if (!uid) {
				console.warn(`   ⚠️  ${profile.email} için $users kaydı bulunamadı, skip.`);
				continue;
			}
			txOps.push(tx.userProfiles[profile.id].update({ userId: uid }));
		}
	}

	if (txOps.length === 0) {
		console.log('✅  İşlem yok.');
		return;
	}

	await db.transact(txOps);

	console.log(`\n✅  Tamamlandı:`);
	if (missing.length > 0) {
		console.log(`   ${missing.length} yeni profil oluşturuldu:`);
		for (const u of missing) console.log(`     ✓ ${u.email}`);
	}
	if (noUserId.length > 0) {
		console.log(`   ${noUserId.length} profile userId eklendi:`);
		for (const p of noUserId) console.log(`     ✓ ${p.email}`);
	}
}

run().catch((err) => {
	console.error('❌  Script hatası:', err);
	process.exit(1);
});
