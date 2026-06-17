<script lang="ts">
	import { untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SectionHead } from '$lib/components/ui';
	import QuoteItemRow from './QuoteItemRow.svelte';
	import type { LineItem } from './QuoteForm.svelte';

	export type EditableOrder = {
		id: string;
		createdBy: string;
		orderNumber: string;
		status: string;
		companyId?: string;
		currency: string;
		exchangeRate?: number;
		notes?: string;
		deliveryType?: string;
		deliveryAddress?: string;
		deliveryCity?: string;
		deliveryCountry?: string;
		paymentType?: string;
	};

	let {
		customerId,
		onClose,
		onSaved,
		editOrder = null
	}: {
		customerId: string;
		onClose: () => void;
		onSaved: () => void;
		editOrder?: EditableOrder | null;
	} = $props();

	const isOwner = $derived(!editOrder || editOrder.createdBy === authStore.userId);

	// ─── Active companies ────────────────────────────────────────────────────────
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

	// ─── Form fields ─────────────────────────────────────────────────────────────
	let companyId    = $state(authStore.activeCompanyId ?? authStore.companyIds[0] ?? '');

	$effect(() => {
		const cId = authStore.activeCompanyId ?? authStore.companyIds[0] ?? activeCompanies[0]?.id;
		if (!cId) return;
		untrack(() => { if (!companyId) companyId = cId; });
	});
	let currency     = $state('TRY');
	let exchangeRate = $state(1);
	let deliveryType    = $state('');
	let deliveryAddress = $state('');
	let deliveryCity    = $state('');
	let deliveryCountry = $state('Türkiye');
	let paymentType     = $state('');
	let notes           = $state('');

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

	function addItem()            { items = [...items, emptyItem()]; }
	function removeItem(idx: number) {
		items = items.filter((_, i) => i !== idx);
		if (items.length === 0) items = [emptyItem()];
	}

	// ─── Totals ──────────────────────────────────────────────────────────────────
	const subtotal     = $derived(items.reduce((s, it) => s + it.listPrice * (1 - it.discountRate / 100) * it.quantity, 0));
	const totalVat     = $derived(items.reduce((s, it) => { const up = it.listPrice * (1 - it.discountRate / 100); return s + up * it.quantity * (it.vatRate / 100); }, 0));
	const totalWithVat = $derived(subtotal + totalVat);

	function fmt(n: number) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

	// ─── Edit mode: pre-fill + item tracking ─────────────────────────────────────
	let editItemIds     = $state<string[]>([]);
	let editItemsLoaded = $state(false);

	$effect(() => {
		const eo = editOrder;
		if (!eo) { untrack(() => { editItemsLoaded = false; editItemIds = []; }); return; }
		untrack(() => {
			if (eo.companyId)   companyId    = eo.companyId;
			currency        = eo.currency       ?? 'TRY';
			exchangeRate    = eo.exchangeRate    ?? 1;
			deliveryType    = eo.deliveryType    ?? '';
			deliveryAddress = eo.deliveryAddress ?? '';
			deliveryCity    = eo.deliveryCity    ?? '';
			deliveryCountry = eo.deliveryCountry ?? 'Türkiye';
			paymentType     = eo.paymentType     ?? '';
			notes           = eo.notes           ?? '';
		});
	});

	$effect(() => {
		const eo = editOrder;
		if (!eo) return;
		return db.subscribeQuery(
			{ orderItems: { $: { where: { orderId: eo.id } } } },
			(result) => {
				untrack(() => {
					if (!result.data) return;
					if (editItemsLoaded) return;
					const raw = ((result.data?.orderItems ?? []) as any[])
						.slice()
						.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
					editItemIds = raw.map((it) => String(it.id));
					items = raw.length > 0
						? raw.map((it) => ({
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
							productDetail:   '',
							productCode:     '',
							productSerialNo: '',
							productCategory: it.productCategory ?? '',
							productFirm:     it.brandName       ?? '',
							descTR:          it.descTR          ?? '',
							descEN:          it.descEN          ?? '',
							descRU:          it.descRU          ?? '',
							descAR:          it.descAR          ?? '',
							descFR:          it.descFR          ?? ''
						}))
						: [emptyItem()];
					editItemsLoaded = true;
				});
			}
		);
	});

	// ─── Build order item ops ─────────────────────────────────────────────────────
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
					productSku:       it.productSku  || undefined,
					brandName:        it.brandName   || undefined,
					unit:             it.unit,
					quantity:         it.quantity,
					listPrice:        it.listPrice,
					discountRate:     it.discountRate,
					unitPrice:        Math.round(up * 100) / 100,
					vatRate:          it.vatRate,
					vatAmount:        Math.round(va * 100) / 100,
					lineTotal:        Math.round(lt * 100) / 100,
					lineTotalWithVat: Math.round((lt + va) * 100) / 100,
					...(it.notes  && { notes:  it.notes  }),
					...(it.descTR && { descTR: it.descTR }),
					...(it.descEN && { descEN: it.descEN }),
					...(it.descRU && { descRU: it.descRU }),
					...(it.descAR && { descAR: it.descAR }),
					...(it.descFR && { descFR: it.descFR }),
					sortOrder: i
				})
			);
		}
		return ops;
	}

	// ─── Save ────────────────────────────────────────────────────────────────────
	let saving    = $state(false);
	let saveError = $state('');

	async function save() {
		if (!editOrder) return;
		const userId = authStore.userId;
		if (!userId || !companyId) { saveError = 'Oturum veya şirket bilgisi eksik.'; return; }
		if (!isOwner)              { saveError = 'Bu siparişi düzenleme yetkiniz yok.'; return; }
		if (items.some((it) => !it.productName.trim())) { saveError = 'Tüm satırlarda ürün adı girilmeli.'; return; }

		saving    = true;
		saveError = '';
		try {
			const now     = Date.now();
			const orderId = editOrder.id;

			// ── DIAGNOSTIC ───────────────────────────────────────────────────────────
			console.log('editItemIds:', $state.snapshot(editItemIds), 'items count:', items.length);

			// 1) full orders.update alone
			try {
				await db.transact([tx.orders[orderId].update({
					currency, exchangeRate: currency !== 'TRY' ? exchangeRate : undefined,
					subtotal: Math.round(subtotal * 100) / 100,
					totalVat: Math.round(totalVat * 100) / 100,
					totalWithVat: Math.round(totalWithVat * 100) / 100,
					...(deliveryType    && { deliveryType }),
					...(deliveryAddress && { deliveryAddress }),
					...(deliveryCity    && { deliveryCity }),
					...(deliveryCountry && { deliveryCountry }),
					...(paymentType     && { paymentType }),
					notes: notes || undefined, updatedBy: userId, updatedAt: now,
				})]);
				console.log('✓ orders.update OK');
			} catch (e: unknown) { console.error('✗ orders.update FAILED:', JSON.stringify(e, Object.getOwnPropertyNames(e as object))); }

			// 2) delete old items alone
			if (editItemIds.length > 0) {
				try {
					await db.transact(editItemIds.map((oid) => tx.orderItems[oid].delete()));
					console.log('✓ delete OK, count:', editItemIds.length);
				} catch (e: unknown) { console.error('✗ delete FAILED:', JSON.stringify(e, Object.getOwnPropertyNames(e as object))); }
			} else { console.log('delete: editItemIds empty'); }

			// 3) create new items alone
			try {
				await db.transact(buildItemOps(orderId));
				console.log('✓ create items OK');
			} catch (e: unknown) { console.error('✗ create items FAILED:', JSON.stringify(e, Object.getOwnPropertyNames(e as object))); }

			saving = false; return;
			// ── END DIAGNOSTIC ───────────────────────────────────────────────────────

			const ops: any[] = [
				tx.orders[orderId].update({
					currency,
					exchangeRate:    currency !== 'TRY' ? exchangeRate : undefined,
					subtotal:        Math.round(subtotal * 100) / 100,
					totalVat:        Math.round(totalVat * 100) / 100,
					totalWithVat:    Math.round(totalWithVat * 100) / 100,
					...(deliveryType    && { deliveryType }),
					...(deliveryAddress && { deliveryAddress }),
					...(deliveryCity    && { deliveryCity }),
					...(deliveryCountry && { deliveryCountry }),
					...(paymentType     && { paymentType }),
					notes:      notes    || undefined,
					updatedBy:  userId,
					updatedAt:  now,
				})
			];

			for (const oldId of editItemIds) ops.push(tx.orderItems[oldId].delete());
			ops.push(...buildItemOps(orderId));

			await db.transact(ops);

			db.transact([
				tx.activityFeed[id()].merge({
					type:                'order_updated',
					companyId,
					actorId:             userId,
					actorName:           authStore.userEmail?.split('@')[0] ?? 'Kullanıcı',
					description:         '1 sipariş güncelledi',
					relatedEntityType:   'order',
					relatedEntityId:     orderId,
					relatedEntityNumber: editOrder.orderNumber,
					createdAt:           now
				})
			]).catch((err) => console.error('[OrderForm] activityFeed error:', err));

			onSaved();
		} catch (err) {
			console.error('[OrderForm] save error:', err);
			saveError = 'Sipariş güncellenemedi. Lütfen tekrar deneyin.';
		} finally {
			saving = false;
		}
	}

	// ─── Options ─────────────────────────────────────────────────────────────────
	const CURRENCY_OPTS  = ['TRY', 'USD', 'EUR', 'GBP'];
	const DELIVERY_TYPES = [
		{ value: 'warehouse_pickup', label: 'Depodan Teslim' },
		{ value: 'cargo',            label: 'Kargo'           },
		{ value: 'our_vehicle',      label: 'Kendi Aracımız'  },
		{ value: 'customer_vehicle', label: 'Müşteri Aracı'   }
	];
	const PAYMENT_TYPES = [
		{ value: 'cash',        label: 'Peşin'  },
		{ value: 'credit_30',   label: '30 Gün' },
		{ value: 'credit_60',   label: '60 Gün' },
		{ value: 'credit_90',   label: '90 Gün' },
		{ value: 'installment', label: 'Taksit' }
	];
</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- ── Header ──────────────────────────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
		<div class="flex items-center justify-between gap-3">
			<SectionHead
				title={editOrder ? `${editOrder.orderNumber} — Düzenle` : 'Sipariş'}
				description={isOwner ? 'Sipariş güncelleniyor' : 'Bu sipariş size ait değil'}
			/>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={onClose}
					class="rounded-lg px-3 py-1.5 text-sm text-[#888] transition-colors hover:bg-[#222] hover:text-white"
				>
					İptal
				</button>
				<button
					type="button"
					onclick={save}
					disabled={saving || !isOwner}
					style={saving ? 'pointer-events: none' : ''}
					title={!isOwner ? 'Bu siparişi düzenleme yetkiniz yok' : undefined}
					class="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{#if saving}
						<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
						Kaydediliyor...
					{:else}
						Güncelle
					{/if}
				</button>
			</div>
		</div>
		{#if saveError}
			<p class="mt-2 rounded-lg bg-[#2a1a1a] border border-[#ff4444]/30 px-3 py-2 text-sm text-[#ff4444]">{saveError}</p>
		{/if}
		{#if editOrder && !isOwner}
			<p class="mt-2 rounded-lg px-3 py-2 text-xs text-amber-500 bg-amber-950/20 border border-amber-900/30">
				Bu sipariş başka bir personele ait — yalnızca görüntüleyebilirsiniz.
			</p>
		{/if}
	</div>

	<!-- ── Scrollable body ─────────────────────────────────────────────────────── -->
	<div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6" style="scrollbar-width: none;">

		<!-- ═══ Ürünler ═════════════════════════════════════════════════════════════ -->
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

		<!-- ═══ Sipariş Detayları ════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Sipariş Detayları</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="of-currency" class="mb-1 block text-xs text-[#888]">Para Birimi</label>
						<select
							id="of-currency"
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
							<label for="of-rate" class="mb-1 block text-xs text-[#888]">Kur (TRY)</label>
							<input
								id="of-rate"
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
					<label for="of-payment" class="mb-1 block text-xs text-[#888]">Ödeme Koşulları</label>
					<select
						id="of-payment"
						bind:value={paymentType}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
					>
						<option value="">Seçin...</option>
						{#each PAYMENT_TYPES as pt (pt.value)}
							<option value={pt.value}>{pt.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="of-notes" class="mb-1 block text-xs text-[#888]">Notlar</label>
					<textarea
						id="of-notes"
						bind:value={notes}
						rows="2"
						placeholder="Siparişe ilişkin notlar..."
						class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					></textarea>
				</div>
			</div>
		</section>

		<!-- ═══ Nakliye ══════════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Nakliye</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
				<div>
					<label for="of-del-type" class="mb-1 block text-xs text-[#888]">Teslimat Türü</label>
					<select
						id="of-del-type"
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
					<label for="of-del-addr" class="mb-1 block text-xs text-[#888]">Teslimat Adresi</label>
					<textarea
						id="of-del-addr"
						bind:value={deliveryAddress}
						rows="2"
						placeholder="Adres..."
						class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
					></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="of-del-city" class="mb-1 block text-xs text-[#888]">Şehir</label>
						<input
							id="of-del-city"
							type="text"
							bind:value={deliveryCity}
							placeholder="İstanbul"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
						/>
					</div>
					<div>
						<label for="of-del-country" class="mb-1 block text-xs text-[#888]">Ülke</label>
						<input
							id="of-del-country"
							type="text"
							bind:value={deliveryCountry}
							placeholder="Türkiye"
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
						/>
					</div>
				</div>
			</div>
		</section>

		<!-- ═══ Toplam ═══════════════════════════════════════════════════════════════ -->
		<section>
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Toplam</p>
			<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
				<div class="flex flex-col gap-1.5 text-sm">
					<div class="flex justify-between text-[#888]">
						<span>Ara Toplam</span>
						<span>{fmt(subtotal)} {currency}</span>
					</div>
					<div class="flex justify-between text-[#888]">
						<span>KDV</span>
						<span>{fmt(totalVat)} {currency}</span>
					</div>
					<div class="mt-1 flex justify-between border-t border-[#2a2a2a] pt-2 font-semibold text-white">
						<span>Genel Toplam</span>
						<span>{fmt(totalWithVat)} {currency}</span>
					</div>
				</div>
			</div>
		</section>

	</div>
</div>
