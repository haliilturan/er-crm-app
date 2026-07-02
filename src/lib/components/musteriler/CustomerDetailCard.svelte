<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Tabs, Button, Badge, Avatar } from '$lib/components/ui';
	import QuoteForm from '$lib/components/teklifler/QuoteForm.svelte';
	import OrderForm, { type EditableOrder } from '$lib/components/teklifler/OrderForm.svelte';
	import { notoSansBase64 } from '$lib/fonts/notoSansBase64';
	import { notoSansArabicBase64 } from '$lib/fonts/notoSansArabicBase64';

	// ─── Props ────────────────────────────────────────────────────────────────
	let {
		customerId,
		onedit,
		initialTab = 'info',
		onTabChange
	}: {
		customerId: string;
		onedit?: (id: string) => void;
		initialTab?: string;
		onTabChange?: (tab: string) => void;
	} = $props();

	// ─── Types ────────────────────────────────────────────────────────────────
	type CustomerRow = {
		id: string;
		name: string;
		companyType: string;
		status: string;
		source?: string;
		contactName?: string;
		contactTitle?: string;
		phone: string;
		phoneLandline?: string;
		email?: string;
		website?: string;
		country?: string;
		state?: string;
		city?: string;
		address?: string;
		deliveryAddress?: string;
		taxNumber?: string;
		createdAt: number;
	};

	type NoteRow = {
		id: string;
		title?: string;
		content: string;
		createdBy: string;
		createdAt: number;
		author?: { id: string; fullName: string };
	};

	type OrderRow = {
		id: string;
		orderNumber: string;
		status: string;
		currency: string;
		totalWithVat: number;
		subtotal?: number;
		totalVat?: number;
		notes?: string;
		internalNotes?: string;
		language?: string;
		exchangeRate?: number;
		createdAt: number;
		createdBy: string;
		companyId?: string;
		deliveryType?: string;
		deliveryFirm?: string;
		deliveryPayment?: string;
		deliveryAddress?: string;
		deliveryCity?: string;
		deliveryCountry?: string;
		installationType?: string;
		paymentType?: string;
		estimatedDeliveryDate?: number;
		validUntil?: number;
		productionDuration?: string;
		bankAccount?: string;
		purchaseOrderNumber?: string;
		payments?: PaymentRow[];
	};

	type ItemRow = {
		id: string;
		orderId?: string;
		productName: string;
		productSku?: string;
		brandName?: string;
		unit: string;
		quantity: number;
		listPrice: number;
		discountRate: number;
		unitPrice?: number;
		vatRate: number;
		vatAmount?: number;
		lineTotal?: number;
		lineTotalWithVat?: number;
		isIncludedPart: boolean;
		sortOrder?: number;
		notes?: string;
		descTR?: string;
		descEN?: string;
		descRU?: string;
		descAR?: string;
		descFR?: string;
	};

	type UserProfileRow = {
		id: string;
		userId?: string;
		fullName?: string;
	};

	type PaymentRow = {
		id: string;
		orderId: string;
		customerId?: string;
		companyId?: string;
		amount: number;
		currency: string;
		paidAt: number;
		note?: string;
		recordedBy?: string;
		createdAt: number;
		exchangeRate?: number;
		exchangeRateDate?: number;
		amountUSD?: number;
	};

	type PriceRow = {
		key: string;
		buy: number;
		sell: number;
		value: number;
		change?: string;
		direction?: number;
		updatedAt?: number;
	};

	type DescKey = 'descTR' | 'descEN' | 'descRU' | 'descAR' | 'descFR';

	type LangCode = 'tr' | 'en' | 'ru' | 'ar' | 'fr';
	type LangDict = {
		quote: string; order: string;
		quoteNo: string; orderNo: string;
		date: string; validUntil: string;
		customer: string; contact: string; address: string; phone: string; email: string;
		product: string; qty: string; unit: string; unitPrice: string; discount: string;
		total: string; subtotal: string; vat: string; grandTotal: string;
		notes: string; purchaseOrderNo: string; currency: string;
		paymentTerms: string; deliveryType: string; bank: string; page: string;
		rtl?: string;
	};

	// ─── PDF i18n ─────────────────────────────────────────────────────────────
	const LANGS: { code: LangCode; label: string; flag: string }[] = [
		{ code: 'tr', label: 'Türkçe',   flag: '🇹🇷' },
		{ code: 'en', label: 'English',  flag: '🇬🇧' },
		{ code: 'ru', label: 'Русский',  flag: '🇷🇺' },
		{ code: 'ar', label: 'العربية',  flag: '🇸🇦' },
		{ code: 'fr', label: 'Français', flag: '🇫🇷' },
	];

	const PDF_I18N: Record<LangCode, LangDict> = {
		tr: {
			quote: 'TEKLİF', order: 'SİPARİŞ', quoteNo: 'Teklif No', orderNo: 'Sipariş No',
			date: 'Tarih', validUntil: 'Geçerlilik Tarihi',
			customer: 'Müşteri', contact: 'Yetkili', address: 'Adres', phone: 'Telefon', email: 'E-Posta',
			product: 'Ürün Adı', qty: 'Miktar', unit: 'Birim', unitPrice: 'Birim Fiyat', discount: 'İskonto',
			total: 'Toplam', subtotal: 'Ara Toplam', vat: 'KDV', grandTotal: 'GENEL TOPLAM',
			notes: 'Notlar', purchaseOrderNo: 'Satın Alma No', currency: 'Para Birimi',
			paymentTerms: 'Ödeme Koşulları', deliveryType: 'Teslimat Tipi', bank: 'Banka Bilgileri', page: 'Sayfa',
		},
		en: {
			quote: 'QUOTATION', order: 'ORDER', quoteNo: 'Quote No', orderNo: 'Order No',
			date: 'Date', validUntil: 'Valid Until',
			customer: 'Client', contact: 'Contact', address: 'Address', phone: 'Phone', email: 'Email',
			product: 'Product', qty: 'Qty', unit: 'Unit', unitPrice: 'Unit Price', discount: 'Discount',
			total: 'Total', subtotal: 'Subtotal', vat: 'VAT', grandTotal: 'GRAND TOTAL',
			notes: 'Notes', purchaseOrderNo: 'Purchase Order No', currency: 'Currency',
			paymentTerms: 'Payment Terms', deliveryType: 'Delivery Type', bank: 'Bank Details', page: 'Page',
		},
		ru: {
			quote: 'ПРЕДЛОЖЕНИЕ', order: 'ЗАКАЗ', quoteNo: 'Номер предложения', orderNo: 'Номер заказа',
			date: 'Дата', validUntil: 'Действительно до',
			customer: 'Клиент', contact: 'Контакт', address: 'Адрес', phone: 'Телефон', email: 'Эл. почта',
			product: 'Товар', qty: 'Кол-во', unit: 'Ед.', unitPrice: 'Цена/ед.', discount: 'Скидка',
			total: 'Итого', subtotal: 'Промежуток', vat: 'НДС', grandTotal: 'ОБЩИЙ ИТОГ',
			notes: 'Заметки', purchaseOrderNo: 'Номер заказа', currency: 'Валюта',
			paymentTerms: 'Условия оплаты', deliveryType: 'Тип доставки', bank: 'Банковские реквизиты', page: 'Страница',
		},
		ar: {
			quote: 'عرض السعر', order: 'طلب', quoteNo: 'رقم العرض', orderNo: 'رقم الطلب',
			date: 'التاريخ', validUntil: 'صالح حتى',
			customer: 'العميل', contact: 'جهة الاتصال', address: 'العنوان', phone: 'الهاتف', email: 'البريد الإلكتروني',
			product: 'المنتج', qty: 'الكمية', unit: 'الوحدة', unitPrice: 'سعر الوحدة', discount: 'الخصم',
			total: 'الإجمالي', subtotal: 'المجموع الفرعي', vat: 'ضريبة', grandTotal: 'الإجمالي الكلي',
			notes: 'ملاحظات', purchaseOrderNo: 'رقم أمر الشراء', currency: 'العملة',
			paymentTerms: 'شروط الدفع', deliveryType: 'نوع التسليم', bank: 'تفاصيل البنك', page: 'صفحة',
			rtl: 'true',
		},
		fr: {
			quote: 'DEVIS', order: 'COMMANDE', quoteNo: 'N° devis', orderNo: 'N° Commande',
			date: 'Date', validUntil: "Valable jusqu'au",
			customer: 'Client', contact: 'Contact', address: 'Adresse', phone: 'Téléphone', email: 'E-mail',
			product: 'Produit', qty: 'Qté', unit: 'Unité', unitPrice: 'Prix unitaire', discount: 'Remise',
			total: 'Total', subtotal: 'Sous-total', vat: 'TVA', grandTotal: 'TOTAL GÉNÉRAL',
			notes: 'Notes', purchaseOrderNo: 'N° bon de commande', currency: 'Devise',
			paymentTerms: 'Conditions de paiement', deliveryType: 'Type de livraison', bank: 'Coordonnées bancaires', page: 'Page',
		},
	};

	// ─── Proforma PDF i18n ────────────────────────────────────────────────────
	type ProformaLangDict = {
		title: string;
		docNo: string; contractNo: string;
		customer: string; address: string; phone: string; email: string;
		date: string; validUntil: string;
		colImage: string; colCode: string; colDesc: string; colQty: string; colPrice: string; colTotal: string;
		subtotal: string; discount: string; netSubtotal: string; vat: string; grandTotal: string;
		techNotes: string; conditions: string;
		deliveryType: string; productionDuration: string; paymentTerms: string; bank: string;
		manufacturer: string; page: string;
		rtl?: string;
	};

	const PROFORMA_I18N: Record<LangCode, ProformaLangDict> = {
		tr: {
			title: 'PROFORMA FATURA',
			docNo: 'No', contractNo: 'Kontrat No',
			customer: 'MÜŞTERİ', address: 'Adres', phone: 'Telefon', email: 'E-posta',
			date: 'Tarih', validUntil: 'Geçerlilik',
			colImage: 'Resim', colCode: 'KOD', colDesc: 'KARAKTERİSTİK', colQty: 'MİKTAR', colPrice: 'EXW FİYAT İzmir', colTotal: 'TUTAR',
			subtotal: 'Ara Toplam', discount: 'İndirim', netSubtotal: 'Net Ara Toplam', vat: 'KDV', grandTotal: 'TOPLAM',
			techNotes: 'TEKNİK NOTLAR', conditions: 'SİPARİŞ KOŞULLARI',
			deliveryType: 'Teslimat Koşulları', productionDuration: 'Üretim Süresi', paymentTerms: 'Ödeme Koşulları', bank: 'BANKA',
			manufacturer: 'Üretici', page: 'Sayfa',
		},
		en: {
			title: 'PROFORMA INVOICE',
			docNo: 'No', contractNo: 'Contract No',
			customer: 'CLIENT', address: 'Address', phone: 'Phone', email: 'Email',
			date: 'Date', validUntil: 'Valid Until',
			colImage: 'Image', colCode: 'Code', colDesc: 'Description', colQty: 'Qty', colPrice: 'EXW Price Izmir', colTotal: 'Amount',
			subtotal: 'Sub-Total', discount: 'Discount', netSubtotal: 'Net Subtotal', vat: 'VAT', grandTotal: 'TOTAL',
			techNotes: 'Technical Notes', conditions: 'Order Conditions',
			deliveryType: 'Delivery Terms', productionDuration: 'Production Time', paymentTerms: 'Payment Terms', bank: 'BANK',
			manufacturer: 'Manufacturer', page: 'Page',
		},
		ru: {
			title: 'СЧЁТ-ПРОФОРМА',
			docNo: 'Номер', contractNo: 'Контракт №',
			customer: 'КЛИЕНТ', address: 'Адрес', phone: 'Телефон', email: 'Эл. почта',
			date: 'Дата', validUntil: 'Действителен до',
			colImage: 'Фото', colCode: 'Код', colDesc: 'Характеристики', colQty: 'Кол-во', colPrice: 'Цена EXW Измир', colTotal: 'Сумма',
			subtotal: 'Промежуточный итог', discount: 'Скидка', netSubtotal: 'Итого без НДС', vat: 'НДС', grandTotal: 'ИТОГО',
			techNotes: 'ТЕХНИЧЕСКИЕ ПРИМЕЧАНИЯ', conditions: 'УСЛОВИЯ ЗАКАЗА',
			deliveryType: 'Условия поставки', productionDuration: 'Срок производства', paymentTerms: 'Условия оплаты', bank: 'БАНК',
			manufacturer: 'Производитель', page: 'Страница',
		},
		ar: {
			title: 'فاتورة أولية',
			docNo: 'الرقم', contractNo: 'عقد رقم',
			customer: 'العميل', address: 'العنوان', phone: 'الهاتف', email: 'البريد الإلكتروني',
			date: 'التاريخ', validUntil: 'صالح حتى',
			colImage: 'صورة', colCode: 'الرمز', colDesc: 'الوصف', colQty: 'الكمية', colPrice: 'سعر EXW إزمير', colTotal: 'المبلغ',
			subtotal: 'المجموع الفرعي', discount: 'الخصم', netSubtotal: 'المجموع الصافي', vat: 'ضريبة', grandTotal: 'الإجمالي الكلي',
			techNotes: 'ملاحظات فنية', conditions: 'شروط الطلب',
			deliveryType: 'شروط التوصيل', productionDuration: 'وقت الإنتاج', paymentTerms: 'شروط الدفع', bank: 'البنك',
			manufacturer: 'المصنع', page: 'صفحة',
			rtl: 'true',
		},
		fr: {
			title: 'FACTURE PROFORMA',
			docNo: 'N°', contractNo: 'N° Contrat',
			customer: 'CLIENT', address: 'Adresse', phone: 'Téléphone', email: 'E-mail',
			date: 'Date', validUntil: "Valable jusqu'au",
			colImage: 'Image', colCode: 'Code', colDesc: 'Description', colQty: 'Qté', colPrice: 'Prix EXW Izmir', colTotal: 'Montant',
			subtotal: 'Sous-total', discount: 'Remise', netSubtotal: 'Sous-total net', vat: 'TVA', grandTotal: 'TOTAL',
			techNotes: 'NOTES TECHNIQUES', conditions: 'CONDITIONS DE COMMANDE',
			deliveryType: 'Conditions de livraison', productionDuration: 'Délai de production', paymentTerms: 'Conditions de paiement', bank: 'BANQUE',
			manufacturer: 'Fabricant', page: 'Page',
		},
	};

	// ─── Constants ────────────────────────────────────────────────────────────
	const TABS = [
		{ value: 'info',     label: 'Bilgiler'   },
		{ value: 'notes',    label: 'Notlar'     },
		{ value: 'quotes',   label: 'Teklifler'  },
		{ value: 'orders',   label: 'Siparişler' },
		{ value: 'payments', label: 'Ödemeler'   }
	];

	const typeLabels: Record<string, string> = {
		'Lead':           'Aday',
		'Contact':        'İletişim',
		'Client':         'Müşteri',
		'Son Kullanıcı':  'Son Kullanıcı',
		'Aracı':          'Aracı',
		'Tüccar':         'Tüccar',
		'Soğuk İletişim': 'Soğuk İletişim',
		'Bireysel':       'Bireysel',
		corporate:        'Kurumsal',
		individual:       'Bireysel'
	};


	const STATUS_OPTIONS = [
		{ value: 'lead',     label: 'Potansiyel' },
		{ value: 'active',   label: 'Aktif'      },
		{ value: 'inactive', label: 'Pasif'      },
		{ value: 'musteri',  label: 'Müşteri'    },
		{ value: 'vip',      label: 'VIP'        },
	];

	const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
		lead:              { label: 'Potansiyel',   variant: 'warning' },
		active:            { label: 'Aktif',         variant: 'success' },
		inactive:          { label: 'Pasif',         variant: 'default' },
		musteri:           { label: 'Müşteri',        variant: 'info'    },
		vip:               { label: 'VIP',            variant: 'success' },
		draft:             { label: 'Taslak',        variant: 'default' },
		pending_finance:   { label: 'Finans Onayı',  variant: 'warning' },
		cancelled:         { label: 'İptal',         variant: 'danger'  },
		pending_production:{ label: 'Üretim Bekliyor', variant: 'warning' },
		in_production:     { label: 'Üretimde',      variant: 'info'    },
		ready:             { label: 'Hazır',          variant: 'info'    },
		shipped:           { label: 'Kargoda',        variant: 'info'    },
		delivered:         { label: 'Teslim Edildi',  variant: 'success' }
	};

	// ─── State ────────────────────────────────────────────────────────────────
	let tabValue       = $derived(initialTab);
	let showQuoteForm  = $state(false);
	let editingQuote   = $state<OrderRow | null>(null);
	let showOrderForm  = $state(false);
	let editingOrder   = $state<OrderRow | null>(null);
	let customer   = $state<CustomerRow | null>(null);
	let notes      = $state<NoteRow[]>([]);
	let quotes     = $state<OrderRow[]>([]);
	let orders     = $state<OrderRow[]>([]);
	let loading    = $state(true);
	let userId     = $state<string | null>(null);

	let teklifArama  = $state('');
	let siparisArama = $state('');

	let noteForm      = $state({ title: '', content: '' });
	let noteAttempted = $state(false);
	let noteSaving    = $state(false);
	let noteError     = $state('');

	let langModalOpen  = $state(false);
	let langForType    = $state<'quote' | 'order'>('quote');
	let langForEntity  = $state<OrderRow | null>(null);
	let pdfGenerating  = $state(false);

	let proformaModalOpen = $state(false);
	let proformaEntity    = $state<OrderRow | null>(null);

	let allOrderItems   = $state<ItemRow[]>([]);
	let userProfileMap  = $state<Record<string, { id: string; name: string }>>({});
	let pricesMap       = $state<Record<string, PriceRow>>({});

	let detailOpen    = $state(false);
	let detailEntity  = $state<OrderRow | null>(null);

	let editingStatus = $state(false);
	let statusSaving  = $state(false);
	let actionSaving  = $state(false);
	let detailLoading = $state(false);

	let detailItems = $derived(
		allOrderItems.filter((i) => i.orderId === detailEntity?.id)
	);
	let detailItemsSorted = $derived(
		[...detailItems].sort((a, b) => {
			if (a.isIncludedPart !== b.isIncludedPart) return a.isIncludedPart ? 1 : -1;
			return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		})
	);

	let noteValid = $derived(noteForm.content.trim().length > 0);

	let customerTotalsByCurrency = $derived.by(() => {
		const byCur: Record<string, {
			totalDebt: number; totalPaid: number; totalDebtUSD: number; totalPaidUSD: number;
			forexFixed: number; forexToday: number; hasForex: boolean;
		}> = {};
		for (const order of orders) {
			const cur = order.currency || 'TRY';
			if (!byCur[cur]) byCur[cur] = {
				totalDebt: 0, totalPaid: 0, totalDebtUSD: 0, totalPaidUSD: 0,
				forexFixed: 0, forexToday: 0, hasForex: false
			};
			const paid = calcOrderPaid(order);
			byCur[cur].totalDebt += order.totalWithVat;
			byCur[cur].totalPaid += paid;
			byCur[cur].totalDebtUSD += toUSD(order.totalWithVat, cur);
			byCur[cur].totalPaidUSD += toUSD(paid, cur);
			for (const payment of (order.payments ?? [])) {
				if (payment.amountUSD != null) {
					byCur[cur].forexFixed += payment.amountUSD;
					byCur[cur].forexToday += toUSD(payment.amount, payment.currency);
					byCur[cur].hasForex = true;
				}
			}
		}
		return byCur;
	});

	let allPaymentsTimeline = $derived.by(() =>
		orders
			.flatMap(o => (o.payments ?? []).map(p => ({ ...p, orderNumber: o.orderNumber ?? '' })))
			.sort((a, b) => b.paidAt - a.paidAt)
	);

	let ratesUpdatedAt = $derived.by(() => {
		const vals = Object.values(pricesMap);
		return vals.length > 0 ? Math.max(...vals.map(p => p.updatedAt ?? 0)) : null;
	});

	// ─── Helpers ──────────────────────────────────────────────────────────────
	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', {
			day: '2-digit', month: 'short', year: 'numeric'
		});
	}

	function formatTs(ts: number): string {
		return new Date(ts).toLocaleString('tr-TR', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function initials(name: string): string {
		return (name ?? 'M').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
	}

	function formatMoney(amount: number, currency: string): string {
		return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
	}

	function fmtPdf(amount: number, sym: string): string {
		return (amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + sym;
	}

	function toUSD(amount: number, currency: string): number {
		if (currency === 'USD') return amount;
		const usdSell = pricesMap['USD']?.sell;
		if (currency === 'TRY') return usdSell ? amount / usdSell : 0;
		const currSell = pricesMap[currency]?.sell;
		return currSell && usdSell ? amount * (currSell / usdSell) : 0;
	}

	function canConvertToUSD(currency: string): boolean {
		if (currency === 'USD') return false;
		return !!(pricesMap['USD']?.sell) && (currency === 'TRY' || !!(pricesMap[currency]?.sell));
	}

	function calcOrderPaid(order: OrderRow): number {
		return (order.payments ?? []).reduce((s, p) => s + p.amount, 0);
	}

	function calcOrderRemaining(order: OrderRow): number {
		return Math.max(0, order.totalWithVat - calcOrderPaid(order));
	}

	function fmtUSD(amount: number): string {
		return '≈ $' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function fmtDollar(amount: number): string {
		return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function displayUSD(amount: number, currency: string): string {
		if (currency === 'USD') return '';
		const usdSell = pricesMap['USD']?.sell;
		if (!usdSell) return '≈ $-.--';
		if (currency === 'TRY') return fmtUSD(amount / usdSell);
		const currSell = pricesMap[currency]?.sell;
		if (!currSell) return '≈ $-.--';
		return fmtUSD(amount * (currSell / usdSell));
	}

	// ─── Timer ───────────────────────────────────────────────────────────────
	let noteTimer: ReturnType<typeof setTimeout> | undefined = undefined;
	onDestroy(() => clearTimeout(noteTimer));

	// ─── Auth + global item subscriptions (component ömrü boyunca açık kalır) ──
	onMount(() => {
		const cleanupAuth = db.subscribeAuth((s) => { userId = s.user?.id ?? null; });

		const cleanupOrderItems = db.subscribeQuery(
			{ orderItems: {} },
			(result) => {
				allOrderItems = (result.data?.orderItems ?? []) as ItemRow[];
			}
		);

		const cleanupProfiles = db.subscribeQuery(
			{ userProfiles: {} },
			(result) => {
				const map: Record<string, { id: string; name: string }> = {};
				for (const p of (result.data?.userProfiles ?? []) as UserProfileRow[]) {
					if (p.userId) map[p.userId] = { id: p.id, name: p.fullName ?? p.userId };
				}
				userProfileMap = map;
			}
		);

		const cleanupPrices = db.subscribeQuery(
			{ prices: { $: { where: { key: { in: ['USD', 'EUR', 'GBP'] } } } } },
			(result) => {
				pricesMap = Object.fromEntries(
					(result.data?.prices ?? []).map((p: PriceRow) => [p.key, p])
				);
			}
		);

		return () => { cleanupAuth(); cleanupOrderItems(); cleanupProfiles(); cleanupPrices(); };
	});

	// ─── Reset tab on customer change ─────────────────────────────────────────
	$effect(() => {
		if (customerId) {
			showQuoteForm = false;
			showOrderForm = false;
			editingStatus = false;
		}
	});

	// ─── Customer data ────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;
		untrack(() => { loading = true; });

		return db.subscribeQuery(
			{ customers: { $: { where: { id: cId } } } },
			(result) => {
				const c = ((result.data?.customers ?? []) as unknown[])[0] as CustomerRow | undefined;
				untrack(() => {
					customer = c ?? null;
					loading  = false;
				});
			}
		);
	});

	// ─── Notes ───────────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;

		return db.subscribeQuery(
			{
				customerNotes: {
					$: { where: { customerId: cId }, order: { createdAt: 'desc' } },
					author: {}
				}
			},
			(result) => {
				untrack(() => {
					notes = (result.data?.customerNotes ?? []) as NoteRow[];
				});
			}
		);
	});

	// ─── Quotes (draft / pending_finance orders) ─────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;

		return db.subscribeQuery(
			{
				orders: {
					$: {
						where: { customerId: cId, status: { in: ['draft', 'pending_finance'] } },
						order: { createdAt: 'desc' }
					}
				}
			},
			(result) => {
				untrack(() => {
					quotes = (result.data?.orders ?? []) as OrderRow[];
				});
			}
		);
	});

	// ─── Orders ──────────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;

		return db.subscribeQuery(
			{ orders: { $: { where: { customerId: cId }, order: { createdAt: 'desc' } }, payments: {} } },
			(result) => {
				untrack(() => {
					orders = (result.data?.orders ?? []) as OrderRow[];
				});
			}
		);
	});


	// ─── Status edit ─────────────────────────────────────────────────────────
	async function updateStatus(newStatus: string) {
		if (!customer || newStatus === customer.status) { editingStatus = false; return; }
		statusSaving = true;
		try {
			await db.transact([tx.customers[customerId].update({ status: newStatus })]);
		} finally {
			statusSaving = false;
			editingStatus = false;
		}
	}

	// ─── Add note ────────────────────────────────────────────────────────────
	async function addNote() {
		noteAttempted = true;
		const companyId = authStore.activeCompanyId;
		if (!noteValid || !customerId || !companyId || !userId) return;

		noteSaving = true;
		noteError  = '';

		try {
			const noteId     = id();
			const profileEntry = userProfileMap[userId!];
			const noteOp     = tx.customerNotes[noteId].update({
				...(noteForm.title.trim() && { title: noteForm.title.trim() }),
				content:   noteForm.content.trim(),
				companyId,
				customerId,
				createdBy: userId,
				createdAt: Date.now()
			});
			await db.transact([
				profileEntry?.id ? noteOp.link({ author: profileEntry.id }) : noteOp
			]);
			noteForm      = { title: '', content: '' };
			noteAttempted = false;
		} catch {
			noteError = 'Not eklenemedi. Lütfen tekrar deneyin.';
		} finally {
			noteSaving = false;
		}
	}

	function openDetailModal(type: 'quote' | 'order', entity: OrderRow) {
		detailEntity = entity;
		detailOpen   = true;
	}

	async function sendQuoteToFinance(quote: OrderRow) {
		if (actionSaving) return;
		actionSaving = true;
		const now = Date.now();
		try {
			await db.transact([
				tx.orders[quote.id].update({
					status: 'pending_finance'
				}),
				tx.orderStatusHistory[id()].update({
					orderId:    quote.id,
					fromStatus: 'draft',
					toStatus:   'pending_finance',
					changedBy:  authStore.userId!,
					changedAt:  now
				})
			]);
		} catch (e) {
			console.error('[sendQuoteToFinance] Transaction detay:', JSON.stringify(e, null, 2));
			throw e;
		} finally {
			actionSaving = false;
		}
	}

	async function siparisIptalEt(orderId: string) {
		if (actionSaving) return;
		actionSaving = true;
		const now = Date.now();
		try {
			await db.transact([
				tx.orders[orderId].update({ status: 'draft', updatedAt: now }),
				tx.orderStatusHistory[id()].update({
					orderId,
					fromStatus: 'in_production',
					toStatus:   'draft',
					changedBy:  authStore.userId!,
					reason:     'İptal — teklife dönüştürüldü',
					changedAt:  now
				})
			]);
		} finally {
			actionSaving = false;
		}
	}

	function openLangModal(type: 'quote' | 'order', entity: OrderRow) {
		langForType   = type;
		langForEntity = entity;
		langModalOpen = true;
	}

	function openProformaModal(entity: OrderRow) {
		proformaEntity    = entity;
		proformaModalOpen = true;
	}

	async function loadItemsOnce(entityId: string): Promise<ItemRow[]> {
		return new Promise((resolve) => {
			const cleanup = db.subscribeQuery(
				{ orderItems: { $: { where: { orderId: entityId } } } },
				(result) => {
					if (!result.data) return;
					cleanup();
					resolve((result.data?.orderItems ?? []) as ItemRow[]);
				}
			);
		});
	}

	async function generatePdf(lang: LangCode) {
		if (!langForEntity) return;
		langModalOpen = false;
		pdfGenerating = true;
		try {
			const isQuote   = langForType === 'quote';
			const entity    = langForEntity as OrderRow;
			const loadedItems = await loadItemsOnce(entity.id);
			const { jsPDF } = await import('jspdf');

			const L        = PDF_I18N[lang];
			const isRtl    = L.rtl === 'true';
			const sym      = entity.currency === 'TRY' ? 'TL' : entity.currency === 'USD' ? '$' : entity.currency === 'EUR' ? '€' : (entity.currency || 'TL');
			const localeMap: Record<string, string> = { tr: 'tr-TR', en: 'en-GB', ru: 'ru-RU', ar: 'ar-SA', fr: 'fr-FR' };
			const locale   = localeMap[lang] ?? 'tr-TR';
			const entityNum = entity.orderNumber ?? '';
			const q        = entity;

			const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
			const W  = 210;
			const ML = 15;
			const MR = W - 15;
			const TW = MR - ML;

			// ── Fonts
			doc.addFileToVFS('NotoSans.ttf', notoSansBase64);
			doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
			doc.addFileToVFS('NotoSansArabic.ttf', notoSansArabicBase64);
			doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

			function setFnt(size = 9) {
				doc.setFontSize(size);
				doc.setFont(isRtl ? 'NotoSansArabic' : 'NotoSans', 'normal');
			}

			const today    = new Date(entity.createdAt).toLocaleDateString(locale);
			const validStr = q?.validUntil ? new Date(q.validUntil).toLocaleDateString(locale) : '';
			const poNum    = q?.purchaseOrderNumber ?? '';

			// ── Page helpers
			function checkPage(y: number, needed = 12): number {
				if (y + needed > 272) {
					doc.addPage();
					setFnt();
					drawPageHeader();
					return 24;
				}
				return y;
			}

			function drawPageHeader() {
				doc.setFillColor(20, 20, 20);
				doc.rect(0, 0, W, 8, 'F');
				setFnt(7);
				doc.setTextColor(160, 160, 160);
				const numLabel = isQuote ? L.quoteNo : L.orderNo;
				const headerTxt = isRtl ? `${entityNum} :${numLabel}` : `${numLabel}: ${entityNum}`;
				doc.text(headerTxt, isRtl ? ML : MR, 5.5, { align: isRtl ? 'left' : 'right' });
				doc.setTextColor(0, 0, 0);
			}

			function drawFooter(pn: number) {
				doc.setFillColor(240, 240, 240);
				doc.rect(0, 284, W, 13, 'F');
				setFnt(7);
				doc.setTextColor(100, 100, 100);
				doc.text(`${L.page} ${pn}`, W / 2, 291.5, { align: 'center' });
				doc.setTextColor(0, 0, 0);
			}

			// ═══ PAGE 1
			drawPageHeader();
			let y = 16;

			// ── A) HEADER title bar
			doc.setFillColor(20, 20, 20);
			doc.rect(ML, y, TW, 14, 'F');
			doc.setTextColor(255, 255, 255);
			doc.setFont(isRtl ? 'NotoSansArabic' : 'NotoSans', 'normal');
			doc.setFontSize(16);
			doc.text(isQuote ? L.quote : L.order, W / 2, y + 9.5, { align: 'center' });
			doc.setTextColor(0, 0, 0);
			y += 18;

			// ── B) META INFO — two columns
			const colL = ML;
			const colR = ML + TW / 2 + 3;
			const colW = TW / 2 - 3;

			function metaRow(label: string, value: string, cx: number, cy: number): number {
				if (!value) return cy;
				setFnt(8);
				doc.setTextColor(100, 100, 100);
				if (isRtl) {
					doc.text(`${value} :${label}`, cx + colW, cy, { align: 'right' });
				} else {
					doc.text(`${label}:`, cx, cy);
					doc.setTextColor(20, 20, 20);
					const lines = doc.splitTextToSize(value, colW - 22);
					doc.text(lines, cx + 30, cy);
					cy += (lines.length - 1) * 4.5;
				}
				doc.setTextColor(0, 0, 0);
				return cy + 5.5;
			}

			// Left column — quote/order details
			let yL = y;
			yL = metaRow(isQuote ? L.quoteNo : L.orderNo, entityNum,              colL, yL);
			yL = metaRow(L.date,          today,                                  colL, yL);
			if (validStr) yL = metaRow(L.validUntil, validStr,                    colL, yL);
			if (poNum)    yL = metaRow(L.purchaseOrderNo, poNum,                  colL, yL);
			yL = metaRow(L.currency,      `${entity.currency} (${sym})`,          colL, yL);
			if (q?.paymentType)  yL = metaRow(L.paymentTerms, q.paymentType,      colL, yL);
			if (q?.deliveryType) yL = metaRow(L.deliveryType,  q.deliveryType,    colL, yL);

			// Right column — customer details
			const cAddr = [customer?.address, customer?.city, customer?.country].filter(Boolean).join(', ');
			let yR = y;
			yR = metaRow(L.customer, customer?.name    ?? '',  colR, yR);
			yR = metaRow(L.contact,  customer?.contactName ?? '', colR, yR);
			if (cAddr)             yR = metaRow(L.address, cAddr,              colR, yR);
			if (customer?.phone)   yR = metaRow(L.phone,   customer.phone,    colR, yR);
			if (customer?.email)   yR = metaRow(L.email,   customer.email,    colR, yR);

			y = Math.max(yL, yR) + 4;

			// Separator
			doc.setDrawColor(200, 200, 200);
			doc.line(ML, y, MR, y);
			y += 6;

			// ── C) PRODUCTS TABLE
			const COL = {
				name:      ML,
				qty:       ML + 72,
				unit:      ML + 87,
				unitPrice: ML + 103,
				disc:      ML + 127,
				vat:       ML + 141,
				total:     MR,
			};

			doc.setFillColor(30, 30, 30);
			doc.rect(ML, y - 1, TW, 8, 'F');
			doc.setTextColor(220, 220, 220);
			setFnt(7.5);
			if (isRtl) {
				doc.text(L.product,   MR,       y + 4.5, { align: 'right' });
				doc.text(L.qty,       MR - 72,  y + 4.5, { align: 'right' });
				doc.text(L.unit,      MR - 87,  y + 4.5, { align: 'right' });
				doc.text(L.unitPrice, MR - 103, y + 4.5, { align: 'right' });
				doc.text(L.discount,  MR - 127, y + 4.5, { align: 'right' });
				doc.text(L.vat,       MR - 141, y + 4.5, { align: 'right' });
				doc.text(L.total,     ML,        y + 4.5, { align: 'left'  });
			} else {
				doc.text(L.product,   COL.name + 1,       y + 4.5);
				doc.text(L.qty,       COL.qty,             y + 4.5, { align: 'right'  });
				doc.text(L.unit,      COL.unit + 7,        y + 4.5, { align: 'center' });
				doc.text(L.unitPrice, COL.unitPrice + 12,  y + 4.5, { align: 'right'  });
				doc.text(L.discount,  COL.disc + 7,        y + 4.5, { align: 'center' });
				doc.text(L.vat,       COL.vat + 7,         y + 4.5, { align: 'center' });
				doc.text(L.total,     COL.total,           y + 4.5, { align: 'right'  });
			}
			doc.setTextColor(0, 0, 0);
			y += 9;

			const sorted = [...loadedItems].sort((a, b) => {
				if (a.isIncludedPart !== b.isIncludedPart) return a.isIncludedPart ? 1 : -1;
				return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
			});

			const descLangKey: Record<LangCode, DescKey> = {
				tr: 'descTR', en: 'descEN', ru: 'descRU', ar: 'descAR', fr: 'descFR'
			};
			const dKey = descLangKey[lang];

			let rowAlt = false;
			for (const item of sorted) {
				const up  = item.unitPrice ?? 0;
				const ltv = item.lineTotalWithVat ?? 0;
				const nameText  = (item.isIncludedPart ? '  + ' : '') + (item.productName || '—');
				const nameLines = doc.splitTextToSize(nameText, 68);
				const descText  = String(item[dKey] ?? item.descEN ?? item.descTR ?? '').trim();
				const descLines = descText ? doc.splitTextToSize(descText, 68) : [];
				const rowH      = Math.max(7, nameLines.length * 4.5 + (descLines.length > 0 ? descLines.length * 3.5 + 1.5 : 0) + 3);

				y = checkPage(y, rowH + 2);

				if (rowAlt) {
					doc.setFillColor(248, 248, 248);
					doc.rect(ML, y - 1, TW, rowH, 'F');
				}
				rowAlt = !rowAlt;

				setFnt(8);
				const gray = item.isIncludedPart ? 100 : 20;
				doc.setTextColor(gray, gray, gray);

				const nameY = y + 4.5;
				if (isRtl) {
					doc.text(nameLines,                  MR,       nameY, { align: 'right' });
					doc.text(String(item.quantity ?? 0), MR - 72,  nameY, { align: 'right' });
					doc.text(item.unit ?? '',             MR - 87,  nameY, { align: 'right' });
					doc.text(`${fmtPdf(up, sym)}`,       MR - 103, nameY, { align: 'right' });
					if ((item.discountRate ?? 0) > 0) doc.text(`%${item.discountRate}`, MR - 127, nameY, { align: 'right' });
					doc.text(`%${item.vatRate ?? 0}`,    MR - 141, nameY, { align: 'right' });
					doc.text(`${fmtPdf(ltv, sym)}`,      ML,       nameY, { align: 'left'  });
				} else {
					doc.text(nameLines,                  COL.name + 1,      nameY);
					doc.text(String(item.quantity ?? 0), COL.qty,            nameY, { align: 'right'  });
					doc.text(item.unit ?? '',             COL.unit + 7,       nameY, { align: 'center' });
					doc.text(`${fmtPdf(up, sym)}`,       COL.unitPrice + 12, nameY, { align: 'right'  });
					if ((item.discountRate ?? 0) > 0) doc.text(`%${item.discountRate}`, COL.disc + 7, nameY, { align: 'center' });
					doc.text(`%${item.vatRate ?? 0}`,    COL.vat + 7,        nameY, { align: 'center' });
					doc.text(`${fmtPdf(ltv, sym)}`,      COL.total,          nameY, { align: 'right'  });
				}

				if (descLines.length > 0) {
					setFnt(6.5);
					doc.setTextColor(120, 120, 120);
					const descY = nameY + nameLines.length * 4.5 + 0.5;
					if (isRtl) {
						doc.text(descLines, MR, descY, { align: 'right' });
					} else {
						doc.text(descLines, COL.name + 1, descY);
					}
				}

				doc.setTextColor(0, 0, 0);
				y += rowH;
				doc.setDrawColor(235, 235, 235);
				doc.line(ML, y - 1, MR, y - 1);
			}

			// ── D) TOTALS BLOCK
			y += 4;
			y = checkPage(y, 28);
			doc.setDrawColor(180, 180, 180);
			doc.line(ML + TW * 0.55, y, MR, y);
			y += 5;

			function totRow(label: string, value: string, bold = false) {
				setFnt(bold ? 10 : 9);
				doc.setTextColor(80, 80, 80);
				if (isRtl) {
					doc.text(`${value} :${label}`, MR, y, { align: 'right' });
				} else {
					doc.text(`${label}:`, ML + TW * 0.55, y);
					doc.setTextColor(bold ? 0 : 30, bold ? 0 : 30, bold ? 0 : 30);
					doc.text(value, MR, y, { align: 'right' });
				}
				doc.setTextColor(0, 0, 0);
				y += bold ? 8 : 6;
			}

			const sub   = entity.subtotal  ?? 0;
			const vat   = entity.totalVat  ?? 0;
			const grand = entity.totalWithVat        ?? 0;
			totRow(L.subtotal,  fmtPdf(sub,   sym));
			totRow(L.vat,       fmtPdf(vat,   sym));
			totRow(L.grandTotal,fmtPdf(grand, sym), true);

			// ── E) PAYMENT & DELIVERY & BANK
			y += 4;
			const infoItems: [string, string][] = [];
			if (q?.paymentType)  infoItems.push([L.paymentTerms, q.paymentType]);
			if (q?.deliveryType) infoItems.push([L.deliveryType,  q.deliveryType]);
			if (q?.bankAccount)  infoItems.push([L.bank,          q.bankAccount]);

			if (infoItems.length > 0) {
				y = checkPage(y, 14 + infoItems.length * 7);
				doc.setDrawColor(200, 200, 200);
				doc.line(ML, y, MR, y);
				y += 6;
				for (const [label, value] of infoItems) {
					setFnt(8);
					doc.setTextColor(100, 100, 100);
					const lines = doc.splitTextToSize(value, TW - 35);
					if (isRtl) {
						doc.text(`${value} :${label}`, MR, y, { align: 'right' });
					} else {
						doc.text(`${label}:`, ML, y);
						doc.setTextColor(20, 20, 20);
						doc.text(lines, ML + 35, y);
					}
					doc.setTextColor(0, 0, 0);
					y += Math.max(6, lines.length * 4.5 + 2);
				}
			}

			// ── F) NOTES
			const notesText = entity.notes;
			if (notesText?.trim()) {
				y = checkPage(y, 18);
				doc.setDrawColor(200, 200, 200);
				doc.line(ML, y, MR, y);
				y += 5;
				setFnt(8);
				doc.setTextColor(80, 80, 80);
				doc.text(`${L.notes}:`, isRtl ? MR : ML, y, { align: isRtl ? 'right' : 'left' });
				y += 5;
				doc.setTextColor(20, 20, 20);
				const noteLines = doc.splitTextToSize(notesText.trim(), TW);
				for (const line of noteLines) {
					y = checkPage(y, 6);
					doc.text(line, isRtl ? MR : ML, y, { align: isRtl ? 'right' : 'left' });
					y += 4.8;
				}
				doc.setTextColor(0, 0, 0);
			}

			// ── G) FOOTERS
			const totalPagesCount = doc.getNumberOfPages();
			for (let p = 1; p <= totalPagesCount; p++) {
				doc.setPage(p);
				drawFooter(p);
			}

			const filename = isQuote ? `TASLAK-${entityNum}.pdf` : `SIPARIS-${entityNum}.pdf`;
			doc.save(filename);
		} finally {
			pdfGenerating = false;
		}
	}

	async function generateProformaPdf(lang: LangCode) {
		if (!proformaEntity) return;
		proformaModalOpen = false;
		pdfGenerating = true;
		try {
			const entity    = proformaEntity as OrderRow & { companyId?: string };
			const { jsPDF } = await import('jspdf');

			const PL    = PROFORMA_I18N[lang];
			const isRtl = PL.rtl === 'true';
			const sym   = entity.currency === 'TRY' ? 'TL'
			            : entity.currency === 'USD' ? '$'
			            : entity.currency === 'EUR' ? '€'
			            : entity.currency === 'GBP' ? '£'
			            : (entity.currency || 'TL');
			const localeMap: Record<string, string> = { tr: 'tr-TR', en: 'en-GB', ru: 'ru-RU', ar: 'ar-SA', fr: 'fr-FR' };
			const locale    = localeMap[lang] ?? 'tr-TR';

			// ── Logo
			async function fetchLogoBase64(url: string): Promise<string | null> {
				try {
					const resp = await fetch(url);
					if (!resp.ok) return null;
					const blob = await resp.blob();
					return await new Promise<string>((res, rej) => {
						const reader   = new FileReader();
						reader.onload  = () => res(reader.result as string);
						reader.onerror = rej;
						reader.readAsDataURL(blob);
					});
				} catch {
					return null;
				}
			}

			let logoUrl: string | null = authStore.companies.find(c => c.id === entity.companyId)?.logoUrl ?? null;
			if (!logoUrl && entity.companyId) {
				const compRes = await db.queryOnce({ companies: { $: { where: { id: entity.companyId } } } });
				const comp    = ((compRes.data?.companies ?? []) as { logoUrl?: string }[])[0];
				logoUrl       = comp?.logoUrl ?? null;
			}
			const logoBase64 = logoUrl ? await fetchLogoBase64(logoUrl) : null;

			// ── Items
			const loadedItems = await loadItemsOnce(entity.id);
			const typedItems  = loadedItems as (ItemRow & { productId?: string })[];

			// ── Ürün görselleri (toplu)
			const productIds = [...new Set(typedItems.map(i => i.productId).filter((pid): pid is string => !!pid))];
			const photoMap: Record<string, string> = {};
			if (productIds.length > 0) {
				const prodRes = await db.queryOnce({ products: { $: { where: { id: { in: productIds } } } } });
				const prods   = (prodRes.data?.products ?? []) as { id: string; photo?: string; photoUrls?: string[] }[];
				for (const p of prods) {
					const photo = p.photo ?? (Array.isArray(p.photoUrls) ? p.photoUrls[0] : undefined) ?? null;
					if (photo) photoMap[p.id] = photo;
				}
			}

			// ── jsPDF
			const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
			const W   = 210;
			const ML  = 15;
			const MR  = W - 15;
			const TW  = MR - ML;

			doc.addFileToVFS('NotoSans.ttf', notoSansBase64);
			doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
			doc.addFileToVFS('NotoSansArabic.ttf', notoSansArabicBase64);
			doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

			function setFnt(size = 9) {
				doc.setFontSize(size);
				doc.setFont(isRtl ? 'NotoSansArabic' : 'NotoSans', 'normal');
			}

			function drawFooter(pn: number) {
				doc.setFillColor(240, 240, 240);
				doc.rect(0, 284, W, 13, 'F');
				setFnt(7);
				doc.setTextColor(100, 100, 100);
				doc.text(`${PL.page} ${pn}`, W / 2, 291.5, { align: 'center' });
				doc.setTextColor(0, 0, 0);
			}

			function checkPage(y: number, needed = 12): number {
				if (y + needed > 272) {
					doc.addPage();
					setFnt();
					return 15;
				}
				return y;
			}

			const today    = new Date(entity.createdAt).toLocaleDateString(locale);
			const validStr = entity.validUntil ? new Date(entity.validUntil).toLocaleDateString(locale) : '';
			const poNum    = entity.purchaseOrderNumber ?? '';

			// ═══ SAYFA 1
			let y = 10;

			// ── A) LOGO — ortalı, max 120 mm
			if (logoBase64) {
				try {
					const fmt   = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
					const logoW = 120;
					const logoH = 28;
					const logoX = (W - logoW) / 2;
					doc.addImage(logoBase64, fmt, logoX, y, logoW, logoH, undefined, 'FAST');
					y += logoH + 5;
				} catch {
					y += 5;
				}
			}

			// ── B) BAŞLIK
			setFnt(18);
			doc.setFont(isRtl ? 'NotoSansArabic' : 'NotoSans', 'normal');
			doc.text(PL.title, W / 2, y + 8, { align: 'center' });
			y += 14;

			doc.setDrawColor(180, 180, 180);
			doc.line(ML, y, MR, y);
			y += 6;

			// ── C) META — Müşteri (sol) + Belge (sağ)
			const colL  = ML;
			const colR  = ML + TW / 2 + 3;
			const metaW = TW / 2 - 6;

			function metaRowP(label: string, val: string | undefined, cx: number, cy: number): number {
				if (!val) return cy;
				setFnt(8);
				const lines = doc.splitTextToSize(val, metaW - 26);
				if (isRtl) {
					doc.setTextColor(100, 100, 100);
					doc.text(`${val} :${label}`, cx + metaW, cy, { align: 'right' });
				} else {
					doc.setTextColor(100, 100, 100);
					doc.text(`${label}:`, cx, cy);
					doc.setTextColor(20, 20, 20);
					doc.text(lines, cx + 26, cy);
					cy += (lines.length - 1) * 4.5;
				}
				doc.setTextColor(0, 0, 0);
				return cy + 5.5;
			}

			let yL = y;
			let yR = y;

			const cAddr = [customer?.address, customer?.city, customer?.country].filter(Boolean).join(', ');
			yL = metaRowP(PL.customer, customer?.name ?? '', colL, yL);
			if (cAddr)           yL = metaRowP(PL.address, cAddr,          colL, yL);
			if (customer?.phone) yL = metaRowP(PL.phone,   customer.phone, colL, yL);
			if (customer?.email) yL = metaRowP(PL.email,   customer.email, colL, yL);

			yR = metaRowP(PL.docNo,     entity.orderNumber ?? '', colR, yR);
			yR = metaRowP(PL.date,      today,                    colR, yR);
			if (validStr) yR = metaRowP(PL.validUntil, validStr,  colR, yR);
			if (poNum)    yR = metaRowP(PL.contractNo, poNum,      colR, yR);

			y = Math.max(yL, yR) + 5;
			doc.setDrawColor(200, 200, 200);
			doc.line(ML, y, MR, y);
			y += 6;

			// ── D) ÜRÜN TABLOSU
			// Sütunlar: # 7 | görsel 22 | kod 25 | açıklama 61 | miktar 15 | fiyat 27 | tutar 23
			const C = {
				num:   ML,
				img:   ML + 7,
				kod:   ML + 29,
				desc:  ML + 54,
				qty:   ML + 115,
				price: ML + 130,
				total: ML + 157,
			};
			const CW = {
				num:   7,
				img:   22,
				kod:   25,
				desc:  61,
				qty:   15,
				price: 27,
				total: MR - (ML + 157),
			};

			const HDR_H = 9;
			doc.setFillColor(25, 25, 25);
			doc.rect(ML, y, TW, HDR_H, 'F');
			doc.setTextColor(210, 210, 210);
			setFnt(7);

			if (!isRtl) {
				doc.text('#',         C.num + CW.num / 2,      y + 6, { align: 'center' });
				doc.text(PL.colImage, C.img + CW.img / 2,      y + 6, { align: 'center' });
				doc.text(PL.colCode,  C.kod + 1,                y + 6);
				doc.text(PL.colDesc,  C.desc + 1,               y + 6);
				doc.text(PL.colQty,   C.qty + CW.qty / 2,      y + 6, { align: 'center' });
				doc.text(PL.colPrice, C.price + CW.price / 2,  y + 6, { align: 'center' });
				doc.text(PL.colTotal, MR - 1,                   y + 6, { align: 'right' });
			} else {
				doc.text('#',         MR - CW.num / 2,                         y + 6, { align: 'center' });
				doc.text(PL.colImage, MR - CW.num - CW.img / 2,               y + 6, { align: 'center' });
				doc.text(PL.colCode,  MR - CW.num - CW.img - 1,               y + 6, { align: 'right' });
				doc.text(PL.colDesc,  MR - CW.num - CW.img - CW.kod - 1,      y + 6, { align: 'right' });
				doc.text(PL.colQty,   ML + CW.total + CW.price + CW.qty / 2,  y + 6, { align: 'center' });
				doc.text(PL.colPrice, ML + CW.total + CW.price / 2,            y + 6, { align: 'center' });
				doc.text(PL.colTotal, ML + 1,                                   y + 6, { align: 'left' });
			}
			doc.setTextColor(0, 0, 0);
			y += HDR_H;

			const VLINES = [ML, C.img, C.kod, C.desc, C.qty, C.price, C.total, MR];
			function drawRowBox(rowY: number, rowH: number) {
				doc.setDrawColor(200, 200, 200);
				for (const cx of VLINES) doc.line(cx, rowY, cx, rowY + rowH);
				doc.line(ML, rowY + rowH, MR, rowY + rowH);
			}

			const descKey: Record<LangCode, DescKey> = {
				tr: 'descTR', en: 'descEN', ru: 'descRU', ar: 'descAR', fr: 'descFR'
			};
			const dKey  = descKey[lang];
			const IMG_S = 18;

			const sorted = [...typedItems]
				.filter(item => !item.isIncludedPart)
				.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

			let rowIdx = 0;
			for (const item of sorted) {
				rowIdx++;
				const descTxt = String(item[dKey] ?? item.descEN ?? item.descTR ?? item.productName ?? '').trim();
				const descLns = doc.splitTextToSize(descTxt, CW.desc - 2);
				const codeLns = doc.splitTextToSize(item.productSku ?? '', CW.kod - 2);
				const textH   = Math.max(descLns.length, codeLns.length) * 4.5 + 4;
				const rowH    = Math.max(IMG_S + 3, textH);

				y = checkPage(y, rowH + 1);

				const bg = rowIdx % 2 === 0 ? [245, 247, 250] : [255, 255, 255];
				doc.setFillColor(bg[0], bg[1], bg[2]);
				doc.rect(ML, y, TW, rowH, 'F');

				if (item.productId) {
					const imgSrc = photoMap[item.productId];
					if (imgSrc) {
						try {
							const fmt  = imgSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG';
							const imgX = isRtl
								? MR - CW.num - (CW.img + IMG_S) / 2
								: C.img + (CW.img - IMG_S) / 2;
							doc.addImage(imgSrc, fmt, imgX, y + (rowH - IMG_S) / 2, IMG_S, IMG_S, undefined, 'FAST');
						} catch { /* görsel atla */ }
					}
				}

				setFnt(8);
				doc.setTextColor(20, 20, 20);
				const tY = y + 5;

				if (!isRtl) {
					doc.text(String(rowIdx),             C.num + CW.num / 2,          tY, { align: 'center' });
					doc.text(codeLns,                    C.kod + 1,                   tY);
					doc.text(descLns,                    C.desc + 1,                  tY);
					doc.text(String(item.quantity ?? 0), C.qty + CW.qty / 2,          tY, { align: 'center' });
					doc.text(fmtPdf(item.unitPrice ?? 0, sym),        C.price + CW.price - 1, tY, { align: 'right' });
					doc.text(fmtPdf(item.lineTotalWithVat ?? 0, sym), MR - 1,                  tY, { align: 'right' });
				} else {
					doc.text(String(rowIdx),             ML + CW.num / 2,                            tY, { align: 'center' });
					doc.text(codeLns,                    MR - CW.num - CW.img - 1,                  tY, { align: 'right' });
					doc.text(descLns,                    MR - CW.num - CW.img - CW.kod - 1,         tY, { align: 'right' });
					doc.text(String(item.quantity ?? 0), ML + CW.total + CW.price + CW.qty / 2,     tY, { align: 'center' });
					doc.text(fmtPdf(item.unitPrice ?? 0, sym),        ML + CW.total + CW.price - 1, tY, { align: 'right' });
					doc.text(fmtPdf(item.lineTotalWithVat ?? 0, sym), ML + 1,                        tY, { align: 'left' });
				}

				drawRowBox(y, rowH);
				doc.setTextColor(0, 0, 0);
				y += rowH;
			}

			// ── E) TOPLAMLAR
			y += 6;
			y = checkPage(y, 32);
			doc.setDrawColor(180, 180, 180);
			doc.line(ML + TW * 0.55, y, MR, y);
			y += 5;

			function totRowP(label: string, value: string, bold = false) {
				setFnt(bold ? 10 : 9);
				doc.setTextColor(80, 80, 80);
				if (isRtl) {
					doc.text(`${value} :${label}`, MR, y, { align: 'right' });
				} else {
					doc.text(`${label}:`, ML + TW * 0.55, y);
					doc.setTextColor(bold ? 0 : 30, bold ? 0 : 30, bold ? 0 : 30);
					doc.text(value, MR, y, { align: 'right' });
				}
				doc.setTextColor(0, 0, 0);
				y += bold ? 8 : 6;
			}

			const grossTotal    = loadedItems.reduce((s, it) => s + it.listPrice * it.quantity, 0);
			const totalDiscount = loadedItems.reduce((s, it) => s + it.listPrice * it.quantity * ((it.discountRate ?? 0) / 100), 0);
			const netSubtotalVal = grossTotal - totalDiscount;
			const vatTotal      = entity.totalVat    ?? 0;
			const grandTotal    = entity.totalWithVat ?? 0;

			totRowP(PL.subtotal,    fmtPdf(grossTotal,    sym));
			totRowP(PL.discount,    fmtPdf(-totalDiscount, sym));
			totRowP(PL.netSubtotal, fmtPdf(netSubtotalVal, sym));
			totRowP(PL.vat,         fmtPdf(vatTotal,      sym));
			y += 1;
			doc.setDrawColor(160, 160, 160);
			doc.line(ML + TW * 0.55, y, MR, y);
			y += 3;
			totRowP(PL.grandTotal,  fmtPdf(grandTotal,    sym), true);

			// ── F) TEKNİK NOTLAR
			if (entity.notes?.trim()) {
				y += 4;
				y = checkPage(y, 20);
				doc.setDrawColor(200, 200, 200);
				doc.line(ML, y, MR, y);
				y += 5;
				setFnt(8.5);
				doc.setTextColor(40, 40, 40);
				doc.text(PL.techNotes + ':', isRtl ? MR : ML, y, { align: isRtl ? 'right' : 'left' });
				y += 6;
				setFnt(8);
				doc.setTextColor(60, 60, 60);
				const noteLines = doc.splitTextToSize(entity.notes.trim(), TW);
				for (const line of noteLines) {
					y = checkPage(y, 6);
					doc.text(line, isRtl ? MR : ML, y, { align: isRtl ? 'right' : 'left' });
					y += 5;
				}
				doc.setTextColor(0, 0, 0);
			}

			// ── G) KOŞULLAR (teslimat/ödeme sol, banka sağ)
			const hasConditions = entity.deliveryType || entity.paymentType || entity.productionDuration || entity.bankAccount;
			if (hasConditions) {
				y += 4;
				y = checkPage(y, 32);
				doc.setDrawColor(200, 200, 200);
				doc.line(ML, y, MR, y);
				y += 5;
				setFnt(8.5);
				doc.setTextColor(40, 40, 40);
				doc.text(PL.conditions + ':', isRtl ? MR : ML, y, { align: isRtl ? 'right' : 'left' });
				y += 6;

				const condL = ML;
				const condR = ML + TW / 2 + 3;
				const condW = TW / 2 - 6;
				let yCL     = y;
				let yCR     = y;

				function condRow(label: string, val: string | undefined, cx: number, cy: number): number {
					if (!val) return cy;
					setFnt(8);
					const ls = doc.splitTextToSize(val, condW - 26);
					if (isRtl) {
						doc.setTextColor(100, 100, 100);
						doc.text(`${val} :${label}`, cx + condW, cy, { align: 'right' });
					} else {
						doc.setTextColor(100, 100, 100);
						doc.text(`${label}:`, cx, cy);
						doc.setTextColor(20, 20, 20);
						doc.text(ls, cx + 26, cy);
						cy += (ls.length - 1) * 4.5;
					}
					doc.setTextColor(0, 0, 0);
					return cy + 5.5;
				}

				yCL = condRow(PL.deliveryType,       entity.deliveryType,        condL, yCL);
				yCL = condRow(PL.productionDuration,  entity.productionDuration,  condL, yCL);
				yCL = condRow(PL.paymentTerms,        entity.paymentType,         condL, yCL);

				if (entity.bankAccount) {
					setFnt(8.5);
					doc.setTextColor(40, 40, 40);
					doc.text(PL.bank + ':', isRtl ? condR + condW : condR, yCR, { align: isRtl ? 'right' : 'left' });
					yCR += 6;
					setFnt(8);
					doc.setTextColor(20, 20, 20);
					const bankLines = doc.splitTextToSize(entity.bankAccount, condW);
					for (const bl of bankLines) {
						yCR = checkPage(yCR, 6);
						doc.text(bl, isRtl ? condR + condW : condR, yCR, { align: isRtl ? 'right' : 'left' });
						yCR += 5;
					}
					doc.setTextColor(0, 0, 0);
				}

				y = Math.max(yCL, yCR) + 4;
			}

			// ── H) FOOTER her sayfaya
			const totalPages = doc.getNumberOfPages();
			for (let p = 1; p <= totalPages; p++) {
				doc.setPage(p);
				drawFooter(p);
			}

			doc.save(`PROFORMA-${entity.orderNumber ?? 'DOC'}.pdf`);
		} finally {
			pdfGenerating = false;
		}
	}
</script>

<!-- ─── Loading ─────────────────────────────────────────────────────────────── -->
{#if loading}
	<div class="flex h-full items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
	</div>

{:else if customer}
	<div class="flex h-full flex-col overflow-hidden">

		<!-- ── Header ─────────────────────────────────────────────────────────── -->
		<div class="shrink-0 border-b border-[var(--hb-border)] bg-[var(--hb-panel)] px-6 py-5">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-4 min-w-0">
					<Avatar fallbackText={initials(customer.name)} size="lg" />
					<div class="min-w-0">
						<h2 class="text-xl font-bold text-white leading-tight truncate">{customer.name}</h2>
						<div class="mt-1.5 flex flex-wrap items-center gap-2">
							{#if statusConfig[customer.status]}
								{@const sc = statusConfig[customer.status]!}
								<Badge variant={sc.variant} label={sc.label} />
							{/if}
							{#if customer.city}
								<span class="text-sm text-[var(--hb-body)]">{customer.city}</span>
							{/if}
							{#if customer.contactName}
								<span class="text-sm text-[var(--hb-body)]">· {customer.contactName}</span>
							{/if}
						</div>
					</div>
				</div>

				<Button variant="icon" onclick={() => onedit?.(customerId)}>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
					</svg>
				</Button>
			</div>

			<div class="mt-4">
				<Tabs
				value={tabValue}
				tabs={TABS}
				onchange={(tab) => { onTabChange?.(tab.value); }}
			/>
			</div>
		</div>

		<!-- ── Tab content ────────────────────────────────────────────────────── -->
		<div class="flex-1 min-h-0 overflow-y-auto p-6" style="scrollbar-width: none;">

			{#if tabValue === 'info'}
				<div class="flex flex-col gap-4 max-w-2xl">

					{#snippet inforow(label: string, value: string | undefined)}
						{#if value}
							<div class="flex items-start justify-between gap-4 py-2.5">
								<dt class="text-sm text-[var(--hb-body)] shrink-0">{label}</dt>
								<dd class="text-sm font-medium text-white text-right">{value}</dd>
							</div>
						{/if}
					{/snippet}

					<!-- Genel -->
					<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">Genel</p>
						<dl class="divide-y divide-[var(--hb-border)]">
							{@render inforow('Müşteri Tip', typeLabels[customer.companyType] ?? customer.companyType)}
							{@render inforow('Müşteri Sektör', customer.source)}
							<!-- Durum — inline editable -->
							<div class="flex items-center justify-between gap-4 py-2.5">
								<dt class="text-sm text-[var(--hb-body)] shrink-0">Durum</dt>
								<dd class="flex items-center gap-2">
									{#if editingStatus}
										<select
											value={customer.status}
											disabled={statusSaving}
											onchange={(e) => updateStatus((e.target as HTMLSelectElement).value)}
											class="rounded-lg border border-[#444] bg-[#111] px-2 py-1 text-sm text-white
												[&>option]:bg-[var(--hb-list)] focus:outline-none disabled:opacity-50"
										>
											{#each STATUS_OPTIONS as opt (opt.value)}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
										{#if !statusSaving}
											<button type="button" onclick={() => (editingStatus = false)}
												class="text-xs text-[var(--hb-faint)] hover:text-[var(--hb-body)] transition-colors">İptal</button>
										{/if}
									{:else}
										{#if statusConfig[customer.status]}
											{@const sc = statusConfig[customer.status]!}
											<Badge variant={sc.variant} label={sc.label} />
										{:else}
											<span class="text-sm font-medium text-white">{customer.status}</span>
										{/if}
										<button type="button" title="Durumu değiştir"
											onclick={() => (editingStatus = true)}
											class="p-1 rounded hover:bg-[var(--hb-hover)] text-[var(--hb-faint)] hover:text-[var(--hb-body)] transition-colors">
											<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
												<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
											</svg>
										</button>
									{/if}
								</dd>
							</div>
						</dl>
					</div>

					<!-- Temel Bilgiler -->
					<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">Temel Bilgiler</p>
						<dl class="divide-y divide-[var(--hb-border)]">
							{@render inforow('Müşteri Adı', customer.name)}
							{@render inforow('Firma Yetkili', customer.contactName)}
						</dl>
					</div>

					<!-- İletişim -->
					<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">İletişim</p>
						<dl class="divide-y divide-[var(--hb-border)]">
							{@render inforow('Telefon (Mobil)', customer.phone)}
							{@render inforow('Telefon (Sabit)', customer.phoneLandline)}
							{@render inforow('E-Posta', customer.email)}
							{@render inforow('Website', customer.website)}
						</dl>
					</div>

					<!-- Adres -->
					<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">Adres</p>
						<dl class="divide-y divide-[var(--hb-border)]">
							{@render inforow('Ülke', customer.country)}
							{@render inforow('İl', customer.state)}
							{@render inforow('Şehir / İlçe', customer.city)}
							{@render inforow('Fatura Adresi', customer.address)}
							{@render inforow('Teslimat Adresi', customer.deliveryAddress)}
						</dl>
					</div>

					<!-- Sistem -->
					<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">Sistem</p>
						<dl class="divide-y divide-[var(--hb-border)]">
							{@render inforow('Vergi No', customer.taxNumber)}
							{@render inforow('Vergi Dairesi', customer.contactTitle)}
							{@render inforow('Oluşturulma', formatDate(customer.createdAt))}
						</dl>
					</div>
				</div>

			{:else if tabValue === 'notes'}
				<div class="flex flex-col gap-4 max-w-2xl">

					<!-- Yeni not formu -->
					<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
						<p class="mb-3 text-sm font-semibold text-white">Yeni Not</p>
						<div class="space-y-3">
							<input
								type="text"
								bind:value={noteForm.title}
								placeholder="Başlık (opsiyonel)"
								class="block w-full rounded-lg border border-[var(--hb-border)] bg-[var(--hb-panel)] px-3 py-2 text-sm text-white placeholder-[var(--hb-faint)] focus:border-[var(--hb-highlight)] focus:outline-none"
							/>
							<textarea
								bind:value={noteForm.content}
								rows="3"
								maxlength={500}
								placeholder="Not içeriği..."
								class="block w-full resize-none rounded-lg border px-3 py-2 text-sm text-white placeholder-[var(--hb-faint)] focus:outline-none bg-[var(--hb-panel)] {noteAttempted && !noteForm.content.trim()
									? 'border-[#ff4444]'
									: 'border-[var(--hb-border)] focus:border-[var(--hb-highlight)]'}"
							></textarea>
							<div class="flex items-center justify-between">
								{#if noteAttempted && !noteForm.content.trim()}
									<p class="text-xs text-[var(--hb-accent)]">İçerik alanı zorunludur.</p>
								{:else}
									<span></span>
								{/if}
								<span class="text-xs {noteForm.content.length >= 450 ? 'text-amber-500' : 'text-[var(--hb-faint)]'}">{noteForm.content.length}/500</span>
							</div>
							{#if noteError}
								<p class="text-xs text-[var(--hb-accent)]">{noteError}</p>
							{/if}
							<div class="flex justify-end">
								<button
									onclick={addNote}
									disabled={noteSaving}
									style={noteSaving ? 'pointer-events: none' : ''}
									class="flex items-center gap-2 rounded-full bg-[var(--hb-active)] px-5 py-2 text-sm font-bold text-white transition hover:bg-[var(--hb-hover)] disabled:opacity-50"
								>
									{#if noteSaving}
										<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
										Ekleniyor...
									{:else}
										Not Ekle
									{/if}
								</button>
							</div>
						</div>
					</div>

					<!-- Not listesi -->
					{#if notes.length === 0}
						<div class="rounded-lg border border-dashed border-[var(--hb-border)] py-10 text-center">
							<p class="text-sm text-[var(--hb-body)]">Henüz not eklenmemiş.</p>
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							{#each notes as note (note.id)}
								{@const authorName = note.author?.fullName ?? userProfileMap[note.createdBy]?.name ?? 'Kullanıcı'}
								<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-5">
									{#if note.title}
										<p class="mb-1.5 text-sm font-semibold text-white">{note.title}</p>
									{/if}
									<p class="wrap-break-word whitespace-pre-wrap overflow-hidden text-sm leading-relaxed text-[var(--hb-body)]">{note.content}</p>
									<div class="mt-3 flex items-center gap-2">
										<div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--hb-muted)] text-[10px] font-bold text-[var(--hb-body)]">
											{initials(authorName)}
										</div>
										<span class="text-xs text-[var(--hb-faint)]">
											{authorName} · {formatTs(note.createdAt)}
										</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if tabValue === 'quotes'}
				{#if showQuoteForm}
					<QuoteForm
						{customerId}
						editQuote={editingQuote}
						onClose={() => { showQuoteForm = false; editingQuote = null; }}
						onSaved={() => { showQuoteForm = false; editingQuote = null; }}
					/>
				{:else}
					<div class="max-w-2xl">
						<div class="mb-3 flex items-center justify-between gap-3">
							<div class="relative flex-1">
								<svg class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--hb-faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
								</svg>
								<input
									type="text"
									placeholder="Teklif ara…"
									bind:value={teklifArama}
									class="w-full rounded-lg border border-[var(--hb-border)] bg-[var(--hb-field)] py-1.5 pl-8 pr-3 text-sm text-white placeholder-[var(--hb-faint)] outline-none focus:border-[var(--hb-highlight)]"
								/>
							</div>
							<button
								type="button"
								onclick={() => { editingQuote = null; showQuoteForm = true; }}
								class="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--hb-active)] px-4 py-1.5 text-sm font-bold text-white transition hover:bg-[var(--hb-hover)]"
							>
								<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
								Yeni Teklif
							</button>
						</div>
						{#if quotes.length === 0}
							<div class="rounded-lg border border-dashed border-[var(--hb-border)] py-10 text-center">
								<p class="text-sm text-[var(--hb-body)]">Henüz teklif oluşturulmamış.</p>
								<button
									type="button"
									onclick={() => { editingQuote = null; showQuoteForm = true; }}
									class="mt-3 text-sm text-white underline underline-offset-2"
								>İlk teklifi oluştur</button>
							</div>
						{:else}
							{@const filteredQuotes = quotes
								.filter(q => !teklifArama.trim() || q.orderNumber.toLowerCase().includes(teklifArama.toLowerCase()))
								.slice(0, teklifArama.trim() ? undefined : 5)}
							<div class="flex flex-col gap-2">
								{#each filteredQuotes as quote (quote.id)}
									{@const qsc = statusConfig[quote.status]}
									<div class="flex items-center justify-between rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] px-5 py-4">
										<div>
											<p class="text-sm font-bold text-white">{quote.orderNumber}</p>
											<p class="text-xs text-[var(--hb-body)] mt-0.5">{formatDate(quote.createdAt)}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[var(--hb-body)]">{formatMoney(quote.totalWithVat, quote.currency)}</span>
											{#if qsc}
												<Badge variant={qsc.variant} label={qsc.label} />
											{/if}
											{#if quote.status === 'draft'}
												<button
													type="button"
													onclick={() => sendQuoteToFinance(quote)}
													disabled={actionSaving}
													style={actionSaving ? 'pointer-events: none' : ''}
													title="Siparişe Dönüştür — Finans onayına gönder"
													class="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-700 bg-violet-900/20 text-violet-400 transition hover:bg-violet-800/40 disabled:opacity-40"
												>
													<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
														<polyline points="20 6 9 17 4 12"/>
													</svg>
												</button>
											{/if}
											<button
												type="button"
												onclick={() => { editingQuote = quote; showQuoteForm = true; }}
												title="Düzenle"
												class="flex h-7 items-center rounded-lg border border-[var(--hb-border)] px-2 text-xs text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
											>Düzenle</button>
											<button
												type="button"
												onclick={() => openDetailModal('quote', quote)}
												class="flex h-7 items-center rounded-lg border border-[var(--hb-border)] px-2 text-xs text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
												title="Detay"
											>Detay</button>
											<button
												type="button"
												onclick={() => openLangModal('quote', quote)}
												class="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--hb-border)] text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
												aria-label="PDF İndir"
												title="PDF İndir"
											>
												<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
												</svg>
											</button>
											<button
												type="button"
												onclick={() => openProformaModal(quote)}
												class="flex h-7 items-center rounded-lg border border-[var(--hb-border)] px-2 text-xs text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
												title="Proforma PDF"
											>Proforma</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

			{:else if tabValue === 'orders'}
				{#if showOrderForm}
					<OrderForm
						{customerId}
						editOrder={editingOrder as EditableOrder | null}
						onClose={() => { showOrderForm = false; editingOrder = null; }}
						onSaved={() => { showOrderForm = false; editingOrder = null; }}
					/>
				{:else}
					{@const filtrelenmisOrders = siparisArama.length >= 3
						? orders.filter(o => o.orderNumber?.toLowerCase().includes(siparisArama.toLowerCase()))
						: orders.slice(0, 5)}
					<div class="max-w-2xl">
						<div class="mb-3 flex items-center justify-between gap-3">
							<span class="shrink-0 text-xs text-[var(--hb-faint)]">
								{siparisArama.length >= 3 ? 'Arama sonuçları' : 'Son 5 sipariş'}
							</span>
							<div class="relative flex-1 max-w-xs">
								<svg class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--hb-faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
								</svg>
								<input
									type="text"
									placeholder="Sipariş ara… (min. 3 karakter)"
									bind:value={siparisArama}
									class="w-full rounded-lg border border-[var(--hb-border)] bg-[var(--hb-field)] py-1.5 pl-8 pr-3 text-sm text-white placeholder-[var(--hb-faint)] outline-none focus:border-[var(--hb-highlight)]"
								/>
							</div>
						</div>
						{#if filtrelenmisOrders.length === 0}
							<div class="rounded-lg border border-dashed border-[var(--hb-border)] py-10 text-center">
								<p class="text-sm text-[var(--hb-body)]">
									{siparisArama.length >= 3 ? 'Sipariş bulunamadı.' : 'Henüz sipariş oluşturulmamış.'}
								</p>
							</div>
						{:else}
							<div class="flex flex-col gap-2">
								{#each filtrelenmisOrders as order (order.id)}
									{@const osc = statusConfig[order.status]}
									<div class="flex items-center justify-between rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] px-5 py-4">
										<div>
											<p class="text-sm font-bold text-white">{order.orderNumber}</p>
											<p class="text-xs text-[var(--hb-body)] mt-0.5">{formatDate(order.createdAt)}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[var(--hb-body)]">{formatMoney(order.totalWithVat, order.currency)}</span>
											{#if osc}
												<Badge variant={osc.variant} label={osc.label} />
											{/if}
											{#if order.status === 'in_production'}
												<button
													type="button"
													onclick={() => siparisIptalEt(order.id)}
													disabled={actionSaving}
													style={actionSaving ? 'pointer-events: none' : ''}
													title="İptal Et"
													class="flex h-7 items-center rounded-lg border border-red-900 bg-red-950/30 px-2 text-xs text-red-400 transition hover:bg-red-900/40 disabled:opacity-40"
												>İptal</button>
												<button
													type="button"
													onclick={() => { editingOrder = order; showOrderForm = true; }}
													title="Düzenle"
													class="flex h-7 items-center rounded-lg border border-[var(--hb-border)] px-2 text-xs text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
												>Düzenle</button>
											{/if}
											<button
												type="button"
												onclick={() => openDetailModal('order', order)}
												class="flex h-7 items-center rounded-lg border border-[var(--hb-border)] px-2 text-xs text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
												title="Detay"
											>Detay</button>
											<button
												type="button"
												onclick={() => openLangModal('order', order)}
												class="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--hb-border)] text-[var(--hb-body)] transition hover:border-[var(--hb-highlight)] hover:text-white"
												aria-label="PDF İndir"
												title="PDF İndir"
											>
												<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

			{:else if tabValue === 'payments'}
				<div class="flex flex-col gap-6 max-w-2xl">
					{#if orders.length === 0}
						<div class="rounded-lg border border-dashed border-[var(--hb-border)] py-10 text-center">
							<p class="text-sm text-[var(--hb-body)]">Henüz sipariş bulunmuyor</p>
						</div>
					{:else}
						<!-- 1. Özet kartları para birimi bazında -->
						{#each Object.entries(customerTotalsByCurrency) as [currency, totals] (currency)}
							{@const remaining = totals.totalDebt - totals.totalPaid}
							{@const remainingUSD = totals.totalDebtUSD - totals.totalPaidUSD}
							<div>
								<p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">{currency}</p>
								<div class="grid grid-cols-4 gap-3">
									<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-4">
										<p class="text-xs text-[var(--hb-faint)]">Toplam Borç</p>
										<p class="mt-1 text-sm font-bold text-white">{formatMoney(totals.totalDebt, currency)}</p>
										<p class="mt-1 text-[11px] text-[var(--hb-faint)]">Toplam sipariş tutarı</p>
										{#if canConvertToUSD(currency) && totals.totalDebtUSD > 0}
											<p class="mt-0.5 text-[10px] text-[#444]">{fmtUSD(totals.totalDebtUSD)}</p>
										{/if}
									</div>
									<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-4">
										<p class="text-xs text-[var(--hb-faint)]">Toplam Ödenen</p>
										<p class="mt-1 text-sm font-bold text-emerald-400">{formatMoney(totals.totalPaid, currency)}</p>
										<p class="mt-1 text-[11px] text-[var(--hb-faint)]">Yapılan ödemeler</p>
										{#if currency !== 'USD'}
											<p class="mt-0.5 text-[10px] text-[#444]">{displayUSD(totals.totalPaid, currency)}</p>
										{/if}
									</div>
									<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-4">
										<p class="text-xs text-[var(--hb-faint)]">Kalan Bakiye</p>
										<p class="mt-1 text-sm font-bold {remaining > 0 ? 'text-red-400' : remaining < 0 ? 'text-emerald-400' : 'text-[var(--hb-body)]'}">{formatMoney(Math.abs(remaining), currency)}</p>
										<p class="mt-1 text-[11px] text-[var(--hb-faint)]">{remaining > 0 ? 'Ödenmemiş bakiye' : remaining < 0 ? 'Fazla ödeme' : 'Ödemeler tamamlandı'}</p>
										{#if canConvertToUSD(currency) && Math.abs(remaining) > 0}
											<p class="mt-0.5 text-[10px] text-[#444]">{fmtUSD(toUSD(Math.abs(remaining), currency))}</p>
										{/if}
									</div>
									<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-4">
										<p class="text-xs text-[var(--hb-faint)]">USD Karşılığı</p>
										<div class="mt-2 flex flex-col gap-1.5">
											<div class="flex items-center justify-between">
												<span class="text-[10px] text-[var(--hb-faint)]">Borç</span>
												<span class="text-xs font-medium text-white">{fmtDollar(totals.totalDebtUSD)}</span>
											</div>
											<div class="flex items-center justify-between">
												<span class="text-[10px] text-[var(--hb-faint)]">Ödenen</span>
												<span class="text-xs font-medium text-emerald-400">{fmtDollar(totals.totalPaidUSD)}</span>
											</div>
											<div class="mt-0.5 flex items-center justify-between border-t border-[#222] pt-1.5">
												<span class="text-[10px] text-[var(--hb-faint)]">Kalan</span>
												<span class="text-xs font-semibold {remainingUSD > 0 ? 'text-red-400' : 'text-emerald-400'}">{fmtDollar(Math.abs(remainingUSD))}</span>
											</div>
										{#if totals.hasForex}
											{@const netEffect = totals.forexToday - totals.forexFixed}
											<div class="mt-2 border-t border-[#222] pt-2">
												<p class="mb-1.5 text-[10px] font-semibold text-[var(--hb-faint)]">Döviz Etkisi</p>
												<div class="flex items-center justify-between">
													<span class="text-[10px] text-[var(--hb-faint)]">Sabit (ödeme anı)</span>
													<span class="text-[10px] text-[var(--hb-body)]">{fmtDollar(totals.forexFixed)}</span>
												</div>
												<div class="flex items-center justify-between">
													<span class="text-[10px] text-[var(--hb-faint)]">Bugünkü değer</span>
													<span class="text-[10px] text-[var(--hb-body)]">{fmtDollar(totals.forexToday)}</span>
												</div>
												<div class="mt-0.5 flex items-center justify-between border-t border-[#1a1a1a] pt-1">
													<span class="text-[10px] text-[var(--hb-faint)]">Net etki</span>
													<span class="text-[10px] font-semibold {netEffect >= 0 ? 'text-emerald-400' : 'text-red-400'}">{netEffect >= 0 ? '+' : '-'}{fmtDollar(Math.abs(netEffect))} {netEffect >= 0 ? '▲' : '▼'}</span>
												</div>
											</div>
										{/if}
										</div>
									</div>
								</div>
							</div>
						{/each}

						<!-- 2. Sipariş bazlı liste -->
						<div>
							<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">Sipariş Bazlı</p>
							<div class="flex flex-col gap-3">
								{#each orders as order (order.id)}
									{@const paid = calcOrderPaid(order)}
									{@const remaining = calcOrderRemaining(order)}
									{@const sortedPayments = [...(order.payments ?? [])].sort((a, b) => b.paidAt - a.paidAt)}
									<div class="rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-4">
										<div class="mb-3 flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="text-sm font-bold text-white">{order.orderNumber}</span>
												<span class="text-xs text-[var(--hb-faint)]">·</span>
												<span class="text-xs text-[var(--hb-faint)]">{formatDate(order.createdAt)}</span>
											</div>
											{#if remaining === 0 && paid > 0}
												<span class="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">Ödendi</span>
											{:else if paid > 0}
												<span class="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">Kısmen</span>
											{:else}
												<span class="rounded-full bg-[#222] px-2 py-0.5 text-xs font-medium text-[var(--hb-faint)]">Ödenmedi</span>
											{/if}
										</div>
										<div class="mb-3 border-b border-[var(--hb-border)] pb-3">
											<span class="text-sm text-[var(--hb-body)]">Toplam: </span>
											<span class="text-sm font-semibold text-white">{formatMoney(order.totalWithVat, order.currency)}</span>
											{#if canConvertToUSD(order.currency)}
												<span class="ml-1 text-xs text-[#444]">({fmtUSD(toUSD(order.totalWithVat, order.currency))})</span>
											{/if}
										</div>
										{#if sortedPayments.length === 0}
											<p class="py-1 text-xs text-[var(--hb-faint)]">Henüz ödeme yapılmamış</p>
										{:else}
											<div class="mb-3 flex flex-col gap-1.5">
												{#each sortedPayments as payment (payment.id)}
													{@const pTodayUSD = toUSD(payment.amount, payment.currency)}
													{@const pFark = payment.amountUSD != null ? pTodayUSD - payment.amountUSD : null}
													<div class="flex flex-col gap-0.5">
														<div class="flex items-center gap-2 text-xs">
															<span class="font-medium text-emerald-400">+{formatMoney(payment.amount, payment.currency)}</span>
															{#if payment.currency !== 'USD'}
																<span class="text-[#444]">({displayUSD(payment.amount, payment.currency)})</span>
															{/if}
															<span class="text-[var(--hb-faint)]">·</span>
															<span class="text-[var(--hb-faint)]">{formatDate(payment.paidAt)}</span>
															{#if payment.note}
																<span class="text-[var(--hb-faint)]">·</span>
																<span class="max-w-32 truncate text-[var(--hb-faint)]">{payment.note}</span>
															{/if}
														</div>
														{#if payment.amountUSD != null && pFark != null}
															<div class="flex items-center gap-2 text-[10px]">
																<span class="text-[var(--hb-faint)]">Ödeme anı: {fmtDollar(payment.amountUSD)}</span>
																<span class="text-[#444]">·</span>
																<span class="font-medium {pFark >= 0 ? 'text-emerald-400' : 'text-red-400'}">{pFark >= 0 ? '+' : '-'}{fmtDollar(Math.abs(pFark))} {pFark >= 0 ? '▲' : '▼'}</span>
															</div>
															{#if payment.exchangeRate && pricesMap['USD']?.sell}
																<p class="text-[10px] text-[#444]">Ödeme anı kuru: 1 USD = {payment.exchangeRate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY · Bugün: {pricesMap['USD'].sell.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY</p>
															{/if}
														{/if}
													</div>
												{/each}
											</div>
										{/if}
										<div class="border-t border-[#1e1e1e] pt-2">
											{#if remaining === 0 && paid > 0}
												<span class="text-xs font-medium text-emerald-400">Kalan: {formatMoney(0, order.currency)} ✓</span>
											{:else if remaining > 0}
												<span class="text-xs text-red-400">− Kalan: {formatMoney(remaining, order.currency)}</span>
												{#if canConvertToUSD(order.currency)}
													<span class="ml-1 text-[10px] text-[#444]">({fmtUSD(toUSD(remaining, order.currency))})</span>
												{/if}
											{:else}
												<span class="text-xs text-[var(--hb-faint)]">Kalan: {formatMoney(0, order.currency)}</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- 3. Genel ödeme timeline'ı -->
						{#if allPaymentsTimeline.length > 0}
							<div>
								<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--hb-faint)]">Ödeme Geçmişi</p>
								<div class="flex flex-col gap-2 rounded-lg border border-[var(--hb-border)] bg-[var(--hb-list)] p-4">
									{#each allPaymentsTimeline as payment (payment.id)}
										{@const tlTodayUSD = toUSD(payment.amount, payment.currency)}
										{@const tlFark = payment.amountUSD != null ? tlTodayUSD - payment.amountUSD : null}
										<div class="flex flex-col gap-0.5">
											<div class="flex items-center gap-2 text-xs">
												<span class="shrink-0 font-medium text-emerald-400">+{formatMoney(payment.amount, payment.currency)}</span>
												{#if payment.currency !== 'USD'}
													<span class="shrink-0 text-[#444]">({displayUSD(payment.amount, payment.currency)})</span>
												{/if}
												<span class="text-[var(--hb-faint)]">→</span>
												<span class="shrink-0 text-[var(--hb-body)]">{payment.orderNumber}</span>
												<span class="text-[var(--hb-faint)]">·</span>
												<span class="text-[var(--hb-faint)]">{formatDate(payment.paidAt)}</span>
											</div>
											{#if payment.amountUSD != null && tlFark != null}
												<div class="flex items-center gap-2 text-[10px]">
													<span class="text-[var(--hb-faint)]">Ödeme anı: {fmtDollar(payment.amountUSD)}</span>
													<span class="text-[#444]">·</span>
													<span class="font-medium {tlFark >= 0 ? 'text-emerald-400' : 'text-red-400'}">{tlFark >= 0 ? '+' : '-'}{fmtDollar(Math.abs(tlFark))} {tlFark >= 0 ? '▲' : '▼'}</span>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- 4. Kur notu -->
						{#if Object.keys(pricesMap).length > 0}
							<p class="text-[11px] text-[#444]">
								Kurlar:{#if pricesMap['USD']} 1 USD = {pricesMap['USD'].sell.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY{/if}{#if pricesMap['EUR']} · 1 EUR = {pricesMap['EUR'].sell.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY{/if}{#if pricesMap['GBP']} · 1 GBP = {pricesMap['GBP'].sell.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRY{/if}{#if ratesUpdatedAt} · Son güncelleme: {new Date(ratesUpdatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}{/if}
							</p>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</div>

{:else}
	<div class="flex h-full items-center justify-center">
		<p class="text-sm text-[var(--hb-body)]">Müşteri bulunamadı.</p>
	</div>
{/if}

<!-- ─── Language selection modal ─────────────────────────────────────────── -->
{#if langModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="PDF dil seçimi"
		tabindex="-1"
		onclick={() => (langModalOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (langModalOpen = false)}
	>
		<div
			class="relative w-75 rounded-2xl border border-[var(--hb-border)] bg-[var(--hb-list)] p-6 shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				onclick={() => (langModalOpen = false)}
				class="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--hb-faint)] hover:bg-[var(--hb-hover)] hover:text-white transition"
				aria-label="Kapat"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>

			<h3 class="mb-5 text-center text-sm font-bold text-white">PDF Dilini Seçin</h3>

			<div class="flex flex-col gap-2">
				{#each LANGS as lang (lang.code)}
					<button
						type="button"
						disabled={pdfGenerating}
						onclick={() => generatePdf(lang.code)}
						class="flex items-center gap-3 rounded-lg border border-[var(--hb-border)] bg-[#111] px-4 py-3 text-sm font-medium text-white transition hover:border-[var(--hb-highlight)] hover:bg-[#222] disabled:opacity-50"
					>
						<span class="text-xl leading-none">{lang.flag}</span>
						<span>{lang.label}</span>
						{#if pdfGenerating}
							<span class="ml-auto h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></span>
						{/if}
					</button>
				{/each}
			</div>

			{#if pdfGenerating}
				<p class="mt-4 text-center text-xs text-[var(--hb-faint)]">PDF oluşturuluyor...</p>
			{/if}
		</div>
	</div>
{/if}

<!-- ─── Proforma dil seçim modalı ────────────────────────────────────────── -->
{#if proformaModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Proforma PDF dil seçimi"
		tabindex="-1"
		onclick={() => (proformaModalOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (proformaModalOpen = false)}
	>
		<div
			class="relative w-75 rounded-2xl border border-[var(--hb-border)] bg-[var(--hb-list)] p-6 shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				onclick={() => (proformaModalOpen = false)}
				class="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--hb-faint)] hover:bg-[var(--hb-hover)] hover:text-white transition"
				aria-label="Kapat"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>

			<h3 class="mb-5 text-center text-sm font-bold text-white">Proforma PDF Dili</h3>

			<div class="flex flex-col gap-2">
				{#each LANGS as lang (lang.code)}
					<button
						type="button"
						disabled={pdfGenerating}
						onclick={() => generateProformaPdf(lang.code)}
						class="flex items-center gap-3 rounded-lg border border-[var(--hb-border)] bg-[#111] px-4 py-3 text-sm font-medium text-white transition hover:border-[var(--hb-highlight)] hover:bg-[#222] disabled:opacity-50"
					>
						<span class="text-xl leading-none">{lang.flag}</span>
						<span>{lang.label}</span>
						{#if pdfGenerating}
							<span class="ml-auto h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></span>
						{/if}
					</button>
				{/each}
			</div>

			{#if pdfGenerating}
				<p class="mt-4 text-center text-xs text-[var(--hb-faint)]">Proforma PDF oluşturuluyor...</p>
			{/if}
		</div>
	</div>
{/if}

<!-- ─── Detail modal ─────────────────────────────────────────────────────── -->
{#if detailOpen && detailEntity}
	{@const de = detailEntity}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Detay"
		tabindex="-1"
		onclick={() => (detailOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (detailOpen = false)}
	>
		<div
			class="relative flex w-180 max-h-[80vh] flex-col rounded-2xl border border-[var(--hb-border)] bg-[var(--hb-list)] shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="shrink-0 flex items-start justify-between border-b border-[var(--hb-border)] px-6 py-4">
				<div class="shrink-0">
					<p class="text-base font-bold text-white">
						{(de as OrderRow).orderNumber}
					</p>
					<p class="text-xs text-[var(--hb-faint)] mt-0.5">
						{formatDate(de.createdAt)}{customer ? ' · ' + customer.name : ''}
					</p>
				</div>
				{#if de.companyId}
					{@const companyName = authStore.companies.find((c) => c.id === de.companyId)?.name}
					{#if companyName}
						<p class="flex-1 px-6 text-base font-semibold text-[#aaa] truncate text-center">
							{companyName.toLocaleUpperCase('tr')}
						</p>
					{/if}
				{/if}
				<div class="flex items-center gap-3 shrink-0">
					{#if statusConfig[de.status]}
						{@const sc = statusConfig[de.status]!}
						<Badge variant={sc.variant} label={sc.label} />
					{/if}
					<button
						type="button"
						onclick={() => (detailOpen = false)}
						class="flex h-7 w-7 items-center justify-center rounded-full text-[var(--hb-faint)] transition hover:bg-[var(--hb-hover)] hover:text-white"
						aria-label="Kapat"
					>
						<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="flex-1 min-h-0 overflow-y-auto p-6" style="scrollbar-width: thin;">
				{#if detailLoading}
					<div class="flex h-32 items-center justify-center">
						<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
					</div>
				{:else if detailItemsSorted.length === 0}
					<p class="py-8 text-center text-sm text-[var(--hb-faint)]">Kalem bulunamadı.</p>
				{:else}
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[var(--hb-border)] text-left">
								<th class="pb-2 pr-3 text-xs font-medium text-[var(--hb-faint)]">Ürün</th>
								<th class="pb-2 pr-3 w-16 text-xs font-medium text-[var(--hb-faint)] text-right">Miktar</th>
								<th class="pb-2 pr-3 w-28 text-xs font-medium text-[var(--hb-faint)] text-right">Birim Fiyat</th>
								<th class="pb-2 w-28 text-xs font-medium text-[var(--hb-faint)] text-right">Tutar</th>
							</tr>
						</thead>
						<tbody>
							{#each detailItemsSorted as it (it.id)}
								<tr class="border-b border-[#1e1e1e] {it.isIncludedPart ? 'opacity-60' : ''}">
									<td class="py-2 pr-3">
										<p class="{it.isIncludedPart ? 'text-[var(--hb-body)]' : 'text-white'}">{it.productName}</p>
										{#if it.isIncludedPart}
											<span class="text-[10px] text-[var(--hb-faint)]">Dahil</span>
										{/if}
									</td>
									<td class="py-2 pr-3 text-right text-[#aaa]">{it.quantity} {it.unit ?? ''}</td>
									<td class="py-2 pr-3 text-right text-[#aaa]">{formatMoney(it.unitPrice ?? 0, de.currency)}</td>
									<td class="py-2 text-right text-white">{formatMoney(it.lineTotalWithVat ?? 0, de.currency)}</td>
								</tr>
							{/each}
						</tbody>
					</table>

					<div class="mt-4 flex flex-col items-end gap-1.5 border-t border-[var(--hb-border)] pt-4">
						<div class="flex items-center gap-6">
							<span class="text-xs text-[var(--hb-faint)]">Ara Toplam</span>
							<span class="w-36 text-right text-sm text-[#aaa]">{formatMoney(de.subtotal ?? 0, de.currency)}</span>
						</div>
						<div class="flex items-center gap-6">
							<span class="text-xs text-[var(--hb-faint)]">KDV</span>
							<span class="w-36 text-right text-sm text-[#aaa]">{formatMoney(de.totalVat ?? 0, de.currency)}</span>
						</div>
						<div class="flex items-center gap-6">
							<span class="text-xs font-semibold text-[var(--hb-body)]">GENEL TOPLAM</span>
							<span class="w-36 text-right text-base font-bold text-white">{formatMoney(de.totalWithVat, de.currency)}</span>
						</div>
					</div>

					{#if de.notes?.trim()}
						<div class="mt-4 rounded-lg border border-[var(--hb-border)] bg-[#111] px-4 py-3">
							<p class="mb-1 text-xs text-[var(--hb-faint)]">Notlar</p>
							<p class="whitespace-pre-wrap text-sm text-[var(--hb-body)]">{de.notes}</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
