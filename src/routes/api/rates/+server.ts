import { json } from '@sveltejs/kit';
import { INSTANT_APP_ID, INSTANT_ADMIN_KEY } from '$env/static/private';
import { init, id } from '@instantdb/admin';

const QNB_URL = 'https://www.qnb.com.tr/api/LoanCalculators/GetBistEndexDataResponse';
const SUPPORTED = ['USD', 'EUR', 'GBP'];

export async function POST() {
	try {
		const res = await fetch(QNB_URL, {
			headers: { 'User-Agent': 'Mozilla/5.0' }
		});

		if (!res.ok) throw new Error(`QNB API error: ${res.status}`);

		const data = await res.json();
		const kurlar = data.KurTipi as Array<{
			KurAdi: string;
			Artis: string;
			Degisim: string;
			Deger: string;
			Alis?: string;
			Satis?: string;
		}>;

		const filtered = kurlar.filter(k => SUPPORTED.includes(k.KurAdi));
		if (filtered.length === 0) throw new Error('No supported currencies found');

		const db = init({ appId: INSTANT_APP_ID, adminToken: INSTANT_ADMIN_KEY });
		const now = Date.now();

		const ops = filtered.map(k => ({
			key: k.KurAdi,
			buy: parseFloat((k.Alis ?? '0').replace('.', '').replace(',', '.')),
			sell: parseFloat((k.Satis ?? '0').replace('.', '').replace(',', '.')),
			value: parseFloat(k.Deger.replace('.', '').replace(',', '.')),
			change: k.Degisim,
			direction: parseInt(k.Artis),
			updatedAt: now
		}));

		// Mevcut prices kayıtlarını çek
		const existing = await db.query({ prices: {} });
		const existingMap = Object.fromEntries(
			(existing.prices ?? []).map((p) => [p['key'] as string, p.id as string])
		);

		// Upsert — varsa güncelle, yoksa oluştur
		const txOps = ops.map(op => {
			const existingId = existingMap[op.key];
			return existingId
				? db.tx.prices[existingId].update(op)
				: db.tx.prices[id()].update(op);
		});

		await db.transact(txOps);

		return json({ success: true, updatedAt: now, currencies: ops });
	} catch (err) {
		console.error('[/api/rates] error:', err);
		return json({ success: false, error: String(err) }, { status: 500 });
	}
}
