// Tek seferlik banka seed scripti — node scripts/seed-banks.mjs
import { init, id } from '@instantdb/admin';

const APP_ID    = '752c66ad-ae87-4feb-9042-09c4fe9781fa';
const ADMIN_KEY = process.env.INSTANT_ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error('INSTANT_ADMIN_KEY env değişkeni eksik.');
  console.error('Kullanım: INSTANT_ADMIN_KEY=xxx node scripts/seed-banks.mjs');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_KEY });

const BANKALAR = [
  'Ziraat-TL - EUROMAK END.TEM MAK.SAN.TİC.A.Ş.',
  'Ziraat-USD - EUROMAK END.TEM MAK.SAN.TİC.A.Ş.',
  'Ziraat-EURO - EUROMAK END.TEM MAK.SAN.TİC.A.Ş.',
  'Ziraat-HF - HİLAL FIRÇA A.Ş.',
  'TEB BANKASI-TL - EUROMAK ENDÜSTRİYEL TEM MAK SAN TİC A.Ş.',
  'TEB BANKASI-USD - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'TEB BANKASI-EURO - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'QNB FİNANS-TL - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'QNB FİNANS-EURO - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'QNB FİNANS-USD - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'KUVEYT TÜRK-TL - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'KUVEYT TÜRK-USD - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'KUVEYT TÜRK-EURO - EUROMAK END TEM MAK SAN TİC A.Ş.',
  'İŞBANKASI -TL - HİLAL FIRÇA A.Ş.',
  'Ziraat -TL - MİX KİMYEVİ ÜRÜNLER SAN TİC A.Ş.',
  'KUVEYTTÜRK -TL - HİLAL FIRÇA A.Ş.',
  'ZİRAAT -USD - HİLAL FIRÇA A.Ş.',
  'ZİRAAT -EURO - HİLAL FIRÇA A.Ş.',
  'Teb -TL - MİX KİMYEVİ ÜRÜNLER SANAYİ TİC A.Ş.',
  'TÜRK EKONOMİ BANKASI -TL - HİLAL FIRÇA A.Ş.',
  'ZİRAAT -EURO - MİX KİMYEVİ ÜRÜN.SAN.TİC.A.Ş.',
  'ZİRAAT -USD - MİX KİMYEVİ ÜRÜN.SAN.TİC.A.Ş.',
  'QNB FİNANS -TL - HİLAL FIRÇA A.Ş.',
  'QNB FİNANS -USD - HİLAL FIRÇA A.Ş.',
  'QNB FİNANS -EURO - HİLAL FIRÇA A.Ş.',
  'ZİRAAT BANKASI - TEKNOCALL BİLİŞİM SAN. VE TİC. LTD. ŞTİ.',
  'ZİRAAT BANKASI - TEKNOCALL-ZİRAAT-EURO',
  'ZİRAAT BANKASI - TEKNOCALL-ZİRAAT-TL',
  'WESTERN UNION - EURO',
  'WESTERN UNION - DOLAR',
  'TÜRKİYE EMLAK KATILIM BANKASI - TÜRKİYE EMLAK KATILIM BANKASI-Ruble-HİLAL FIRÇA A.Ş.',
];

async function run() {
  // Mevcut kayıtları çek
  const { bankAccounts: mevcutlar = [] } = await db.query({ bankAccounts: {} });
  console.log(`Mevcut kayıt sayısı: ${mevcutlar.length}`);

  const hedefIsimler = new Set(BANKALAR);
  const mevcutIsimler = new Set(mevcutlar.map(b => b.name));

  const silinecekler = mevcutlar.filter(b => !hedefIsimler.has(b.name));
  const eklenecekler = BANKALAR.filter(name => !mevcutIsimler.has(name));

  if (silinecekler.length === 0 && eklenecekler.length === 0) {
    console.log('Zaten güncel, işlem gerekmiyor.');
    return;
  }

  console.log(`Silinecek: ${silinecekler.length}, Eklenecek: ${eklenecekler.length}`);

  const now = Date.now();
  await db.transact([
    ...silinecekler.map(b => db.tx.bankAccounts[b.id].delete()),
    ...eklenecekler.map(name =>
      db.tx.bankAccounts[id()].update({ name, isActive: true, createdAt: now })
    ),
  ]);

  console.log('Tamamlandı.');
}

run().catch(err => { console.error(err); process.exit(1); });
