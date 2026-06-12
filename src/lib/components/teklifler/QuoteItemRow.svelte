<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { LineItem } from './QuoteForm.svelte';
	import type { ProductRaw } from './QuoteForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ProductFormModal, { type EditableProduct } from '$lib/components/ui/ProductFormModal.svelte';
	import { db } from '$lib/instant';

	let {
		item = $bindable(),
		companyId,
		onRemove
	}: {
		item: LineItem;
		companyId: string;
		onRemove: () => void;
	} = $props();

	const VAT_RATES = [0, 1, 10, 20];
	const UNITS = ['Adet', 'Kg', 'Metre', 'M²', 'M³', 'Litre', 'Paket', 'Takım', 'Set'];

	type ProductTypeConfig = { id: string; label: string; isCustom: boolean; paths: string[] };

	const PRODUCT_TYPES: ProductTypeConfig[] = [
		{ id: 'firca', label: 'Fırça', isCustom: true, paths: [
			'M9.06 11.9l8.07-8.06a2.85 2.85 0 114.03 4.03l-8.06 8.08',
			'M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1 1 2.65 2.02 5 2.02 2.65 0 4.5-1.5 4.5-3.96.02-2.67-2.05-3.1-4.5-3.1z'
		]},
		{ id: 'makine', label: 'Makine', isCustom: false, paths: [
			'M12 15a3 3 0 100-6 3 3 0 000 6z',
			'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'
		]},
		{ id: 'kimyasal', label: 'Kimyasal', isCustom: false, paths: [
			'M10 2v7.527a2 2 0 01-.211.896L4.72 20.55a1 1 0 00.9 1.45h12.76a1 1 0 00.9-1.45l-5.069-10.127A2 2 0 0114 9.527V2',
			'M8.5 2h7',
			'M7 16h10'
		]},
		{ id: 'diger', label: 'Diğer', isCustom: false, paths: [
			'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z'
		]},
	];

	const ITEM_HEIGHT = 56;
	const CONTAINER_HEIGHT = 280; // 5 rows max

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
	let searchQuery    = $state('');   // debounced
	let highlightedIdx = $state(-1);
	let listRef        = $state<HTMLDivElement | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout>;

	let displayProducts = $state<ProductRaw[]>([]);
	let searching       = $state(false);

	function handleSearchInput(e: Event) {
		searchRaw = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			searchQuery    = searchRaw;
			highlightedIdx = -1;
		}, 400);
	}

	// DB subscription — fires whenever searchOpen or searchQuery changes
	$effect(() => {
		const open = searchOpen;
		const q    = searchQuery.trim();
		const cId  = companyId;

		if (!open) { untrack(() => { displayProducts = []; }); return; }

		if (q.length < 3) {
			// Default: last 5 recently updated
			return db.subscribeQuery(
				{ products: { $: { where: { companyId: cId }, order: { updatedAt: 'desc' }, limit: 5 } } },
				(result) => {
					untrack(() => {
						displayProducts = (result.data?.products ?? []) as ProductRaw[];
						searching       = false;
					});
				}
			);
		} else {
			// Search: fetch all for this company, filter client-side, return top 5
			untrack(() => { searching = true; });
			const norm = normalize(q);
			return db.subscribeQuery(
				{ products: { $: { where: { companyId: cId } } } },
				(result) => {
					untrack(() => {
						const all = (result.data?.products ?? []) as ProductRaw[];
						displayProducts = all
							.filter((p) =>
								normalize(p.name).includes(norm) ||
								(p.sku  && normalize(p.sku).includes(norm)) ||
								(p.code && normalize(p.code).includes(norm)) ||
								(p.serialNo && normalize(p.serialNo).includes(norm))
							)
							.slice(0, 5);
						searching = false;
					});
				}
			);
		}
	});

	$effect(() => {
		if (listRef && highlightedIdx >= 0) {
			const top = highlightedIdx * ITEM_HEIGHT;
			if (top < listRef.scrollTop) listRef.scrollTop = top;
			if (top + ITEM_HEIGHT > listRef.scrollTop + CONTAINER_HEIGHT)
				listRef.scrollTop = top + ITEM_HEIGHT - CONTAINER_HEIGHT;
		}
	});

	async function openSearch() {
		searchOpen     = true;
		searchRaw      = '';
		searchQuery    = '';
		highlightedIdx = -1;
		await tick();
		searchInputRef?.focus();
	}

	function closeSearch() {
		searchOpen  = false;
		searchRaw   = '';
		searchQuery = '';
		clearTimeout(debounceTimer);
	}

	function selectProduct(p: ProductRaw) {
		item.productId       = p.id;
		item.productName     = p.name;
		item.productSku      = p.sku;
		item.brandName       = p.brandName ?? p.firm ?? '';
		item.listPrice       = p.unitPrice ?? p.basePrice ?? 0;
		item.vatRate         = p.vatRate ?? 20;
		item.unit            = p.unit ?? 'Adet';
		item.productDetail   = p.detail ?? '';
		item.productCode     = p.code ?? '';
		item.productSerialNo = p.serialNo ?? '';
		item.productCategory = p.category ?? '';
		item.productFirm     = p.firm ?? '';
		item.descTR          = p.descTR ?? '';
		item.descEN          = p.descEN ?? '';
		item.descRU          = p.descRU ?? '';
		item.descAR          = p.descAR ?? '';
		item.descFR          = p.descFR ?? '';
		closeSearch();
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlightedIdx = Math.min(highlightedIdx + 1, displayProducts.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlightedIdx = Math.max(highlightedIdx - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (highlightedIdx >= 0 && displayProducts[highlightedIdx]) {
				openReview(displayProducts[highlightedIdx]);
			}
		} else if (e.key === 'Escape') {
			closeSearch();
		}
	}

	// ─── Mode 2: Manual add modal ─────────────────────────────────────────────────
	let manualOpen           = $state(false);
	let manualTypeOpen       = $state(false);
	let manualSelectedTypeId = $state<string | null>(null);
	let manualIsCustom       = $state(false);
	let manualCategory       = $state('');

	function openManualTypeSelect() {
		searchOpen           = false;
		manualTypeOpen       = true;
		manualSelectedTypeId = null;
	}

	function confirmManualType() {
		const t = PRODUCT_TYPES.find(x => x.id === manualSelectedTypeId);
		if (!t) return;
		manualIsCustom  = t.isCustom;
		manualCategory  = t.label;
		manualTypeOpen  = false;
		manualOpen      = true;
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
			brandName:            p.brandName,
			category:             p.category,
			description:          r['description'] as string | undefined,
			descTR:               p.descTR,
			descEN:               p.descEN,
			descRU:               p.descRU,
			descAR:               p.descAR,
			descFR:               p.descFR,
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
				placeholder="Ürün adı veya SKU ile arayın (min. 3 karakter)..."
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
			/>
			<p class="mt-1.5 text-[11px] text-[#555]">
				{#if searchQuery.length >= 3}
					{displayProducts.length} sonuç
				{:else}
					Son güncellenen ürünler
				{/if}
			</p>
		</div>

		<!-- Results list (max 5 items — no virtualization needed) -->
		<div
			bind:this={listRef}
			class="overflow-y-auto"
			style="min-height: 56px; max-height: {CONTAINER_HEIGHT}px; scrollbar-width: thin;"
		>
			{#if searching}
				<div class="flex h-14 items-center justify-center gap-2 text-sm text-[#555]">
					<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#333] border-t-[#666]"></span>
					Aranıyor...
				</div>
			{:else if searchRaw.length > 0 && searchRaw.length < 3}
				<div class="flex h-14 items-center justify-center text-xs text-[#444]">
					Aramak için en az 3 karakter girin
				</div>
			{:else if displayProducts.length === 0}
				<div class="flex h-14 items-center justify-center text-sm text-[#555]">Sonuç bulunamadı</div>
			{:else}
				{#each displayProducts as p, i (p.id)}
					<button
						type="button"
						onclick={() => openReview(p)}
						class="flex w-full items-center gap-3 px-4 border-b border-[#1a1a1a] text-left transition-colors"
						style="height: {ITEM_HEIGHT}px;"
						class:bg-[#1e1e1e]={i === highlightedIdx}
						class:hover:bg-[#161616]={i !== highlightedIdx}
					>
						<div class="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
							<svg class="w-3.5 h-3.5 text-[#444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<rect x="3" y="3" width="18" height="18" rx="2"/>
								<circle cx="8.5" cy="8.5" r="1.5"/>
								<polyline points="21 15 16 10 5 21"/>
							</svg>
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium {i === highlightedIdx ? 'text-white' : 'text-[#ccc]'}">{p.name}</p>
							<p class="truncate text-xs text-[#555]">{p.category ?? '—'}{p.sku ? ` · ${p.sku}` : ''}</p>
						</div>
						{#if p.unitPrice ?? p.basePrice}
							<span class="shrink-0 text-xs text-[#888]">{fmt(p.unitPrice ?? p.basePrice ?? 0)}</span>
						{/if}
						<svg class="w-4 h-4 text-[#444] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 18l6-6-6-6"/>
						</svg>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Manual add button -->
		<div class="border-t border-[#2a2a2a] p-3">
			<button
				type="button"
				onclick={openManualTypeSelect}
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

<!-- ─── Mode 2a: Product Type Selection ──────────────────────────────────────── -->
{#if manualTypeOpen}
<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	onclick={(e) => { if (e.target === e.currentTarget) manualTypeOpen = false; }}
	onkeydown={(e) => { if (e.key === 'Escape') manualTypeOpen = false; }}
>
	<div class="w-[440px] rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 shadow-2xl">
		<div class="flex items-center justify-between mb-5">
			<p class="text-sm font-semibold text-white">Ürün Tipi Seçin</p>
			<button
				type="button"
				onclick={() => (manualTypeOpen = false)}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
			>✕</button>
		</div>

		<div class="grid grid-cols-2 gap-3 mb-5">
			{#each PRODUCT_TYPES as pt (pt.id)}
				<button
					type="button"
					onclick={() => (manualSelectedTypeId = pt.id)}
					class="flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors
						{manualSelectedTypeId === pt.id
							? 'border-white/40 bg-white/5'
							: 'border-[#2a2a2a] bg-[#161616] hover:border-[#444] hover:bg-[#1a1a1a]'}"
				>
					<div class="w-10 h-10 rounded-xl bg-[#1e1e1e] flex items-center justify-center">
						<svg
							class="w-5 h-5 transition-colors {manualSelectedTypeId === pt.id ? 'text-white' : 'text-gray-400'}"
							viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
						>
							{#each pt.paths as d (d)}
								<path {d}/>
							{/each}
						</svg>
					</div>
					<p class="text-xs font-semibold transition-colors {manualSelectedTypeId === pt.id ? 'text-white' : 'text-gray-400'}">
						{pt.label}
					</p>
				</button>
			{/each}
		</div>

		<div class="flex items-center justify-between">
			<button
				type="button"
				onclick={() => (manualTypeOpen = false)}
				class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
			>
				<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5M12 5l-7 7 7 7"/>
				</svg>
				İptal
			</button>
			<button
				type="button"
				disabled={!manualSelectedTypeId}
				onclick={confirmManualType}
				class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black text-sm font-medium
					hover:bg-[#e8e8e8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
			>
				Devam Et
				<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M5 12h14M12 5l7 7-7 7"/>
				</svg>
			</button>
		</div>
	</div>
</div>
{/if}

<!-- ─── Mode 2: Product Form Modal (Elle Ekle, quoteMode) ────────────────────── -->
<ProductFormModal
	open={manualOpen}
	{companyId}
	quoteMode={true}
	initialProductType={manualIsCustom ? 'custom' : 'ready'}
	initialCategory={manualCategory}
	onSaved={(p) => {
		item.productId       = p.id;
		item.productName     = p.name;
		item.productSku      = p.sku;
		item.brandName       = p.brandName ?? '';
		item.productDetail   = (p as any).detail;
		item.productCode     = (p as any).code;
		item.productSerialNo = (p as any).serialNo;
		item.productCategory = p.category ?? '';
		item.productFirm     = p.brandName ?? '';
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
			item.brandName       = p.brandName ?? reviewSource.brandName ?? reviewSource.firm ?? '';
			item.listPrice       = reviewSource.unitPrice ?? reviewSource.basePrice ?? 0;
			item.vatRate         = reviewSource.vatRate ?? 20;
			item.unit            = reviewSource.unit ?? 'Adet';
			item.productDetail   = reviewSource.detail ?? '';
			item.productCode     = '';
			item.productSerialNo = '';
			item.productCategory = p.category ?? reviewSource.category ?? '';
			item.productFirm     = p.brandName ?? reviewSource.brandName ?? reviewSource.firm ?? '';
		}
	}}
	onclose={() => { reviewOpen = false; reviewSource = null; }}
/>
