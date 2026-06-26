// Tek seferlik marka seed scripti — node scripts/seed-brands.mjs
import { init, id } from '@instantdb/admin';

const APP_ID    = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_KEY = process.env.INSTANT_ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error('INSTANT_ADMIN_KEY env değişkeni eksik.');
  console.error('Kullanım: INSTANT_ADMIN_KEY=xxx node scripts/seed-brands.mjs');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_KEY });

const BRANDS = [
  { name: 'Hilal Fırça',  slug: 'hilal-firca' },
  { name: 'Euromak',      slug: 'euromak' },
  { name: 'Mix7',         slug: 'mix7' },
  { name: 'Teksa',        slug: 'teksa' },
  { name: 'Teknocall',    slug: 'teknocall' },
  { name: 'Biosse',       slug: 'biosse' },
];

async function run() {
  const { companies = [] } = await db.query({ companies: {} });
  if (companies.length === 0) {
    console.error('Hiç şirket bulunamadı.');
    process.exit(1);
  }
  const companyId = companies[0].id;
  console.log(`Şirket: ${companies[0].name ?? companyId}`);

  const { brands: mevcutlar = [] } = await db.query({ brands: {} });
  console.log(`Mevcut marka sayısı: ${mevcutlar.length}`);

  const mevcutNames  = new Set(mevcutlar.map(b => (b.name ?? '').toLowerCase().trim()));
  const eklenecekler = BRANDS.filter(b => !mevcutNames.has((b.name ?? '').toLowerCase().trim()));

  if (eklenecekler.length === 0) {
    console.log('Tüm markalar zaten mevcut, işlem gerekmiyor.');
    return;
  }

  console.log(`Eklenecek: ${eklenecekler.length} marka`);
  const now = Date.now();
  await db.transact(
    eklenecekler.map(b =>
      db.tx.brands[id()].update({
        name:      b.name,
        slug:      b.slug,
        companyId,
        isActive:  true,
        createdAt: now,
      })
    )
  );

  console.log('Eklendi:', eklenecekler.map(b => b.name).join(', '));
}

run().catch(err => { console.error(err); process.exit(1); });
