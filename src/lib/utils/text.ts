// Metin yardımcıları.

/**
 * Türkçe karakterleri normalize eder ve küçük harfe çevirir — "Fırça" → "firca".
 * Arama karşılaştırmaları için kullanılır (aksan/dil duyarsız `includes`).
 *
 * Not: Kod tabanında birkaç yerel `normalize` kopyası daha var (CustomerModal,
 * ProductFormModal, QuoteItemRow, ClientList). Bu kanonik sürüm onların ORTAK
 * davranışını korur; çağrı yerlerini birleştirmek ayrı bir işin konusudur.
 */
export function normalize(s: string): string {
	return s
		.toLowerCase()
		.replace(/[şŞ]/g, 's')
		.replace(/[çÇ]/g, 'c')
		.replace(/[ğĞ]/g, 'g')
		.replace(/[üÜ]/g, 'u')
		.replace(/[öÖ]/g, 'o')
		.replace(/[ıİi]/g, 'i');
}
