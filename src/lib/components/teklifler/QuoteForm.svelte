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
	}
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SectionHead, Modal, TextArea, Select } from '$lib/components/ui';
	import QuoteItemRow from './QuoteItemRow.svelte';

	let {
		customerId,
		onClose,
		onSaved
	}: {
		customerId: string;
		onClose: () => void;
		onSaved: () => void;
	} = $props();

	// ─── Customer name ───────────────────────────────────────────────────────────
	let customerName = $state('');

	$effect(() => {
		const cId = customerId;
		if (!cId) return;
		return db.subscribeQuery(
			{ customers: { $: { where: { id: cId } } } },
			(result) => {
				untrack(() => {
					const c = (result.data?.customers ?? [])[0] as any;
					customerName = c?.name ?? '';
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

	// ─── Saved quote tracking ─────────────────────────────────────────────────────
	let savedQuoteId     = $state('');
	let savedQuoteNumber = $state('');

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
		diameter?: number;
		unitPrice?: number;
		isManual?: boolean;
	};

	let allProducts = $state<ProductRaw[]>([]);

	onMount(() => {
		return db.subscribeQuery(
			{ products: { $: { where: { status: 'active' } } } },
			(result) => {
				untrack(() => {
					allProducts = (result.data?.products ?? []) as ProductRaw[];
				});
			}
		);
	});

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
			productFirm:     ''
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
	let companyId         = $state(authStore.activeCompanyId ?? authStore.companyIds[0] ?? '');
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
	let bankAccount       = $state('');
	let internalNotes     = $state('');
	let language          = $state('tr');
	let notes             = $state('');

	// ─── Save ────────────────────────────────────────────────────────────────────
	let saving    = $state(false);
	let saveError = $state('');

	async function saveToDb(): Promise<string | null> {
		const userId = authStore.userId;
		if (!userId || !companyId) { saveError = 'Oturum veya şirket bilgisi eksik.'; return null; }
		if (items.some((it) => !it.productName.trim())) { saveError = 'Tüm satırlarda ürün adı girilmeli.'; return null; }

		saving    = true;
		saveError = '';

		try {
			const quoteId     = id();
			const quoteNumber = `TASLAK-${Date.now()}`;
			const now         = Date.now();

			const ops = [
				tx.quotes[quoteId].update({
					quoteNumber,
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
					...(internalNotes      && { internalNotes }),
					...(notes              && { notes }),
					createdBy: userId,
					createdAt: now
				}),
				tx.quotes[quoteId].link({ customer: customerId })
			];

			console.log('[QuoteForm] writing quoteItems:', items.map(it => ({ ...it })));

			for (let i = 0; i < items.length; i++) {
				const it     = items[i];
				const itemId = id();
				const up     = it.listPrice * (1 - it.discountRate / 100);
				const lt     = up * it.quantity;
				const va     = lt * it.vatRate / 100;

				ops.push(
					tx.quoteItems[itemId].update({
						quoteId,
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
						...(it.notes && { notes: it.notes }),
						sortOrder: i
					}),
					tx.quoteItems[itemId].link({ quote: quoteId })
				);
				if (it.productId) {
					ops.push(tx.quoteItems[itemId].link({ product: it.productId }));
				}
			}

			// Auto-create quote tracking task (same atomic transaction)
			const autoTaskId = id();
			ops.push(
				tx.tasks[autoTaskId].update({
					type:              'quote_tracking',
					title:             `Teklif Takibi — ${customerName || 'Müşteri'} — ${quoteNumber}`,
					status:            'pending',
					quoteId,
					assignedTo:        userId,
					companyId,
					relatedEntityType: 'quote',
					relatedEntityId:   quoteId,
					createdBy:         userId,
					createdAt:         now,
					dueAt:             now + 7 * 24 * 60 * 60 * 1000
				})
			);

			// Activity feed kaydı
			const actorName   = companyUsers.find((u) => u.userId === userId)?.fullName
				?? authStore.userEmail?.split('@')[0]
				?? 'Kullanıcı';
			const actFeedId = id();
			ops.push(
				tx.activityFeed[actFeedId].update({
					type:                'quote_created',
					companyId,
					actorId:             userId,
					actorName,
					description:         '1 teklif girdi',
					relatedEntityType:   'quote',
					relatedEntityId:     quoteId,
					relatedEntityNumber: quoteNumber,
					createdAt:           now
				})
			);

			console.log('[QuoteForm] saveToDb:', { opsCount: ops.length, quoteId, autoTaskId, customerName });
			await db.transact(ops);
			console.log('[QuoteForm] saveToDb OK:', quoteId);
			savedQuoteId     = quoteId;
			savedQuoteNumber = quoteNumber;
			return quoteId;
		} catch {
			saveError = 'Teklif kaydedilemedi. Lütfen tekrar deneyin.';
			return null;
		} finally {
			saving = false;
		}
	}

	async function save() {
		const qid = await saveToDb();
		if (qid) onSaved();
	}

	// ─── PDF ──────────────────────────────────────────────────────────────────────
	// Turkish char normalizer for jsPDF standard fonts (helvetica is Latin-1 only)
	function normTR(s: string): string {
		return s
			.replace(/ğ/g,'g').replace(/Ğ/g,'G').replace(/ş/g,'s').replace(/Ş/g,'S')
			.replace(/ı/g,'i').replace(/İ/g,'I').replace(/ç/g,'c').replace(/Ç/g,'C')
			.replace(/ö/g,'o').replace(/Ö/g,'O').replace(/ü/g,'u').replace(/Ü/g,'U');
	}

	async function downloadPdf() {
		const { jsPDF } = await import('jspdf');
		const currSym = currency === 'TRY' ? 'TL' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
		const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

		const today = new Date().toLocaleDateString('tr-TR');
		const qNum  = savedQuoteNumber || 'TASLAK';
		const cName = normTR(customerName || 'Musteri');

		// ── Header ────────────────────────────────────────────────
		doc.setFontSize(20);
		doc.setFont('helvetica', 'bold');
		doc.text('TEKLIF', 105, 18, { align: 'center' });

		doc.setFontSize(9);
		doc.setFont('helvetica', 'normal');
		doc.text(`Teklif No : ${normTR(qNum)}`, 20, 30);
		doc.text(`Tarih     : ${today}`,          20, 36);
		doc.text(`Musteri   : ${cName}`,           20, 42);

		doc.setDrawColor(120, 120, 120);
		doc.line(20, 47, 190, 47);

		// ── Column headers ────────────────────────────────────────
		let y = 54;
		doc.setFillColor(40, 40, 40);
		doc.rect(20, y - 5, 170, 7, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(8);
		doc.setFont('helvetica', 'bold');
		doc.text('Urun Adi',    22,  y);
		doc.text('Miktar',      108, y);
		doc.text('Birim Fiyat', 150, y, { align: 'right' });
		doc.text('Toplam',      188, y, { align: 'right' });

		y += 5;
		doc.setTextColor(0, 0, 0);
		doc.setFont('helvetica', 'normal');

		// ── Item rows ─────────────────────────────────────────────
		let rowAlt = false;
		for (const it of items) {
			const up  = it.listPrice * (1 - it.discountRate / 100);
			const lt  = up * it.quantity;
			const ltv = lt * (1 + it.vatRate / 100);

			if (rowAlt) {
				doc.setFillColor(246, 246, 246);
				doc.rect(20, y, 170, 7, 'F');
			}
			rowAlt = !rowAlt;

			const pname = normTR(it.productName || '—');
			const truncated = pname.length > 45 ? pname.slice(0, 43) + '..' : pname;
			const prefix = it.isIncludedPart ? '+ ' : '';

			doc.setFontSize(8);
			doc.text(`${prefix}${truncated}`, 22, y + 5);
			doc.text(`${it.quantity} ${normTR(it.unit)}`, 108, y + 5);
			doc.text(`${fmt(up)} ${currSym}`,  150, y + 5, { align: 'right' });
			doc.text(`${fmt(ltv)} ${currSym}`, 188, y + 5, { align: 'right' });

			y += 8;
			if (y > 262) { doc.addPage(); y = 20; }
		}

		// ── Totals ────────────────────────────────────────────────
		y += 3;
		doc.setDrawColor(180, 180, 180);
		doc.line(120, y, 190, y);
		y += 6;

		doc.setFontSize(9);
		doc.text('Ara Toplam :', 130, y);
		doc.text(`${fmt(subtotal)} ${currSym}`,      188, y, { align: 'right' });
		y += 6;
		doc.text('KDV :', 130, y);
		doc.text(`${fmt(totalVat)} ${currSym}`,       188, y, { align: 'right' });
		y += 8;
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(10);
		doc.text('GENEL TOPLAM :', 130, y);
		doc.text(`${fmt(totalWithVat)} ${currSym}`, 188, y, { align: 'right' });

		doc.save(`teklif-${normTR(qNum)}.pdf`);
	}

	// ─── Göreve Gönder ────────────────────────────────────────────────────────────
	async function openGorevModal() {
		let qid = savedQuoteId;
		if (!qid) {
			qid = await saveToDb() ?? '';
			if (!qid) return;
		}
		taskTitle      = `Teklif Takibi — ${customerName} — ${savedQuoteNumber}`;
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
					quoteId:    savedQuoteId || undefined,
					...(taskDesc.trim()  && { description: taskDesc.trim() }),
					...(taskDueDate      && { dueAt: new Date(taskDueDate).getTime() }),
					...(savedQuoteId     && { relatedEntityType: 'quote', relatedEntityId: savedQuoteId }),
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
	const BANK_ACCOUNTS = [
		'Ziraat TL — Euromak',
		'Ziraat USD — Euromak',
		'Ziraat EUR — Euromak',
		'Ziraat TL — Hilal Fırça',
		'Ziraat TL — Mix7',
		'Diğer'
	];
</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- ── Header ────────────────────────────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
		<div class="flex items-center justify-between gap-3">
			<SectionHead title="Yeni Teklif" description="Taslak olarak kaydedilecek" />
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

				<!-- Göreve Gönder -->
				<button
					type="button"
					onclick={openGorevModal}
					disabled={saving}
					class="flex items-center gap-1.5 rounded-full border border-indigo-700 bg-indigo-900/30 px-3 py-1.5 text-sm text-indigo-300 transition-colors hover:bg-indigo-800/40 disabled:opacity-50"
					title="Göreve gönder"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
					</svg>
					Göreve Gönder
				</button>

				<!-- Taslak Kaydet -->
				<button
					type="button"
					onclick={save}
					disabled={saving}
					class="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition hover:bg-[#e0e0e0] disabled:opacity-50"
				>
					{#if saving}
						<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
						Kaydediliyor...
					{:else}
						Taslak Kaydet
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

		<!-- ═══ 1. Ürünler ══════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Ürünler</p>
			<div class="flex flex-col gap-3">
				{#each items as item, idx (item.tempId)}
					<QuoteItemRow
						bind:item={items[idx]}
						allProducts={allProducts}
						companyId={companyId}
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

		<!-- ═══ 2. Teklif Detayları ═════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Teklif Detayları</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
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
								class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
							/>
						</div>
					{/if}
				</div>
				<div>
					<label for="qf-company" class="mb-1 block text-xs text-[#888]">Grup Şirket</label>
					<select
						id="qf-company"
						bind:value={companyId}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
					>
						{#each authStore.companies as c (c.id)}
							<option value={c.id}>{c.name}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="qf-notes" class="mb-1 block text-xs text-[#888]">Genel Notlar</label>
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

		<!-- ═══ 5. Banka & Dil ═══════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Banka & Dil</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
				<div>
					<label for="qf-bank" class="mb-1 block text-xs text-[#888]">Banka Hesabı</label>
					<select
						id="qf-bank"
						bind:value={bankAccount}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
					>
						<option value="">Seçin...</option>
						{#each BANK_ACCOUNTS as b (b)}
							<option value={b}>{b}</option>
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
					<p class="mb-1 text-xs text-[#888]">Teklif Dili</p>
					<div class="flex gap-3">
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="tr" class="accent-white" />
							<span class="text-sm text-[#888]">Türkçe</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" bind:group={language} value="en" class="accent-white" />
							<span class="text-sm text-[#888]">İngilizce</span>
						</label>
					</div>
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
			{#if savedQuoteNumber}
				<p class="text-xs text-indigo-400 mt-0.5">{savedQuoteNumber}</p>
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
			class="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium
				hover:bg-indigo-500 transition-colors disabled:opacity-50"
		>{taskSaving ? 'Kaydediliyor…' : 'Görevi Oluştur'}</button>
	</div>
</Modal>
