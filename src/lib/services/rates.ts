/**
 * QNB'den güncel kurları çekip InstantDB prices tablosunu günceller.
 * Teklif kaydet, siparişe dönüş ve ödeme girişinde çağrılır.
 * Hata olursa sessizce geçer — ana işlemi asla bloklamamalı.
 */
export async function refreshRates(): Promise<void> {
	try {
		const res = await fetch('/api/rates', { method: 'POST' });
		if (!res.ok) console.warn('[refreshRates] API yanıt vermedi:', res.status);
	} catch (err) {
		console.warn('[refreshRates] Hata:', err);
	}
}
