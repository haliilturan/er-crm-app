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
	}
</script>

<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SectionHead } from '$lib/components/ui';
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

	// ─── Product data ────────────────────────────────────────────────────────────
	type ProductRaw = {
		id: string;
		name: string;
		sku: string;
		basePrice?: number;
		vatRate: number;
		unit: string;
		brand?: { id: string; name: string };
	};

	let allProducts = $state<ProductRaw[]>([]);

	type GroupedProduct = {
		brandName: string;
		products: Array<{
			id: string;
			name: string;
			sku: string;
			basePrice: number;
			vatRate: number;
			unit: string;
		}>;
	};

	let productGroups = $derived.by<GroupedProduct[]>(() => {
		const map = new SvelteMap<string, GroupedProduct>();
		for (const p of allProducts) {
			const bn = p.brand?.name ?? 'Markasız';
			if (!map.has(bn)) map.set(bn, { brandName: bn, products: [] });
			map.get(bn)!.products.push({
				id:        p.id,
				name:      p.name,
				sku:       p.sku,
				basePrice: p.basePrice ?? 0,
				vatRate:   p.vatRate,
				unit:      p.unit
			});
		}
		return Array.from(map.values());
	});

	onMount(() => {
		return db.subscribeQuery(
			{ products: { $: { where: { status: 'active' } }, brand: {} } },
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
			tempId:         crypto.randomUUID(),
			productId:      '',
			productName:    '',
			productSku:     '',
			brandName:      '',
			unit:           'Adet',
			quantity:       1,
			listPrice:      0,
			discountRate:   0,
			vatRate:        20,
			notes:          '',
			isIncludedPart: false
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

	async function save() {
		const userId = authStore.userId;
		if (!userId || !companyId) { saveError = 'Oturum veya şirket bilgisi eksik.'; return; }
		if (items.some((it) => !it.productName.trim())) { saveError = 'Tüm satırlarda ürün adı girilmeli.'; return; }

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
					...(deliveryType      && { deliveryType }),
					...(deliveryFirm      && { deliveryFirm }),
					...(deliveryPayment   && { deliveryPayment }),
					...(deliveryAddress   && { deliveryAddress }),
					...(deliveryCity      && { deliveryCity }),
					...(deliveryCountry   && { deliveryCountry }),
					...(installationType  && { installationType }),
					...(paymentType       && { paymentType }),
					...(estimatedDate     && { estimatedDeliveryDate: new Date(estimatedDate).getTime() }),
					...(validUntilDate    && { validUntil: new Date(validUntilDate).getTime() }),
					...(productionDuration && { productionDuration }),
					...(bankAccount       && { bankAccount }),
					...(internalNotes     && { internalNotes }),
					...(notes             && { notes }),
					createdBy: userId,
					createdAt: now
				}),
				tx.quotes[quoteId].link({ customer: customerId })
			];

			for (let i = 0; i < items.length; i++) {
				const it     = items[i];
				const itemId = id();
				const up     = it.listPrice * (1 - it.discountRate / 100);
				const lt     = up * it.quantity;
				const va     = lt * it.vatRate / 100;

				ops.push(
					tx.quoteItems[itemId].update({
						quoteId,
						productId:       it.productId || undefined,
						isIncludedPart:  it.isIncludedPart,
						productName:     it.productName,
						productSku:      it.productSku || undefined,
						brandName:       it.brandName || undefined,
						unit:            it.unit,
						quantity:        it.quantity,
						listPrice:       it.listPrice,
						discountRate:    it.discountRate,
						unitPrice:       Math.round(up * 100) / 100,
						vatRate:         it.vatRate,
						vatAmount:       Math.round(va * 100) / 100,
						lineTotal:       Math.round(lt * 100) / 100,
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

			await db.transact(ops);
			onSaved();
		} catch {
			saveError = 'Teklif kaydedilemedi. Lütfen tekrar deneyin.';
		} finally {
			saving = false;
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
						groups={productGroups}
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
