<script lang="ts" module>
	export interface LineItem {
		tempId: string;
		productId: string;
		productName: string;
		productSku: string;
		brandName: string;
		unit: string;
		quantity: number;
		listPrice: number;
		discountRate: number;
		vatRate: number;
		notes: string;
		isIncludedPart: boolean;
		productDetail: string;
		productCode: string;
		productSerialNo: string;
		productCategory: string;
		productFirm: string;
		descTR: string;
		descEN: string;
		descRU: string;
		descAR: string;
		descFR: string;
	}
</script>

<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	/* eslint-disable @typescript-eslint/no-unused-vars */
	import { untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SectionHead, Modal, TextArea, Select } from '$lib/components/ui';
	import QuoteItemRow from './QuoteItemRow.svelte';
	import { notoSansBase64 } from '$lib/fonts/notoSansBase64';
	import { notoSansArabicBase64 } from '$lib/fonts/notoSansArabicBase64';
	import { refreshRates } from '$lib/services/rates';

	export type EditableQuote = {
		id: string;
		createdBy: string;
		orderNumber: string;
		status: string;
		companyId?: string;
		currency?: string;
		exchangeRate?: number;
		language?: string;
		notes?: string;
		internalNotes?: string;
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
	};

	let {
		customerId,
		onClose,
		onSaved,
		editQuote = null
	}: {
		customerId: string;
		onClose: () => void;
		onSaved: () => void;
		editQuote?: EditableQuote | null;
	} = $props();

	// ─── Customer data ───────────────────────────────────────────────────────────
	let customerName        = $state('');
	let customerContact     = $state('');
	let customerPhone       = $state('');
	let customerEmail       = $state('');
	let customerAddress     = $state('');
	let customerCity        = $state('');
	let customerCountry     = $state('');

	$effect(() => {
		const cId = customerId;
		if (!cId) return;
		return db.subscribeQuery(
			{ customers: { $: { where: { id: cId } } } },
			(result) => {
				untrack(() => {
					const c = (result.data?.customers ?? [])[0] as any;
					customerName    = c?.name        ?? '';
					customerContact = c?.contactName ?? '';
					customerPhone   = c?.phone       ?? '';
					customerEmail   = c?.email       ?? '';
					customerAddress = c?.address     ?? '';
					customerCity    = c?.city        ?? '';
					customerCountry = c?.country     ?? '';
				});
			}
		);
	});

	// ─── Active companies (Grup Şirket dropdown) ─────────────────────────────────
	type CompanyRow = { id: string; name: string };
	let activeCompanies = $state<CompanyRow[]>([]);

	$effect(() => {
		return db.subscribeQuery(
			{ companies: { $: { where: { isActive: true } } } },
			(result) => {
				untrack(() => {
					activeCompanies = (result.data?.companies ?? []) as CompanyRow[];
				});
			}
		);
	});

	// ─── Company users (for task assignment) ─────────────────────────────────────
	type CompanyUser = { userId: string; fullName: string };
	let companyUsers = $state<CompanyUser[]>([]);

	$effect(() => {
		const cId = companyId;
		if (!cId) return;
		return db.subscribeQuery(
			{ userCompanies: { $: { where: { companyId: cId } }, profile: {} } },
			(result) => {
				untrack(() => {
					companyUsers = (result.data?.userCompanies ?? [])
						.filter((uc: any) => !!uc.profile)
						.map((uc: any) => ({
							userId:   String(uc.userId ?? ''),
							fullName: String((uc.profile as any)?.fullName ?? uc.userId ?? '')
						}));
				});
			}
		);
	});

	// ─── Bank accounts ───────────────────────────────────────────────────────────
	let bankalar = $state<{ id: string; name: string }[]>([]);

	$effect(() => {
		return db.subscribeQuery(
			{ bankAccounts: { $: { where: { isActive: true } } } },
			(res) => {
				untrack(() => {
					bankalar = ((res.data?.bankAccounts ?? []) as { id: string; name: string }[])
						.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
				});
			}
		);
	});

	// ─── Prices subscription ─────────────────────────────────────────────────────
	let pricesMap = $state<Record<string, { buy: number; sell: number; value: number; change: string; direction: number; updatedAt: number }>>({});

	$effect(() => {
		return db.subscribeQuery(
			{ prices: { $: { where: { key: { in: ['USD', 'EUR', 'GBP'] } } } } },
			(result) => {
				untrack(() => {
					pricesMap = Object.fromEntries(
						(result.data?.prices ?? []).map((p) => [p.key, p])
					) as typeof pricesMap;
				});
			}
		);
	});

	// ─── Auto-fill exchange rate from live prices ───────────────────────────────
	$effect(() => {
		const cur = currency;
		const pm  = pricesMap;
		untrack(() => {
			if (cur === 'TRY') {
				exchangeRate = 1;
			} else if (pm[cur]) {
				exchangeRate = pm[cur].sell;
			}
		});
	});

	// ─── Saved order tracking ─────────────────────────────────────────────────────
	let savedOrderId     = $state('');
	let savedOrderNumber = $state('');

	// ─── Task modal state ─────────────────────────────────────────────────────────
	let taskModalOpen  = $state(false);
	let taskTitle      = $state('');
	let taskDesc       = $state('');
	let taskAssignedTo = $state('');
	let taskDueDate    = $state('');
	let taskSaving     = $state(false);
	let taskError      = $state('');

	// ─── Product data ────────────────────────────────────────────────────────────
	export type ProductRaw = {
		id: string;
		name: string;
		sku: string;
		basePrice?: number;
		vatRate: number;
		unit: string;
		category?: string;
		detail?: string;
		code?: string;
		serialNo?: string;
		firm?: string;
		brandName?: string;
		diameter?: number;
		unitPrice?: number;
		isManual?: boolean;
		descTR?: string;
		descEN?: string;
		descRU?: string;
		descAR?: string;
		descFR?: string;
		updatedAt?: number;
	};

	// ─── Line items ──────────────────────────────────────────────────────────────
	function emptyItem(): LineItem {
		return {
			tempId:          crypto.randomUUID(),
			productId:       '',
			productName:     '',
			productSku:      '',
			brandName:       '',
			unit:            'Adet',
			quantity:        1,
			listPrice:       0,
			discountRate:    0,
			vatRate:         20,
			notes:           '',
			isIncludedPart:  false,
			productDetail:   '',
			productCode:     '',
			productSerialNo: '',
			productCategory: '',
			productFirm:     '',
			descTR:          '',
			descEN:          '',
			descRU:          '',
			descAR:          '',
			descFR:          ''
		};
	}

	let items = $state<LineItem[]>([emptyItem()]);

	function addItem() {
		items = [...items, emptyItem()];
	}

	function removeItem(idx: number) {
		items = items.filter((_, i) => i !== idx);
		if (items.length === 0) items = [emptyItem()];
	}

	// ─── Totals ──────────────────────────────────────────────────────────────────
	let subtotal = $derived(
		items.reduce((sum, it) => {
			return sum + it.listPrice * (1 - it.discountRate / 100) * it.quantity;
		}, 0)
	);

	let totalVat = $derived(
		items.reduce((sum, it) => {
			const up = it.listPrice * (1 - it.discountRate / 100);
			return sum + up * it.quantity * (it.vatRate / 100);
		}, 0)
	);

	let totalWithVat = $derived(subtotal + totalVat);

	function fmt(n: number): string {
		return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	// ─── Form fields ─────────────────────────────────────────────────────────────
	let currency          = $state('TRY');
	let exchangeRate      = $state<number>(1);
	// Senkron: mount anında zaten yüklüyse hemen doldur; async: effect ile yakala
	let companyId         = $state(authStore.activeCompanyId ?? authStore.companyIds[0] ?? '');

	$effect(() => {
		const cId = authStore.activeCompanyId ?? authStore.companyIds[0] ?? activeCompanies[0]?.id;
		if (!cId) return;
		untrack(() => { if (!companyId) companyId = cId; });
	});
	let deliveryType      = $state('');
	let deliveryFirm      = $state('');
	let deliveryPayment   = $state('');
	let deliveryAddress   = $state('');
	let deliveryCity      = $state('');
	let deliveryCountry   = $state('Türkiye');
	let installationType  = $state('');
	let paymentType       = $state('');
	let estimatedDate     = $state('');
	let validUntilDate    = $state('');
	let productionDuration = $state('');
	let bankAccount            = $state('');
	let internalNotes          = $state('');
	let purchaseOrderNumber    = $state('');
	let language               = $state('tr');
	let notes                  = $state('');

	// ─── Save ────────────────────────────────────────────────────────────────────
	let saving    = $state(false);
	let saveError = $state('');

	// ─── Edit mode: pre-fill + item tracking ─────────────────────────────────────
	let editItemIds     = $state<string[]>([]);
	let editItemsLoaded = $state(false);

	$effect(() => {
		const eq = editQuote;
		if (!eq) {
			untrack(() => { editItemsLoaded = false; editItemIds = []; });
			return;
		}
		untrack(() => {
			if (eq.companyId) companyId = eq.companyId;
			currency           = eq.currency            ?? 'TRY';
			exchangeRate       = eq.exchangeRate         ?? 1;
			language           = eq.language             ?? 'tr';
			deliveryType       = eq.deliveryType         ?? '';
			deliveryFirm       = eq.deliveryFirm         ?? '';
			deliveryPayment    = eq.deliveryPayment       ?? '';
			deliveryAddress    = eq.deliveryAddress       ?? '';
			deliveryCity       = eq.deliveryCity          ?? '';
			deliveryCountry    = eq.deliveryCountry       ?? 'Türkiye';
			installationType   = eq.installationType      ?? '';
			paymentType        = eq.paymentType           ?? '';
			estimatedDate      = eq.estimatedDeliveryDate
				? new Date(eq.estimatedDeliveryDate).toISOString().slice(0, 10) : '';
			validUntilDate     = eq.validUntil
				? new Date(eq.validUntil).toISOString().slice(0, 10) : '';
			productionDuration = eq.productionDuration    ?? '';
			bankAccount          = eq.bankAccount             ?? '';
			internalNotes        = eq.internalNotes           ?? '';
			purchaseOrderNumber  = eq.purchaseOrderNumber         ?? '';
			notes                = eq.notes                   ?? '';
		});
	});

	$effect(() => {
		const eq = editQuote;
		if (!eq) return;
		return db.subscribeQuery(
			{ orderItems: { $: { where: { orderId: eq.id } } } },
			(result) => {
				untrack(() => {
					if (!result.data) return;
					if (editItemsLoaded) return;
					const rawItems = ((result.data?.orderItems ?? []) as any[])
						.slice()
						.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
					editItemIds = rawItems.map((it) => String(it.id));
					items = rawItems.length > 0
						? rawItems.map((it) => ({
							tempId:          crypto.randomUUID(),
							productId:       it.productId       ?? '',
							productName:     it.productName     ?? '',
							productSku:      it.productSku      ?? '',
							brandName:       it.brandName       ?? '',
							unit:            it.unit            ?? 'Adet',
							quantity:        it.quantity        ?? 1,
							listPrice:       it.listPrice       ?? 0,
							discountRate:    it.discountRate    ?? 0,
							vatRate:         it.vatRate         ?? 20,
							notes:           it.notes           ?? '',
							isIncludedPart:  it.isIncludedPart  ?? false,
							productDetail:   it.productDetail   ?? '',
							productCode:     it.productCode     ?? '',
							productSerialNo: it.productSerialNo ?? '',
							productCategory: it.productCategory ?? '',
							productFirm:     it.productFirm     ?? '',
							descTR:          it.descTR          ?? '',
							descEN:          it.descEN          ?? '',
							descRU:          it.descRU          ?? '',
							descAR:          it.descAR          ?? '',
							descFR:          it.descFR          ?? '',
						}))
						: [emptyItem()];
					editItemsLoaded = true;
				});
			}
		);
	});

	function buildItemOps(orderId: string) {
		const ops: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const it     = items[i];
			const itemId = id();
			const up     = it.listPrice * (1 - it.discountRate / 100);
			const lt     = up * it.quantity;
			const va     = lt * it.vatRate / 100;
			ops.push(
				tx.orderItems[itemId].update({
					orderId,
					companyId,
					productId:        it.productId || undefined,
					isIncludedPart:   it.isIncludedPart,
					productName:      it.productName,
					productSku:       it.productSku || undefined,
					brandName:        it.brandName || undefined,
					unit:             it.unit,
					quantity:         it.quantity,
					listPrice:        it.listPrice,
					discountRate:     it.discountRate,
					unitPrice:        Math.round(up * 100) / 100,
					vatRate:          it.vatRate,
					vatAmount:        Math.round(va * 100) / 100,
					lineTotal:        Math.round(lt * 100) / 100,
					lineTotalWithVat: Math.round((lt + va) * 100) / 100,
					...(it.notes   && { notes:  it.notes  }),
					...(it.descTR  && { descTR: it.descTR }),
					...(it.descEN  && { descEN: it.descEN }),
					...(it.descRU  && { descRU: it.descRU }),
					...(it.descAR  && { descAR: it.descAR }),
					...(it.descFR  && { descFR: it.descFR }),
					sortOrder: i
				}),
				tx.orderItems[itemId].link({ order: orderId })
			);
			if (it.productId) ops.push(tx.orderItems[itemId].link({ product: it.productId }));
		}
		return ops;
	}

	async function saveToDb(): Promise<string | null> {
		if (saving) return null;
		saving    = true;   // ← guard'ın hemen altında, herhangi bir await'ten önce
		saveError = '';

		try { await refreshRates(); } catch { /* sessizce geç */ }

		// Güncel kuru forma yaz
		if (currency !== 'TRY' && pricesMap[currency]) {
			exchangeRate = pricesMap[currency].sell;
		}

		const userId = authStore.userId;

		// ── Validasyon ────────────────────────────────────────────────────────────
		const hatalar: string[] = [];

		if (!customerId)         hatalar.push('Müşteri seçilmedi');
		if (!currency)           hatalar.push('Para birimi seçilmedi');
		if (!language)           hatalar.push('Dil seçilmedi');
		if (!userId || !companyId) hatalar.push('Oturum veya şirket bilgisi eksik');
		if (items.length === 0)  hatalar.push('En az bir ürün eklenmeli');

		items.forEach((item, index) => {
			const n = index + 1;
			if (!item.productName.trim())
				hatalar.push(`${n}. kalemin ürün adı girilmedi`);
			if (!item.quantity || item.quantity <= 0)
				hatalar.push(`${n}. kalemin miktarı 0'dan büyük olmalı`);
			if (!item.isIncludedPart && item.listPrice <= 0)
				hatalar.push(`${n}. kalemin liste fiyatı girilmedi`);
		});

		if (hatalar.length > 0) {
			saving = false;
			alert('Lütfen eksik alanları doldurun:\n\n• ' + hatalar.join('\n• '));
			return null;
		}
		// ── / Validasyon ──────────────────────────────────────────────────────────

		const actorName = companyUsers.find((u) => u.userId === userId)?.fullName
			?? authStore.userEmail?.split('@')[0]
			?? 'Kullanıcı';

		try {
			const now = Date.now();

			// ── EDIT (UPDATE) mode ────────────────────────────────────────────────────
			if (editQuote) {
				const orderId     = editQuote.id;
				const orderNumber = editQuote.orderNumber;

				const quoteFields = {
					currency,
					exchangeRate:      currency !== 'TRY' ? exchangeRate : undefined,
					subtotal:          Math.round(subtotal * 100) / 100,
					totalVat:          Math.round(totalVat * 100) / 100,
					totalWithVat:      Math.round(totalWithVat * 100) / 100,
					language,
					...(deliveryType       && { deliveryType }),
					...(deliveryFirm       && { deliveryFirm }),
					...(deliveryPayment    && { deliveryPayment }),
					...(deliveryAddress    && { deliveryAddress }),
					...(deliveryCity       && { deliveryCity }),
					...(deliveryCountry    && { deliveryCountry }),
					...(installationType   && { installationType }),
					...(paymentType        && { paymentType }),
					...(estimatedDate      && { estimatedDeliveryDate: new Date(estimatedDate).getTime() }),
					...(validUntilDate     && { validUntil: new Date(validUntilDate).getTime() }),
					...(productionDuration && { productionDuration }),
					...(bankAccount        && { bankAccount }),
					internalNotes:        internalNotes        || undefined,
					purchaseOrderNumber:  purchaseOrderNumber  || undefined,
					notes:                notes                || undefined,
					updatedBy:            userId,
					updatedAt:            now,
				};

				const ops: any[] = [tx.orders[orderId].update(quoteFields)];

				// Delete old items, recreate with current form state
				for (const oldId of editItemIds) {
					ops.push(tx.orderItems[oldId].delete());
				}
				ops.push(...buildItemOps(orderId));

				await db.transact(ops);

				db.transact([
					tx.activityFeed[id()].merge({
						type:                'order_updated',
						companyId,
						actorId:             userId,
						actorName,
						description:         '1 sipariş güncelledi',
						relatedEntityType:   'order',
						relatedEntityId:     orderId,
						relatedEntityNumber: orderNumber,
						createdAt:           now
					})
				]).catch((err) => console.error('[QuoteForm] activityFeed error:', err));

				savedOrderId     = orderId;
				savedOrderNumber = orderNumber;
				return orderId;
			}

			// ── CREATE mode ───────────────────────────────────────────────────────────
			const orderId     = id();
			const orderNumber = `TASLAK-${Date.now()}`;

			const ops = [
				tx.orders[orderId].update({
					orderNumber,
					customerId,
					companyId,
					assignedTo:  userId,
					status:      'draft',
					currency,
					exchangeRate:      currency !== 'TRY' ? exchangeRate : undefined,
					subtotal:          Math.round(subtotal * 100) / 100,
					totalVat:          Math.round(totalVat * 100) / 100,
					totalWithVat:      Math.round(totalWithVat * 100) / 100,
					language,
					...(deliveryType       && { deliveryType }),
					...(deliveryFirm       && { deliveryFirm }),
					...(deliveryPayment    && { deliveryPayment }),
					...(deliveryAddress    && { deliveryAddress }),
					...(deliveryCity       && { deliveryCity }),
					...(deliveryCountry    && { deliveryCountry }),
					...(installationType   && { installationType }),
					...(paymentType        && { paymentType }),
					...(estimatedDate      && { estimatedDeliveryDate: new Date(estimatedDate).getTime() }),
					...(validUntilDate     && { validUntil: new Date(validUntilDate).getTime() }),
					...(productionDuration && { productionDuration }),
					...(bankAccount        && { bankAccount }),
					...(internalNotes        && { internalNotes }),
					...(purchaseOrderNumber  && { purchaseOrderNumber }),
					...(notes                && { notes }),
					createdBy: userId,
					createdAt: now
				}),
				tx.orders[orderId].link({ customer: customerId }),
				...buildItemOps(orderId)
			];

			// Auto-create tracking task
			const dueDate = new Date(now);
			dueDate.setDate(dueDate.getDate() + 7);
			dueDate.setHours(0, 0, 0, 0);
			const autoTaskId = id();
			ops.push(
				tx.tasks[autoTaskId].update({
					type:              'quote_tracking',
					title:             `Teklif Takibi — ${customerName || 'Müşteri'} — ${orderNumber}`,
					status:            'pending',
					orderId,
					assignedTo:        userId,
					companyId,
					relatedEntityType: 'order',
					relatedEntityId:   orderId,
					createdBy:         userId,
					createdAt:         now,
					dueAt:             dueDate.getTime()
				})
			);

			await db.transact(ops);

			db.transact([
				tx.activityFeed[id()].merge({
					type:                'order_created',
					companyId,
					actorId:             userId,
					actorName,
					description:         '1 teklif girdi',
					relatedEntityType:   'order',
					relatedEntityId:     orderId,
					relatedEntityNumber: orderNumber,
					createdAt:           now
				})
			]).catch((err) => console.error('[QuoteForm] activityFeed error:', err));

			savedOrderId     = orderId;
			savedOrderNumber = orderNumber;
			return orderId;
		} catch (err) {
			console.error('[QuoteForm] saveToDb error:', err);
			saveError = editQuote ? 'Teklif güncellenemedi. Lütfen tekrar deneyin.' : 'Teklif kaydedilemedi. Lütfen tekrar deneyin.';
			return null;
		} finally {
			saving = false;
		}
	}

	async function save() {
		const qid = await saveToDb();
		if (qid) onSaved();
	}

	let sendingToFinance = $state(false);

	async function sendToFinance() {
		if (!editQuote?.id || sendingToFinance) return;
		sendingToFinance = true;
		try {
			const now    = Date.now();
			const userId = authStore.userId!;
			try {
				await db.transact([
					tx.orders[editQuote.id].update({
						status: 'pending_finance'
					}),
					tx.orderStatusHistory[id()].update({
						orderId:    editQuote.id,
						fromStatus: 'draft',
						toStatus:   'pending_finance',
						changedBy:  userId,
						changedAt:  now
					})
				]);
			} catch (e) {
				console.error('[sendToFinance] Transaction detay:', JSON.stringify(e, null, 2));
				throw e;
			}
			onSaved();
		} finally {
			sendingToFinance = false;
		}
	}

	// ─── PDF ──────────────────────────────────────────────────────────────────────
	const LANGS: Record<string, Record<string, string>> = {
		tr: {
			title: 'TEKLİF', quoteNo: 'Teklif No', date: 'Tarih', validUntil: 'Geçerlilik Tarihi',
			client: 'Müşteri', contact: 'Yetkili', address: 'Adres', phone: 'Telefon', email: 'E-Posta',
			product: 'Ürün Adı', qty: 'Miktar', unit: 'Birim', unitPrice: 'Birim Fiyat',
			discount: 'İskonto', vat: 'KDV', total: 'Toplam', subtotal: 'Ara Toplam',
			grandTotal: 'GENEL TOPLAM', notes: 'Notlar', purchaseOrderNo: 'Satın Alma No',
			currency: 'Para Birimi', paymentTerms: 'Ödeme Koşulları', deliveryType: 'Teslimat Tipi',
			bank: 'Banka Bilgileri', page: 'Sayfa',
		},
		en: {
			title: 'QUOTATION', quoteNo: 'Quote No', date: 'Date', validUntil: 'Valid Until',
			client: 'Client', contact: 'Contact', address: 'Address', phone: 'Phone', email: 'Email',
			product: 'Product', qty: 'Qty', unit: 'Unit', unitPrice: 'Unit Price',
			discount: 'Discount', vat: 'VAT', total: 'Total', subtotal: 'Subtotal',
			grandTotal: 'GRAND TOTAL', notes: 'Notes', purchaseOrderNo: 'Purchase Order No',
			currency: 'Currency', paymentTerms: 'Payment Terms', deliveryType: 'Delivery Type',
			bank: 'Bank Details', page: 'Page',
		},
		ru: {
			title: 'ПРЕДЛОЖЕНИЕ', quoteNo: 'Номер предложения', date: 'Дата', validUntil: 'Действительно до',
			client: 'Клиент', contact: 'Контакт', address: 'Адрес', phone: 'Телефон', email: 'Эл. почта',
			product: 'Товар', qty: 'Кол-во', unit: 'Ед.', unitPrice: 'Цена/ед.',
			discount: 'Скидка', vat: 'НДС', total: 'Итого', subtotal: 'Промежуток',
			grandTotal: 'ОБЩИЙ ИТОГ', notes: 'Заметки', purchaseOrderNo: 'Номер заказа',
			currency: 'Валюта', paymentTerms: 'Условия оплаты', deliveryType: 'Тип доставки',
			bank: 'Банковские реквизиты', page: 'Страница',
		},
		ar: {
			title: 'عرض السعر', quoteNo: 'رقم العرض', date: 'التاريخ', validUntil: 'صالح حتى',
			client: 'العميل', contact: 'جهة الاتصال', address: 'العنوان', phone: 'الهاتف', email: 'البريد الإلكتروني',
			product: 'المنتج', qty: 'الكمية', unit: 'الوحدة', unitPrice: 'سعر الوحدة',
			discount: 'الخصم', vat: 'ضريبة', total: 'الإجمالي', subtotal: 'المجموع الفرعي',
			grandTotal: 'الإجمالي الكلي', notes: 'ملاحظات', purchaseOrderNo: 'رقم أمر الشراء',
			currency: 'العملة', paymentTerms: 'شروط الدفع', deliveryType: 'نوع التسليم',
			bank: 'تفاصيل البنك', page: 'صفحة', rtl: 'true',
		},
		fr: {
			title: 'DEVIS', quoteNo: 'N° devis', date: 'Date', validUntil: "Valable jusqu'au",
			client: 'Client', contact: 'Contact', address: 'Adresse', phone: 'Téléphone', email: 'E-mail',
			product: 'Produit', qty: 'Qté', unit: 'Unité', unitPrice: 'Prix unitaire',
			discount: 'Remise', vat: 'TVA', total: 'Total', subtotal: 'Sous-total',
			grandTotal: 'TOTAL GÉNÉRAL', notes: 'Notes', purchaseOrderNo: 'N° bon de commande',
			currency: 'Devise', paymentTerms: 'Conditions de paiement', deliveryType: 'Type de livraison',
			bank: 'Coordonnées bancaires', page: 'Page',
		},
	};

	async function downloadPdf() {
		const { jsPDF } = await import('jspdf');

		const L       = LANGS[language] ?? LANGS['tr'];
		const isRtl   = L['rtl'] === 'true';
		const currSym = currency === 'TRY' ? 'TL' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
		const localeMap: Record<string, string> = { tr: 'tr-TR', en: 'en-GB', ru: 'ru-RU', ar: 'ar-SA', fr: 'fr-FR' };
		const locale  = localeMap[language] ?? 'tr-TR';

		const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
		const W       = 210;
		const ML      = 15;
		const MR      = W - 15;
		const TW      = MR - ML;

		// ── Fonts
		doc.addFileToVFS('NotoSans.ttf', notoSansBase64);
		doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
		doc.addFileToVFS('NotoSansArabic.ttf', notoSansArabicBase64);
		doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

		function setFnt(size = 9) {
			doc.setFontSize(size);
			doc.setFont(isRtl ? 'NotoSansArabic' : 'NotoSans', 'normal');
		}
		function txt(text: string, x: number, y: number, opts?: { align?: string; maxWidth?: number }) {
			setFnt();
			doc.text(text, x, y, opts as any);
		}

		const qNum     = savedOrderNumber || 'TASLAK';
		const today    = new Date().toLocaleDateString(locale);
		const validStr = validUntilDate ? new Date(validUntilDate).toLocaleDateString(locale) : '';

		// ── Page helpers
		let pageNum   = 1;
		let totalPages = 0; // filled via two-pass approach via text placeholders

		function checkPage(y: number, needed = 12): number {
			if (y + needed > 272) {
				doc.addPage();
				pageNum++;
				setFnt();
				drawPageHeader();
				return 24;
			}
			return y;
		}

		function drawPageHeader() {
			// Thin top accent bar
			doc.setFillColor(20, 20, 20);
			doc.rect(0, 0, W, 8, 'F');
			setFnt(7);
			doc.setTextColor(160, 160, 160);
			const headerRight = isRtl
				? `${qNum} :${L['quoteNo']}`
				: `${L['quoteNo']}: ${qNum}`;
			doc.text(headerRight, isRtl ? ML : MR, 5.5, { align: isRtl ? 'left' : 'right' });
			doc.setTextColor(0, 0, 0);
		}

		function drawFooter(pn: number) {
			doc.setFillColor(240, 240, 240);
			doc.rect(0, 284, W, 13, 'F');
			setFnt(7);
			doc.setTextColor(100, 100, 100);
			doc.text(`${L['page']} ${pn}`, W / 2, 291.5, { align: 'center' });
			doc.setTextColor(0, 0, 0);
		}

		// ═══════════════════════════════════════
		// PAGE 1
		// ═══════════════════════════════════════
		drawPageHeader();

		let y = 16;

		// ── A) HEADER BLOCK
		// Title (large)
		doc.setFillColor(20, 20, 20);
		doc.rect(ML, y, TW, 14, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFont(isRtl ? 'NotoSansArabic' : 'NotoSans', 'normal');
		doc.setFontSize(16);
		doc.text(L['title'], W / 2, y + 9.5, { align: 'center' });
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
				const extra = (lines.length - 1) * 4.5;
				cy += extra;
			}
			doc.setTextColor(0, 0, 0);
			return cy + 5.5;
		}

		// Left column
		let yL = y;
		yL = metaRow(L['quoteNo'],         qNum,                  colL, yL);
		yL = metaRow(L['date'],            today,                 colL, yL);
		if (validStr)           yL = metaRow(L['validUntil'],     validStr,             colL, yL);
		if (purchaseOrderNumber) yL = metaRow(L['purchaseOrderNo'], purchaseOrderNumber, colL, yL);
		yL = metaRow(L['currency'],        `${currency} (${currSym})`, colL, yL);
		if (paymentType)        yL = metaRow(L['paymentTerms'],   paymentType,          colL, yL);
		if (deliveryType)       yL = metaRow(L['deliveryType'],   deliveryType,         colL, yL);

		// Right column
		let yR = y;
		yR = metaRow(L['client'],  customerName,    colR, yR);
		yR = metaRow(L['contact'], customerContact, colR, yR);
		if (customerAddress) yR = metaRow(L['address'], [customerAddress, customerCity, customerCountry].filter(Boolean).join(', '), colR, yR);
		if (customerPhone)   yR = metaRow(L['phone'],   customerPhone,   colR, yR);
		if (customerEmail)   yR = metaRow(L['email'],   customerEmail,   colR, yR);

		y = Math.max(yL, yR) + 4;

		// Separator
		doc.setDrawColor(200, 200, 200);
		doc.line(ML, y, MR, y);
		y += 6;

		// ── C) PRODUCTS TABLE
		// Column layout (x positions, all from left):
		// product name | qty | unit | unit price | disc% | vat% | line total
		const COL = {
			name:      ML,
			qty:       ML + 72,
			unit:      ML + 87,
			unitPrice: ML + 103,
			disc:      ML + 127,
			vat:       ML + 141,
			total:     MR,
		};

		// Header row
		doc.setFillColor(30, 30, 30);
		doc.rect(ML, y - 1, TW, 8, 'F');
		doc.setTextColor(220, 220, 220);
		setFnt(7.5);
		if (isRtl) {
			doc.text(L['product'],   MR,         y + 4.5, { align: 'right' });
			doc.text(L['qty'],       MR - 72,    y + 4.5, { align: 'right' });
			doc.text(L['unit'],      MR - 87,    y + 4.5, { align: 'right' });
			doc.text(L['unitPrice'], MR - 103,   y + 4.5, { align: 'right' });
			doc.text(L['discount'],  MR - 127,   y + 4.5, { align: 'right' });
			doc.text(L['vat'],       MR - 141,   y + 4.5, { align: 'right' });
			doc.text(L['total'],     ML,         y + 4.5, { align: 'left' });
		} else {
			doc.text(L['product'],   COL.name + 1, y + 4.5);
			doc.text(L['qty'],       COL.qty,      y + 4.5, { align: 'right' });
			doc.text(L['unit'],      COL.unit + 7, y + 4.5, { align: 'center' });
			doc.text(L['unitPrice'], COL.unitPrice + 12, y + 4.5, { align: 'right' });
			doc.text(L['discount'],  COL.disc + 7, y + 4.5, { align: 'center' });
			doc.text(L['vat'],       COL.vat + 7,  y + 4.5, { align: 'center' });
			doc.text(L['total'],     COL.total,    y + 4.5, { align: 'right' });
		}
		doc.setTextColor(0, 0, 0);
		y += 9;

		let rowAlt = false;
		const descLangKey: Record<string, keyof typeof items[0]> = {
			tr: 'descTR', en: 'descEN', ru: 'descRU', ar: 'descAR', fr: 'descFR'
		};
		const dKey = descLangKey[language] ?? 'descTR';

		for (const it of items) {
			const up  = it.listPrice * (1 - it.discountRate / 100);
			const ltv = up * it.quantity * (1 + it.vatRate / 100);

			const nameText   = (it.isIncludedPart ? '  + ' : '') + (it.productName || '—');
			const nameLines  = doc.splitTextToSize(nameText, 68);
			const descText   = (String(it[dKey] || it.descEN || it.descTR || '')).trim();
			const descLines  = descText ? doc.splitTextToSize(descText, 68) : [];
			const rowH       = Math.max(7, nameLines.length * 4.5 + (descLines.length > 0 ? descLines.length * 3.5 + 1.5 : 0) + 3);

			y = checkPage(y, rowH + 2);

			if (rowAlt) {
				doc.setFillColor(248, 248, 248);
				doc.rect(ML, y - 1, TW, rowH, 'F');
			}
			rowAlt = !rowAlt;

			setFnt(8);
			doc.setTextColor(it.isIncludedPart ? 100 : 20, it.isIncludedPart ? 100 : 20, it.isIncludedPart ? 100 : 20);

			const nameY = y + 4.5;
			if (isRtl) {
				doc.text(nameLines, MR,                 nameY, { align: 'right' });
				doc.text(String(it.quantity),           MR - 72, nameY, { align: 'right' });
				doc.text(it.unit,                       MR - 87, nameY, { align: 'right' });
				doc.text(`${fmt(up)} ${currSym}`,       MR - 103, nameY, { align: 'right' });
				if (it.discountRate > 0) doc.text(`%${it.discountRate}`, MR - 127, nameY, { align: 'right' });
				doc.text(`%${it.vatRate}`,              MR - 141, nameY, { align: 'right' });
				doc.text(`${fmt(ltv)} ${currSym}`,      ML,       nameY, { align: 'left' });
			} else {
				doc.text(nameLines, COL.name + 1, nameY);
				doc.text(String(it.quantity),           COL.qty,            nameY, { align: 'right' });
				doc.text(it.unit,                       COL.unit + 7,       nameY, { align: 'center' });
				doc.text(`${fmt(up)} ${currSym}`,       COL.unitPrice + 12, nameY, { align: 'right' });
				if (it.discountRate > 0) doc.text(`%${it.discountRate}`, COL.disc + 7, nameY, { align: 'center' });
				doc.text(`%${it.vatRate}`,              COL.vat + 7,        nameY, { align: 'center' });
				doc.text(`${fmt(ltv)} ${currSym}`,      COL.total,          nameY, { align: 'right' });
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

			// Light row separator
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

		totRow(L['subtotal'],  `${fmt(subtotal)} ${currSym}`);
		totRow(L['vat'],       `${fmt(totalVat)} ${currSym}`);
		totRow(L['grandTotal'],`${fmt(totalWithVat)} ${currSym}`, true);

		// ── E) PAYMENT & DELIVERY & BANK
		y += 4;
		const infoItems: [string, string][] = [];
		if (paymentType)  infoItems.push([L['paymentTerms'], paymentType]);
		if (deliveryType) infoItems.push([L['deliveryType'], deliveryType]);
		if (bankAccount)  infoItems.push([L['bank'],         bankAccount]);

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
		if (notes?.trim()) {
			y = checkPage(y, 18);
			doc.setDrawColor(200, 200, 200);
			doc.line(ML, y, MR, y);
			y += 5;
			setFnt(8);
			doc.setTextColor(80, 80, 80);
			doc.text(`${L['notes']}:`, ML, y);
			y += 5;
			doc.setTextColor(20, 20, 20);
			setFnt(8);
			const noteLines = doc.splitTextToSize(notes.trim(), TW);
			for (const line of noteLines) {
				y = checkPage(y, 6);
				doc.text(line, isRtl ? MR : ML, y, { align: isRtl ? 'right' : 'left' });
				y += 4.8;
			}
			doc.setTextColor(0, 0, 0);
		}

		// ── G) FOOTERS (all pages)
		const totalPagesCount = doc.getNumberOfPages();
		for (let p = 1; p <= totalPagesCount; p++) {
			doc.setPage(p);
			drawFooter(p);
		}

		doc.save(`TASLAK-${qNum}.pdf`);
	}

	// ─── Göreve Gönder ────────────────────────────────────────────────────────────
	async function openGorevModal() {
		let qid = savedOrderId;
		if (!qid) {
			qid = await saveToDb() ?? '';
			if (!qid) return;
		}
		taskTitle      = `Teklif Takibi — ${customerName} — ${savedOrderNumber}`;
		taskDesc       = '';
		taskAssignedTo = authStore.userId ?? '';
		taskDueDate    = '';
		taskError      = '';
		taskModalOpen  = true;
	}

	async function createTask() {
		const userId = authStore.userId;
		const cId    = authStore.activeCompanyId ?? companyId;
		if (!userId || !cId) { taskError = 'Oturum bilgisi eksik.'; return; }
		if (!taskTitle.trim()) { taskError = 'Başlık zorunludur.'; return; }
		if (!taskAssignedTo)   { taskError = 'Atanacak kişi seçilmeli.'; return; }

		taskSaving = true;
		taskError  = '';
		try {
			const taskId = id();
			await db.transact([
				tx.tasks[taskId].update({
					type:       'manual',
					title:      taskTitle.trim(),
					status:     'pending',
					assignedTo: taskAssignedTo,
					companyId:  cId,
					orderId:    savedOrderId || undefined,
					...(taskDesc.trim()  && { description: taskDesc.trim() }),
					...(taskDueDate      && { dueAt: new Date(taskDueDate).getTime() }),
					...(savedOrderId     && { relatedEntityType: 'order', relatedEntityId: savedOrderId }),
					createdBy:  userId,
					createdAt:  Date.now()
				})
			]);
			taskModalOpen = false;
			onSaved();
		} catch (err) {
			taskError = err instanceof Error ? err.message : 'Görev kaydedilemedi.';
		} finally {
			taskSaving = false;
		}
	}

	// ─── Options ─────────────────────────────────────────────────────────────────
	const CURRENCY_OPTS    = ['TRY', 'USD', 'EUR', 'GBP'];
	const DELIVERY_TYPES   = [
		{ value: 'warehouse_pickup', label: 'Depodan Teslim' },
		{ value: 'cargo',            label: 'Kargo'           },
		{ value: 'our_vehicle',      label: 'Kendi Aracımız'  },
		{ value: 'customer_vehicle', label: 'Müşteri Aracı'   }
	];
	const DELIVERY_FIRMS   = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'DHL', 'Fedex', 'Diğer'];
	const DELIVERY_PAYMENTS = [
		{ value: 'receiver', label: 'Alıcı Ödemeli'    },
		{ value: 'sender',   label: 'Gönderici Ödemeli' }
	];
	const INSTALLATION_TYPES = [
		{ value: 'none', label: 'Montaj Yok'   },
		{ value: 'semi', label: 'Yarı Demonte' },
		{ value: 'full', label: 'Monte'        }
	];
	const PAYMENT_TYPES = [
		{ value: 'cash',        label: 'Peşin'   },
		{ value: 'credit_30',   label: '30 Gün'  },
		{ value: 'credit_60',   label: '60 Gün'  },
		{ value: 'credit_90',   label: '90 Gün'  },
		{ value: 'installment', label: 'Taksit'  }
	];
</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- ── Header ────────────────────────────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
		<div class="flex items-center justify-between gap-3">
			<SectionHead
				title={editQuote ? `${editQuote.orderNumber} — Düzenle` : 'Yeni Teklif'}
				description={editQuote ? 'Teklif güncelleniyor' : 'Taslak olarak kaydedilecek'}
			/>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={onClose}
					class="rounded-lg px-3 py-1.5 text-sm text-[#888] transition-colors hover:bg-[#222] hover:text-white"
				>
					İptal
				</button>

				<!-- PDF İndir -->
				<button
					type="button"
					onclick={downloadPdf}
					class="flex items-center gap-1.5 rounded-full border border-[#2a2a2a] px-3 py-1.5 text-sm text-[#888] transition-colors hover:border-[#444] hover:text-white"
					title="PDF olarak indir"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
						<polyline points="7 10 12 15 17 10"/>
						<line x1="12" y1="15" x2="12" y2="3"/>
					</svg>
					PDF İndir
				</button>

				<!-- Siparişe Dönüştür (sadece draft teklifte göster) -->
				{#if editQuote && editQuote.status === 'draft'}
					<button
						type="button"
						onclick={sendToFinance}
						disabled={sendingToFinance || saving}
						style={sendingToFinance || saving ? 'pointer-events: none' : ''}
						class="flex items-center gap-1.5 rounded-full border border-violet-700 bg-violet-900/30 px-3 py-1.5 text-sm text-violet-300 transition-colors hover:bg-violet-800/40 disabled:opacity-50"
						title="Finans onayına gönder"
					>
						<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
						{sendingToFinance ? 'Gönderiliyor…' : 'Siparişe Dönüştür'}
					</button>
				{/if}

				<!-- Kaydet / Güncelle -->
				<button
					type="button"
					onclick={save}
					disabled={saving}
					style={saving ? 'pointer-events: none' : ''}
					class="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{#if saving}
						<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
						Kaydediliyor...
					{:else}
						{editQuote ? 'Güncelle' : 'Taslak Kaydet'}
					{/if}
				</button>
			</div>
		</div>
		{#if saveError}
			<p class="mt-2 rounded-lg bg-[#2a1a1a] border border-[#ff4444]/30 px-3 py-2 text-sm text-[#ff4444]">{saveError}</p>
		{/if}
	</div>

	<!-- ── Scrollable body ───────────────────────────────────────────────────────── -->
	<div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6" style="scrollbar-width: none;">

		<!-- ═══ 1. Teklif Bilgileri ════════════════════════════════════════════════ -->
		<section>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5 flex flex-col gap-5">
				<p class="text-xs font-semibold uppercase tracking-widest text-[#555]">Teklif Bilgileri</p>

				<!-- Para Birimi -->
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="qf-currency" class="mb-1 block text-xs text-[#888]">Para Birimi</label>
						<select
							id="qf-currency"
							bind:value={currency}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						>
							{#each CURRENCY_OPTS as c (c)}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</div>
					{#if currency !== 'TRY'}
						<div>
							<label for="qf-rate" class="mb-1 block text-xs text-[#888]">Kur (TRY)</label>
							<input
								id="qf-rate"
								type="number"
								bind:value={exchangeRate}
								min="0.01"
								step="0.0001"
								readonly
								class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white opacity-70 cursor-default focus:outline-none"
							/>
						</div>
					{/if}
				</div>

				<!-- Grup Şirket -->
				<div>
					<label for="qf-company" class="mb-1 block text-xs text-[#888]">Grup Şirket</label>
					<select
						id="qf-company"
						bind:value={companyId}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
					>
						{#each activeCompanies as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</div>

				<!-- Teklif Dili -->
				<div>
					<p class="mb-2 text-xs text-[#888]">Teklif Dili</p>
					<div class="flex flex-wrap gap-4">
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="tr" class="accent-white" />
							<span class="text-sm text-[#888]">Türkçe</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="en" class="accent-white" />
							<span class="text-sm text-[#888]">English</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="ru" class="accent-white" />
							<span class="text-sm text-[#888]">Русский</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="ar" class="accent-white" />
							<span class="text-sm text-[#888]">العربية</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="fr" class="accent-white" />
							<span class="text-sm text-[#888]">Français</span>
						</label>
					</div>
				</div>

		</div>
		</section>

		<!-- ═══ 2. Ürünler ══════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Ürünler</p>
			<div class="flex flex-col gap-3">
				{#each items as item, idx (item.tempId)}
					<QuoteItemRow
						bind:item={items[idx]}
						{companyId}
						onRemove={() => removeItem(idx)}
					/>
				{/each}
			</div>
			<button
				type="button"
				onclick={addItem}
				class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2a2a2a] py-3 text-sm text-[#888] transition-colors hover:border-[#444] hover:text-white"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				Ürün Ekle
			</button>
		</section>

		<!-- ═══ Teklif Notları ══════════════════════════════════════════════════════ -->
		<section>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5 flex flex-col gap-4">
				<p class="text-xs font-semibold uppercase tracking-widest text-[#555]">Teklif Notları</p>
				<div>
					<label for="qf-notes" class="mb-1 block text-xs text-[#888]">Müşteriye Görünecek Notlar</label>
					<textarea
						id="qf-notes"
						bind:value={notes}
						rows="2"
						placeholder="Müşteriye görünecek notlar..."
						class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					></textarea>
				</div>
			</div>
		</section>

		<!-- ═══ 3. Nakliye ═══════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Nakliye</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="qf-del-type" class="mb-1 block text-xs text-[#888]">Teslimat Türü</label>
						<select
							id="qf-del-type"
							bind:value={deliveryType}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						>
							<option value="">Seçin...</option>
							{#each DELIVERY_TYPES as dt (dt.value)}
								<option value={dt.value}>{dt.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="qf-del-firm" class="mb-1 block text-xs text-[#888]">Nakliye Firması</label>
						<select
							id="qf-del-firm"
							bind:value={deliveryFirm}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						>
							<option value="">Seçin...</option>
							{#each DELIVERY_FIRMS as f (f)}
								<option value={f}>{f}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="qf-del-pay" class="mb-1 block text-xs text-[#888]">Nakliye Ödeme</label>
						<select
							id="qf-del-pay"
							bind:value={deliveryPayment}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						>
							<option value="">Seçin...</option>
							{#each DELIVERY_PAYMENTS as dp (dp.value)}
								<option value={dp.value}>{dp.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="qf-install" class="mb-1 block text-xs text-[#888]">Montaj</label>
						<select
							id="qf-install"
							bind:value={installationType}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						>
							<option value="">Seçin...</option>
							{#each INSTALLATION_TYPES as inst (inst.value)}
								<option value={inst.value}>{inst.label}</option>
							{/each}
						</select>
					</div>
				</div>
				<div>
					<label for="qf-del-addr" class="mb-1 block text-xs text-[#888]">Teslimat Adresi</label>
					<textarea
						id="qf-del-addr"
						bind:value={deliveryAddress}
						rows="2"
						placeholder="Adres..."
						class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="qf-del-city" class="mb-1 block text-xs text-[#888]">Şehir</label>
						<input
							id="qf-del-city"
							type="text"
							bind:value={deliveryCity}
							placeholder="İstanbul"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
						/>
					</div>
					<div>
						<label for="qf-del-country" class="mb-1 block text-xs text-[#888]">Ülke</label>
						<input
							id="qf-del-country"
							type="text"
							bind:value={deliveryCountry}
							placeholder="Türkiye"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
						/>
					</div>
				</div>
			</div>
		</section>

		<!-- ═══ 4. Ödeme ═════════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Ödeme</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
				<div>
					<label for="qf-pay-type" class="mb-1 block text-xs text-[#888]">Ödeme Koşulları</label>
					<select
						id="qf-pay-type"
						bind:value={paymentType}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
					>
						<option value="">Seçin...</option>
						{#each PAYMENT_TYPES as pt (pt.value)}
							<option value={pt.value}>{pt.label}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="qf-est-date" class="mb-1 block text-xs text-[#888]">Tahmini Teslimat</label>
						<input
							id="qf-est-date"
							type="date"
							bind:value={estimatedDate}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						/>
					</div>
					<div>
						<label for="qf-valid-date" class="mb-1 block text-xs text-[#888]">Teklif Geçerlilik</label>
						<input
							id="qf-valid-date"
							type="date"
							bind:value={validUntilDate}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
						/>
					</div>
				</div>
				<div>
					<label for="qf-prod-dur" class="mb-1 block text-xs text-[#888]">Üretim Süresi</label>
					<input
						id="qf-prod-dur"
						type="text"
						bind:value={productionDuration}
						placeholder="Örn: 4-6 hafta"
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					/>
				</div>
			</div>
		</section>

		<!-- ═══ 5. Banka ════════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Banka</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
				<div>
					<label for="qf-bank" class="mb-1 block text-xs text-[#888]">Banka Hesabı</label>
					<select
						id="qf-bank"
						bind:value={bankAccount}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
					>
						<option value="">Seçin...</option>
						{#each bankalar as b (b.id)}
							<option value={b.name}>{b.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="qf-internal" class="mb-1 block text-xs text-[#888]">Sözleşme / İç Not</label>
					<input
						id="qf-internal"
						type="text"
						bind:value={internalNotes}
						placeholder="Sözleşme no, iç notlar..."
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					/>
				</div>
				<div>
					<label for="qf-po" class="mb-1 block text-xs text-[#888]">Satın Alma Numarası</label>
					<input
						id="qf-po"
						type="text"
						bind:value={purchaseOrderNumber}
						placeholder="PO numarası..."
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					/>
				</div>
			</div>
		</section>

		<!-- ═══ 6. Özet ══════════════════════════════════════════════════════════════ -->
		<section class="pb-4">
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Özet</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-[#888]">Ara Toplam</span>
						<span class="text-sm font-medium text-white">{fmt(subtotal)} {currency}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-[#888]">Toplam KDV</span>
						<span class="text-sm font-medium text-white">{fmt(totalVat)} {currency}</span>
					</div>
					<div class="mt-1 flex items-center justify-between border-t border-[#2a2a2a] pt-3">
						<span class="text-base font-bold text-white">Genel Toplam</span>
						<span class="text-base font-bold text-white">{fmt(totalWithVat)} {currency}</span>
					</div>
				</div>
			</div>
		</section>

	</div>
</div>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- GÖREVE GÖNDER MODAL                                                    -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
<Modal
	open={taskModalOpen}
	title="Göreve Gönder"
	width="480px"
	onclose={() => (taskModalOpen = false)}
>
	<!-- Header -->
	<div class="shrink-0 flex items-center justify-between border-b border-[#2a2a2a] px-5 py-4">
		<div>
			<h3 class="text-sm font-semibold text-white">Göreve Gönder</h3>
			{#if savedOrderNumber}
				<p class="text-xs text-indigo-400 mt-0.5">{savedOrderNumber}</p>
			{/if}
		</div>
		<button
			type="button"
			aria-label="Kapat"
			onclick={() => (taskModalOpen = false)}
			class="text-gray-500 hover:text-white transition-colors text-lg leading-none"
		>✕</button>
	</div>

	<!-- Body -->
	<div class="p-5 flex flex-col gap-4">
		{#if taskError}
			<div class="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">{taskError}</div>
		{/if}

		<!-- Başlık (auto-filled, editable) -->
		<div class="flex flex-col gap-1.5">
			<label for="task-title" class="text-xs text-[#888]">Görev Başlığı *</label>
			<input
				id="task-title"
				type="text"
				bind:value={taskTitle}
				class="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white
					placeholder-[#555] outline-none focus:border-[#444]"
			/>
		</div>

		<!-- Açıklama -->
		<TextArea
			label="Açıklama"
			bind:value={taskDesc}
			placeholder="Görev hakkında notlar..."
			rows={3}
		/>

		<!-- Atanacak Kişi -->
		<Select
			label="Atanacak Kişi *"
			bind:value={taskAssignedTo}
			placeholder="Kişi seçin"
			options={companyUsers.map((u) => ({ value: u.userId, label: u.fullName }))}
		/>

		<!-- Bitiş Tarihi -->
		<div class="flex flex-col gap-1.5">
			<label for="task-due" class="text-xs text-[#888]">Bitiş Tarihi</label>
			<input
				id="task-due"
				type="date"
				bind:value={taskDueDate}
				class="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white
					outline-none focus:border-[#444]"
			/>
		</div>
	</div>

	<!-- Footer -->
	<div class="shrink-0 flex justify-end gap-2 border-t border-[#2a2a2a] px-5 py-3">
		<button
			type="button"
			onclick={() => (taskModalOpen = false)}
			class="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-gray-400
				hover:bg-[#1a1a1a] hover:text-white transition-colors"
		>İptal</button>
		<button
			type="button"
			onclick={createTask}
			disabled={taskSaving}
			style={taskSaving ? 'pointer-events: none' : ''}
			class="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium
				hover:bg-indigo-500 transition-colors disabled:opacity-50"
		>{taskSaving ? 'Kaydediliyor…' : 'Görevi Oluştur'}</button>
	</div>
</Modal>
