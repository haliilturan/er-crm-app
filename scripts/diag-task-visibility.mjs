// ─────────────────────────────────────────────────────────────────────────────
// SALT-OKUNUR TEŞHİS (v2): Görevler sekmesi görünürlük hatası
// Çalıştır: node --env-file=.env.local scripts/diag-task-visibility.mjs
// GÜVENLİK: Yalnızca db.query. transact/write ASLA yok.
// ─────────────────────────────────────────────────────────────────────────────
import { init } from '@instantdb/admin';

const VIEWER_EMAIL = 'hilalfirca@gmail.com';        // oturumdaki kullanıcı
const ASSIGNEE_EMAIL = 'turanhllinternational@gmail.com';
const TARGET_TASK_TITLE = 'görev başlığı';

const APP_ID = process.env.INSTANT_APP_ID;
const ADMIN_KEY = process.env.INSTANT_ADMIN_KEY;
if (!APP_ID || !ADMIN_KEY) { console.error('env eksik'); process.exit(1); }
const db = init({ appId: APP_ID, adminToken: ADMIN_KEY });
const mask = (s) => (s == null ? String(s) : '…' + String(s).slice(-6));

async function profileOf(email) {
	const { userProfiles = [] } = await db.query({ userProfiles: { $: { where: { email } } } });
	return userProfiles[0] ?? null;
}

async function main() {
	const viewer = await profileOf(VIEWER_EMAIL);
	const assignee = await profileOf(ASSIGNEE_EMAIL);
	console.log('viewer  ', VIEWER_EMAIL, 'profile=', mask(viewer?.id), 'userId=', mask(viewer?.userId));
	console.log('assignee', ASSIGNEE_EMAIL, 'profile=', mask(assignee?.id), 'userId=', mask(assignee?.userId));

	// Tüm userCompanies + company linki
	const { userCompanies = [] } = await db.query({ userCompanies: { $: {}, company: {}, profile: {} } });

	const viewerUC = userCompanies.filter((uc) => uc.userId === viewer?.userId || uc.profile?.id === viewer?.id);
	console.log('\n== VIEWER (hilalfirca) üyelikleri ==');
	for (const uc of viewerUC)
		console.log(`  companyId=${mask(uc.companyId)} role=${uc.role} company=${JSON.stringify(uc.company?.name ?? null)} companyLink=${!!uc.company}`);
	// authStore.companies mantığı: yalnızca company linki ÇÖZÜLEN üyelikler sayılır
	const viewerCompanyIds = viewerUC.filter((uc) => !!uc.company).map((uc) => uc.companyId);
	console.log('  → authStore.companyIds (company linki olanlar):', viewerCompanyIds.map(mask));

	// Görev
	const { tasks = [] } = await db.query({ tasks: { $: { where: { title: TARGET_TASK_TITLE } } } });
	const t = tasks[0];
	console.log('\n== GÖREV ==');
	console.log(`  companyId=${mask(t.companyId)} assignedTo=${mask(t.assignedTo)} status=${t.status} completedAt=${t.completedAt ?? 'YOK'}`);
	console.log(`  createdAt=${new Date(t.createdAt).toISOString()} dueAt=${t.dueAt ? new Date(t.dueAt).toISOString() : null}`);

	console.log('\n== SONUÇ ==');
	console.log('  Görev companyId, viewer.companyIds içinde mi? →', viewerCompanyIds.includes(t.companyId) ? 'EVET' : 'HAYIR');
	console.log('  assignedTo === assignee.userId ?', t.assignedTo === assignee?.userId);
	console.log('  assignedTo === assignee.profile.id ?', t.assignedTo === assignee?.id);

	// Ekip listesinde assignee görünür mü? (viewer cIds içindeki bir şirkette + profil linki)
	const assigneeInTeam = userCompanies.some(
		(uc) => viewerCompanyIds.includes(uc.companyId) && (uc.userId === assignee?.userId || uc.profile?.id === assignee?.id) && !!uc.profile
	);
	console.log('  Assignee, viewerın Ekip listesinde çıkar mı? →', assigneeInTeam ? 'EVET' : 'HAYIR');
}
main().catch((e) => { console.error('HATA:', e?.message ?? e); process.exit(1); });
