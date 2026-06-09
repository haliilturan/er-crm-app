<script lang="ts">
	import { tick } from 'svelte';
	import type { LineItem } from './QuoteForm.svelte';
	import type { ProductRaw } from './QuoteForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ProductFormModal, { type EditableProduct } from '$lib/components/ui/ProductFormModal.svelte';

	let {
		item = $bindable(),
		allProducts,
		companyId,
		onRemove
	}: {
		item: LineItem;
		allProducts: ProductRaw[];
		companyId: string;
		onRemove: () => void;
	} = $props();

	const VAT_RATES = [0, 1, 10, 20];
	const UNITS = ['Adet', 'Kg', 'Metre', 'M²', 'M³', 'Litre', 'Paket', 'Takım', 'Set'];

	const ITEM_HEIGHT = 44;
	const CONTAINER_HEIGHT = 352;

	// ─── Computed row totals ──────────────────────────────────────────────────────
	let unitPrice    = $derived(item.listPrice * (1 - item.discountRate / 100));
	let lineTotal    = $derived(unitPrice * item.quantity);
	let vatAmount    = $derived(lineTotal * item.vatRate / 100);
	let lineTotalVat = $derived(lineTotal + vatAmount);

	function fmt(n: number): string {
		return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function normalize(s: string): string {
		return s.toLowerCase()
			.replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
			.replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[ıİ]/g, 'i');
	}

	// ─── Mode 1: Search modal ─────────────────────────────────────────────────────
	let searchOpen     = $state(false);
	let searchRaw      = $state('');
	let searchQuery    = $state('');
	let highlightedIdx = $state(-1);
	let scrollTop      = $state(0);
	let listRef        = $state<HTMLDivElement | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout>;

	function handleSearchInput(e: Event) {
		searchRaw = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			searchQuery = searchRaw;
			highlightedIdx = -1;
		}, 300);
	}

	let filtered = $derived.by(() => {
		if (!searchQuery.trim()) return allProducts;
		const q = normalize(searchQuery.trim());
		return allProducts.filter((p) =>
			normalize(p.name).includes(q) ||
			(p.code && normalize(p.code).includes(q)) ||
			(p.serialNo && normalize(p.serialNo).includes(q)) ||
			(p.diameter !== undefined && String(p.diameter).includes(q))
		);
	});

	let startIdx = $derived(Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 3));
	let endIdx   = $derived(Math.min(filtered.length, startIdx + Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + 6));
	let visible  = $derived(filtered.slice(startIdx, endIdx));

	$effect(() => {
		if (listRef && highlightedIdx >= 0) {
			const top = highlightedIdx * ITEM_HEIGHT;
			if (top < listRef.scrollTop) listRef.scrollTop = top;
			if (top + ITEM_HEIGHT > listRef.scrollTop + CONTAINER_HEIGHT)
				listRef.scrollTop = top + ITEM_HEIGHT - CONTAINER_HEIGHT;
		}
	});

	async function openSearch() {
		searchOpen = true;
		searchRaw = '';
		searchQuery = '';
		highlightedIdx = -1;
		scrollTop = 0;
		await tick();
		searchInputRef?.focus();
	}

	function closeSearch() {
		searchOpen = false;
		searchRaw = '';
		searchQuery = '';
		clearTimeout(debounceTimer);
	}

	function selectProduct(p: ProductRaw) {
		item.productId       = p.id;
		item.productName     = p.name;
		item.productSku      = p.sku;
		item.brandName       = p.firm ?? '';
		item.listPrice       = p.unitPrice ?? p.basePrice ?? 0;
		item.vatRate         = p.vatRate ?? 20;
		item.unit            = p.unit ?? 'Adet';
		item.productDetail   = p.detail ?? '';
		item.productCode     = p.code ?? '';
		item.productSerialNo = p.serialNo ?? '';
		item.productCategory = p.category ?? '';
		item.productFirm     = p.firm ?? '';
		closeSearch();
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlightedIdx = Math.min(highlightedIdx + 1, filtered.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlightedIdx = Math.max(highlightedIdx - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (highlightedIdx >= 0 && filtered[highlightedIdx]) {
				openReview(filtered[highlightedIdx]);
			}
		} else if (e.key === 'Escape') {
			closeSearch();
		}
	}

	// ─── Mode 2: Manual add modal ─────────────────────────────────────────────────
	let manualOpen = $state(false);

	function openManual() {
		manualOpen = true;
	}

	// ─── Mode 3: Product review/derive modal ──────────────────────────────────────
	let reviewOpen   = $state(false);
	let reviewSource = $state<ProductRaw | null>(null);

	function toEditable(p: ProductRaw): EditableProduct {
		const r = p as unknown as Record<string, unknown>;
		return {
			id:                   p.id,
			name:                 p.name,
			sku:                  p.sku,
			firm:                 p.firm,
			category:             p.category,
			description:          r['description'] as string | undefined,
			applicationArea:      r['applicationArea'] as string | undefined,
			photo:                r['photo'] as string | undefined,
			technicalDrawing:     r['technicalDrawing'] as string | undefined,
			technicalDescription: r['technicalDescription'] as string | undefined,
			includedParts:        r['includedParts'] as string | undefined,
			type:                 r['type'] as string | undefined,
			brushType:            r['brushType'] as string | undefined,
			brushWidth:           r['brushWidth'] as number | undefined,
			brushLength:          r['brushLength'] as number | undefined,
			brushHeight:          r['brushHeight'] as number | undefined,
			processingType:       r['processingType'] as string | undefined,
			trimmingType:         r['trimmingType'] as string | undefined,
			baseMaterial:         r['baseMaterial'] as string | undefined,
			encoderDiameter:      r['encoderDiameter'] as string | undefined,
			bristleMaterial:      r['bristleMaterial'] as string | undefined,
			bristleThickness:     r['bristleThickness'] as string | undefined,
			bristleLength:        r['bristleLength'] as number | undefined,
			wireDiameter:         r['wireDiameter'] as string | undefined,
			specialProcess:       r['specialProcess'] as boolean | undefined,
			externalProcess:      r['externalProcess'] as number | undefined,
			extraEquipment:       r['extraEquipment'] as number | undefined,
			packaging:            r['packaging'] as number | undefined,
			bristleInsertionTime: r['bristleInsertionTime'] as number | undefined,
			bristleTrimmingTime:  r['bristleTrimmingTime'] as number | undefined,
			baseProcessingTime:   r['baseProcessingTime'] as number | undefined,
			packagingTime:        r['packagingTime'] as number | undefined,
			highPotential:        r['highPotential'] as boolean | undefined,
			urgentProduction:     r['urgentProduction'] as boolean | undefined,
			orderQuantity:        r['orderQuantity'] as number | undefined,
		};
	}

	function openReview(p: ProductRaw) {
		reviewSource = p;
		closeSearch();
		reviewOpen = true;
	}
</script>

<!-- ─── Row card ────────────────────────────────────────────────────────────── -->
<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">

	<!-- Row 1: Product trigger + Remove -->
	<div class="mb-3 flex items-start gap-2">
		<div class="flex-1">
			<button
				type="button"
				onclick={openSearch}
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-left text-sm transition-colors hover:border-[#444] focus:border-[#555] focus:outline-none"
			>
				{#if item.productName}
					<span class="text-white">{item.productName}</span>
				{:else}
					<span class="text-[#555]">— Ürün seçin veya ekleyin —</span>
				{/if}
			</button>
			{#if item.productName && (item.productCode || item.productFirm || item.productCategory)}
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#if item.productFirm}
						<span class="rounded-md bg-[#222] px-2 py-0.5 text-[11px] text-[#888]">{item.productFirm}</span>
					{/if}
					{#if item.productCode}
						<span class="rounded-md bg-[#222] px-2 py-0.5 text-[11px] text-[#888]">{item.productCode}</span>
					{/if}
					{#if item.productCategory}
						<span class="rounded-md bg-[#222] px-2 py-0.5 text-[11px] text-[#555]">{item.productCategory}</span>
					{/if}
				</div>
			{/if}
		</div>
		<button
			type="button"
			onclick={onRemove}
			aria-label="Satırı sil"
			class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555] transition-colors hover:bg-[#222] hover:text-[#ff4444]"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Row 2: Quantity, Unit, List price, Discount -->
	<div class="mb-3 grid grid-cols-4 gap-2">
		<div>
			<label for="{item.tempId}-qty" class="mb-1 block text-[11px] text-[#555]">Miktar</label>
			<input
				id="{item.tempId}-qty"
				type="number"
				bind:value={item.quantity}
				min="0.01"
				step="0.01"
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			/>
		</div>
		<div>
			<label for="{item.tempId}-unit" class="mb-1 block text-[11px] text-[#555]">Birim</label>
			<select
				id="{item.tempId}-unit"
				bind:value={item.unit}
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			>
				{#each UNITS as u (u)}
					<option value={u}>{u}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="{item.tempId}-price" class="mb-1 block text-[11px] text-[#555]">Liste Fiyatı</label>
			<input
				id="{item.tempId}-price"
				type="number"
				bind:value={item.listPrice}
				min="0"
				step="0.01"
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			/>
		</div>
		<div>
			<label for="{item.tempId}-disc" class="mb-1 block text-[11px] text-[#555]">İskonto %</label>
			<input
				id="{item.tempId}-disc"
				type="number"
				bind:value={item.discountRate}
				min="0"
				max="100"
				step="0.1"
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Row 3: VAT + computed totals -->
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<span class="text-[11px] text-[#555]">KDV:</span>
			{#each VAT_RATES as rate (rate)}
				<label class="flex cursor-pointer items-center gap-1">
					<input type="radio" bind:group={item.vatRate} value={rate} class="accent-white" />
					<span class="text-xs text-[#888]">%{rate}</span>
				</label>
			{/each}
		</div>
		<div class="ml-auto flex items-center gap-4 text-sm">
			<div class="text-right">
				<p class="text-[11px] text-[#555]">Birim Fiyat</p>
				<p class="font-medium text-white">{fmt(unitPrice)}</p>
			</div>
			<div class="text-right">
				<p class="text-[11px] text-[#555]">KDV'siz</p>
				<p class="font-medium text-white">{fmt(lineTotal)}</p>
			</div>
			<div class="text-right">
				<p class="text-[11px] text-[#555]">KDV'li</p>
				<p class="font-bold text-white">{fmt(lineTotalVat)}</p>
			</div>
		</div>
	</div>

	<!-- Row 4: Notes -->
	<div class="mt-3">
		<input
			type="text"
			bind:value={item.notes}
			placeholder="Satır notu (opsiyonel)..."
			class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-xs text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
		/>
	</div>
</div>

<!-- ─── Mode 1: Search Modal ──────────────────────────────────────────────────── -->
<Modal open={searchOpen} title="Ürün Seç" width="540px" onclose={closeSearch}>
	<div class="flex flex-col">
		<!-- Header -->
		<div class="border-b border-[#2a2a2a] px-4 py-3">
			<p class="mb-2 text-sm font-semibold text-white">Ürün Seç</p>
			<input
				bind:this={searchInputRef}
				type="text"
				value={searchRaw}
				oninput={handleSearchInput}
				onkeydown={handleSearchKeydown}
				placeholder="Ürün adı, kod, seri no veya çap ile ara..."
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
			/>
			<p class="mt-1.5 text-[11px] text-[#555]">{filtered.length} sonuç</p>
		</div>

		<!-- Virtualized list -->
		<div
			bind:this={listRef}
			class="overflow-y-auto"
			style="height: {CONTAINER_HEIGHT}px; scrollbar-width: thin;"
			onscroll={(e) => { scrollTop = (e.currentTarget as HTMLDivElement).scrollTop; }}
		>
			<!-- Top spacer -->
			<div style="height: {startIdx * ITEM_HEIGHT}px;"></div>

			{#each visible as p, vi (p.id)}
				{@const absoluteIdx = startIdx + vi}
				<button
					type="button"
					onclick={() => openReview(p)}
					class="flex w-full items-center gap-3 px-4 text-left transition-colors"
					style="height: {ITEM_HEIGHT}px;"
					class:bg-[#222]={absoluteIdx === highlightedIdx}
					class:hover:bg-[#1e1e1e]={absoluteIdx !== highlightedIdx}
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm {absoluteIdx === highlightedIdx ? 'text-white' : 'text-[#ccc]'}">{p.name}</p>
						<p class="truncate text-[11px] text-[#555]">
							{#if p.firm}{p.firm} ·{/if}
							{#if p.code}{p.code} ·{/if}
							{p.sku}
						</p>
					</div>
					{#if p.unitPrice ?? p.basePrice}
						<span class="shrink-0 text-xs text-[#888]">{fmt(p.unitPrice ?? p.basePrice ?? 0)}</span>
					{/if}
				</button>
			{/each}

			<!-- Bottom spacer -->
			<div style="height: {(filtered.length - endIdx) * ITEM_HEIGHT}px;"></div>

			{#if filtered.length === 0}
				<div class="flex h-24 items-center justify-center text-sm text-[#555]">Sonuç bulunamadı</div>
			{/if}
		</div>

		<!-- Manual add button -->
		<div class="border-t border-[#2a2a2a] p-3">
			<button
				type="button"
				onclick={openManual}
				class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a3a3a] py-2.5 text-sm text-[#888] transition-colors hover:border-[#555] hover:text-white"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				Listede Yok — Elle Ekle
			</button>
		</div>
	</div>
</Modal>

<!-- ─── Mode 2: Product Form Modal ───────────────────────────────────────────── -->
<ProductFormModal
	open={manualOpen}
	{companyId}
	onSaved={(p) => {
		item.productId       = p.id;
		item.productName     = p.name;
		item.productSku      = p.sku;
		item.brandName       = '';
		item.productDetail   = (p as any).detail;
		item.productCode     = (p as any).code;
		item.productSerialNo = (p as any).serialNo;
		item.productCategory = p.category;
		item.productFirm     = p.firm;
		item.vatRate         = 20;
		item.unit            = 'Adet';
		manualOpen           = false;
		searchOpen           = false;
	}}
	onclose={() => (manualOpen = false)}
/>

<!-- ─── Mode 3: Product Review Modal ──────────────────────────────────────────── -->
<ProductFormModal
	open={reviewOpen}
	{companyId}
	quoteMode={true}
	quoteSourceProduct={reviewSource ? toEditable(reviewSource) : null}
	onAddToQuote={() => {
		if (reviewSource) selectProduct(reviewSource);
	}}
	onSaveAndAdd={(p) => {
		if (reviewSource) {
			item.productId       = p.id;
			item.productName     = p.name;
			item.productSku      = p.sku;
			item.brandName       = p.firm ?? reviewSource.firm ?? '';
			item.listPrice       = reviewSource.unitPrice ?? reviewSource.basePrice ?? 0;
			item.vatRate         = reviewSource.vatRate ?? 20;
			item.unit            = reviewSource.unit ?? 'Adet';
			item.productDetail   = reviewSource.detail ?? '';
			item.productCode     = '';
			item.productSerialNo = '';
			item.productCategory = p.category ?? reviewSource.category ?? '';
			item.productFirm     = p.firm ?? reviewSource.firm ?? '';
		}
	}}
	onclose={() => { reviewOpen = false; reviewSource = null; }}
/>
