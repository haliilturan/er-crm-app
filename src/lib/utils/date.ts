// İş-günü (Cmt/Paz hariç) tarih yardımcıları — saf, yan-etkisiz fonksiyonlar.

/** Cumartesi/Pazar → false, diğer günler → true. */
export function isBusinessDay(d: Date): boolean {
	const day = d.getDay(); // 0 = Pazar, 6 = Cumartesi
	return day !== 0 && day !== 6;
}

/**
 * `startMs`'ten itibaren n. iş gününün tarihini (yerel gece yarısı) döndürür.
 *
 * @param includeStartDay `true` (varsayılan) ise, başlangıç günü bir iş günüyse
 *   1. iş günü olarak sayılır. Örn. 2 Tem Per (includeStartDay=true):
 *   n=7 → 10 Tem Cum, n=8 → 13 Tem Pzt.
 */
export function nthBusinessDay(startMs: number, n: number, includeStartDay = true): Date {
	const d = new Date(startMs);
	d.setHours(0, 0, 0, 0);
	let count = includeStartDay && isBusinessDay(d) ? 1 : 0;
	while (count < n) {
		d.setDate(d.getDate() + 1);
		if (isBusinessDay(d)) count++;
	}
	return d;
}
