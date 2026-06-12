<script lang="ts">
	import { untrack } from 'svelte';
	import { db, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import ProductFormModal from '$lib/components/ui/ProductFormModal.svelte';

	// ── Types ──────────────────────────────────────────────────────────────────

	type Product = {
		id: string;
		name: string;
		nameSearch?: string;
		sku?: string;
		category?: string;
		firm?: string;
		brandName?: string;
		applicationArea?: string;
		description?: string;
		technicalDescription?: string;
		photo?: string;
		technicalDrawing?: string;
		includedParts?: string;
		basePrice?: number;
		unitPrice?: number;
		vatRate?: number;
		currency?: string;
		unit?: string;
		status?: string;
		type?: string;
		companyId: string;
		createdBy: string;
		createdAt: number;
		brushType?: string;
		brushWidth?: number;
		brushLength?: number;
		brushHeight?: number;
		processingType?: string;
		trimmingType?: string;
		baseMaterial?: string;
		encoderDiameter?: string;
		bristleMaterial?: string;
		bristleThickness?: string;
		bristleLength?: number;
		wireDiameter?: string;
		specialProcess?: boolean;
		externalProcess?: number;
		extraEquipment?: number;
		packaging?: number;
		bristleInsertionTime?: number;
		bristleTrimmingTime?: number;
		baseProcessingTime?: number;
		packagingTime?: number;
		highPotential?: boolean;
		urgentProduction?: boolean;
		orderQuantity?: number;
	};

	// ── State ──────────────────────────────────────────────────────────────────

	let products        = $state<Product[]>([]);
	let productsLoading = $state(true);
	let companyId       = $derived(authStore.activeCompanyId ?? '');
	let productSearch   = $state('');

	// ProductFormModal
	let productModal    = $state(false);
	let editingProduct  = $state<Product | null>(null);
	let derivingProduct = $state<Product | null>(null);
	let pendingCategory = $state('');
	let pendingIsCustom = $state(false);

	// Picker
	let pickerModal    = $state(false);
	let pickerSearch   = $state('');
	let pickerProducts = $state<Product[]>([]);
	let pickerLoading  = $state(false);

	// Tip seçim
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
	let tipModalAcik  = $state(false);
	let seciliTipId   = $state<string | null>(null);

	// ── Subscriptions ─────────────────────────────────────────────────────────

	$effect(() => {
		productsLoading = true;
		return db.subscribeQuery(
			{ products: {} },
			(result) => {
				untrack(() => {
					products        = (result.data?.products ?? []) as Product[];
					productsLoading = false;
				});
			}
		);
	});

	$effect(() => {
		const q = normalize(pickerSearch.trim());
		if (q.length < 3) { pickerProducts = []; pickerLoading = false; return; }
		pickerLoading = true;
		return db.subscribeQuery(
			{ products: { $: { where: { nameSearch: { $like: `%${q}%` } }, limit: 5 } } },
			(res) => { untrack(() => { pickerProducts = (res.data?.products ?? []) as Product[]; pickerLoading = false; }); }
		);
	});

	// ── Filtered list ─────────────────────────────────────────────────────────

	const filteredProducts = $derived.by(() => {
		const q = productSearch.trim().toLowerCase();
		const filtered = q
			? products.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					(p.category?.toLowerCase().includes(q) ?? false) ||
					(p.firm?.toLowerCase().includes(q) ?? false) ||
					(p.sku?.toLowerCase().includes(q) ?? false)
			)
			: products;
		return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function normalize(s: string): string {
		return s.toLowerCase()
			.replace(/[şŞ]/g, 's').replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
			.replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[ıİi]/g, 'i');
	}

	function openPicker() {
		pickerSearch    = '';
		pickerProducts  = [];
		editingProduct  = null;
		derivingProduct = null;
		pickerModal     = true;
	}

	function elleEkle() {
		pickerModal  = false;
		seciliTipId  = null;
		tipModalAcik = true;
	}

	function tipOnayla() {
		const t = PRODUCT_TYPES.find(x => x.id === seciliTipId);
		if (!t) return;
		pendingIsCustom = t.isCustom;
		pendingCategory = t.label;
		tipModalAcik    = false;
		editingProduct  = null;
		derivingProduct = null;
		productModal    = true;
	}

	function closeProductModal() {
		productModal    = false;
		editingProduct  = null;
		derivingProduct = null;
		pendingCategory = '';
		pendingIsCustom = false;
	}

	async function deleteProduct(productId: string) {
		if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
		try {
			await db.transact([(tx.products as any)[productId].delete()]);
		} catch (err) {
			console.error('[taslaklar] deleteProduct error:', err);
		}
	}
</script>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<div class="flex h-full flex-col overflow-hidden">

	<!-- Top bar -->
	<div class="shrink-0 border-b border-[#1e1e1e] px-6 py-4">
		<div class="flex items-center justify-between gap-4">
			<div>
				<h2 class="text-base font-semibold text-white">Taslak Ürün</h2>
				<p class="text-xs text-gray-400 mt-0.5">Ürün veritabanını yönetin</p>
			</div>

			<div class="flex items-center gap-3">
				<div class="relative">
					<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
						viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
					</svg>
					<input
						type="text"
						bind:value={productSearch}
						placeholder="Ürün ara…"
						class="w-52 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-8 pr-3 py-2
							text-sm text-white placeholder-[#555] outline-none focus:border-[#444]"
					/>
				</div>
				<button
					type="button"
					onclick={openPicker}
					class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black
						text-sm font-medium hover:bg-[#e8e8e8] transition-colors"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M12 5v14M5 12h14"/>
					</svg>
					Taslak Ürün Ekle
				</button>
			</div>
		</div>
	</div>

	<!-- Products table -->
	<div class="flex-1 overflow-auto" style="scrollbar-width: thin;">
		{#if productsLoading}
			<div class="flex h-32 items-center justify-center">
				<div class="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin opacity-30"></div>
			</div>
		{:else if filteredProducts.length === 0}
			<div class="flex h-40 flex-col items-center justify-center gap-3 text-sm text-gray-500">
				{#if productSearch}
					<span>"{productSearch}" için sonuç bulunamadı</span>
				{:else}
					<span>Henüz ürün yok</span>
					<button
						type="button"
						onclick={openPicker}
						class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-medium hover:bg-[#e8e8e8] transition-colors"
					>
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M12 5v14M5 12h14"/>
						</svg>
						İlk Ürünü Ekle
					</button>
				{/if}
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead class="sticky top-0 z-10">
					<tr class="border-b border-[#1e1e1e] bg-[#111]">
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Fotoğraf</th>
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ürün Adı</th>
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Marka</th>
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Fiyat</th>
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stok</th>
						<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
						<th class="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">İşlemler</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredProducts as product (product.id)}
						<tr class="border-b border-[#1a1a1a] hover:bg-[#151515] transition-colors">
							<!-- Fotoğraf -->
							<td class="px-4 py-3">
								{#if product.photo}
									<img src={product.photo} alt={product.name} class="w-10 h-10 rounded-lg object-cover bg-[#1a1a1a]" />
								{:else}
									<div class="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
										<svg class="w-4 h-4 text-[#444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
											<rect x="3" y="3" width="18" height="18" rx="2"/>
											<circle cx="8.5" cy="8.5" r="1.5"/>
											<polyline points="21 15 16 10 5 21"/>
										</svg>
									</div>
								{/if}
							</td>

							<!-- Ürün Adı -->
							<td class="px-4 py-3">
								<p class="text-white font-medium">{product.name}{#if product.sku}<span class="text-gray-500 font-mono font-normal"> · {product.sku}</span>{/if}</p>
							</td>

							<!-- Kategori -->
							<td class="px-4 py-3 max-w-[160px]">
								{#if product.category}
									<span class="text-xs text-gray-400 truncate block" title={product.category}>{product.category}</span>
								{:else}
									<span class="text-gray-600">—</span>
								{/if}
							</td>

							<!-- Marka -->
							<td class="px-4 py-3">
								{#if product.brandName}
									<span class="text-xs text-gray-400">{product.brandName}</span>
								{:else}
									<span class="text-gray-600">—</span>
								{/if}
							</td>

							<!-- Fiyat -->
							<td class="px-4 py-3 text-xs text-gray-300 font-mono whitespace-nowrap">
								{#if product.basePrice != null}
									{product.basePrice.toLocaleString('tr-TR')} {product.currency ?? 'TRY'}
								{:else if product.unitPrice != null}
									{product.unitPrice.toLocaleString('tr-TR')} {product.currency ?? 'TRY'}
								{:else}
									<span class="text-gray-600">—</span>
								{/if}
							</td>

							<!-- Stok -->
							<td class="px-4 py-3 text-gray-600 text-xs">—</td>

							<!-- Durum -->
							<td class="px-4 py-3">
								{#if product.status === 'active'}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-900">
										<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Aktif
									</span>
								{:else if product.status === 'inactive'}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a]">
										<span class="w-1.5 h-1.5 rounded-full bg-gray-600"></span>Pasif
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/50 text-amber-400 border border-amber-900">
										<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Taslak
									</span>
								{/if}
							</td>

							<!-- İşlemler -->
							<td class="px-4 py-3">
								<div class="flex items-center justify-center gap-1">
									<button
										type="button"
										title="Düzenle"
										onclick={() => { editingProduct = product; productModal = true; }}
										class="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
											<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
										</svg>
									</button>
									<button
										type="button"
										onclick={() => deleteProduct(product.id)}
										title="Sil"
										class="p-1.5 rounded-lg hover:bg-red-950/30 text-gray-400 hover:text-red-400 transition-colors"
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M3 6h18M19 6l-1 14H6L5 6M10 6V4h4v2"/>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- PRODUCT PICKER MODAL                                                   -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if pickerModal}
<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	onclick={(e) => { if (e.target === e.currentTarget) pickerModal = false; }}
	onkeydown={(e) => { if (e.key === 'Escape') pickerModal = false; }}
>
	<div class="w-[560px] flex flex-col rounded-2xl border border-[#2a2a2a] bg-[#111] shadow-2xl overflow-hidden" style="max-height: 580px;">
		<!-- Header -->
		<div class="shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2a2a2a]">
			<div>
				<p class="text-sm font-semibold text-white">Ürün Ekle</p>
				<p class="text-xs text-gray-500 mt-0.5">Mevcut ürünü türetin veya sıfırdan oluşturun</p>
			</div>
			<button
				type="button"
				onclick={() => (pickerModal = false)}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
			>✕</button>
		</div>

		<!-- Search -->
		<div class="shrink-0 px-5 py-3 border-b border-[#1e1e1e]">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
					viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
				</svg>
				<input
					type="text"
					bind:value={pickerSearch}
					placeholder="İsim, SKU veya kategori ara…"
					class="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-8 pr-3 py-2
						text-sm text-white placeholder-[#555] outline-none focus:border-[#444]"
				/>
			</div>
		</div>

		<!-- List -->
		<div class="flex-1 overflow-y-auto" style="scrollbar-width: thin;">
			{#if pickerSearch.trim().length < 3}
				<div class="flex items-center justify-center h-32 text-sm text-gray-500">
					En az 3 karakter girin
				</div>
			{:else if pickerLoading}
				<div class="flex items-center justify-center h-32">
					<div class="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin opacity-30"></div>
				</div>
			{:else if pickerProducts.length === 0}
				<div class="flex items-center justify-center h-32 text-sm text-gray-500">
					Sonuç bulunamadı
				</div>
			{:else}
				{#each pickerProducts as p (p.id)}
					<button
						type="button"
						onclick={() => { derivingProduct = p; pickerModal = false; productModal = true; }}
						class="w-full flex items-center gap-3 px-5 py-3 border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors text-left"
					>
						{#if p.photo}
							<img src={p.photo} alt={p.name} class="w-9 h-9 rounded-lg object-cover bg-[#1a1a1a] shrink-0" />
						{:else}
							<div class="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
								<svg class="w-4 h-4 text-[#444]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<rect x="3" y="3" width="18" height="18" rx="2"/>
									<circle cx="8.5" cy="8.5" r="1.5"/>
									<polyline points="21 15 16 10 5 21"/>
								</svg>
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							<p class="text-sm text-white font-medium truncate">{p.name}</p>
							<p class="text-xs text-gray-500 truncate">{p.category ?? '—'}{p.sku ? ` · ${p.sku}` : ''}</p>
						</div>
						<svg class="w-4 h-4 text-gray-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 18l6-6-6-6"/>
						</svg>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Manuel ekle butonu -->
		<div class="shrink-0 border-t border-[#2a2a2a] p-3">
			<button
				type="button"
				onclick={elleEkle}
				class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#3a3a3a] py-2.5 text-sm text-[#888] transition-colors hover:border-[#555] hover:text-white"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				Listede Yok — Elle Ekle
			</button>
		</div>
	</div>
</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- TİP SEÇİM MODAL                                                       -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if tipModalAcik}
<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	onclick={(e) => { if (e.target === e.currentTarget) tipModalAcik = false; }}
	onkeydown={(e) => { if (e.key === 'Escape') tipModalAcik = false; }}
>
	<div class="w-[440px] rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 shadow-2xl">
		<div class="flex items-center justify-between mb-5">
			<p class="text-sm font-semibold text-white">Ürün Tipi Seçin</p>
			<button
				type="button"
				onclick={() => (tipModalAcik = false)}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
			>✕</button>
		</div>

		<div class="grid grid-cols-2 gap-3 mb-5">
			{#each PRODUCT_TYPES as pt (pt.id)}
				<button
					type="button"
					onclick={() => (seciliTipId = pt.id)}
					class="flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors
						{seciliTipId === pt.id
							? 'border-white/40 bg-white/5'
							: 'border-[#2a2a2a] bg-[#161616] hover:border-[#444] hover:bg-[#1a1a1a]'}"
				>
					<div class="w-10 h-10 rounded-xl bg-[#1e1e1e] flex items-center justify-center">
						<svg
							class="w-5 h-5 transition-colors {seciliTipId === pt.id ? 'text-white' : 'text-gray-400'}"
							viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
						>
							{#each pt.paths as d (d)}
								<path {d}/>
							{/each}
						</svg>
					</div>
					<p class="text-xs font-semibold transition-colors {seciliTipId === pt.id ? 'text-white' : 'text-gray-400'}">
						{pt.label}
					</p>
				</button>
			{/each}
		</div>

		<div class="flex items-center justify-between">
			<button
				type="button"
				onclick={() => (tipModalAcik = false)}
				class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
			>
				<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5M12 5l-7 7 7 7"/>
				</svg>
				İptal
			</button>
			<button
				type="button"
				disabled={!seciliTipId}
				onclick={tipOnayla}
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

<ProductFormModal
	open={productModal}
	{companyId}
	editProduct={editingProduct}
	deriveProduct={derivingProduct}
	initialCategory={pendingCategory}
	initialProductType={pendingIsCustom ? 'custom' : 'ready'}
	draftMode={true}
	onSaved={closeProductModal}
	onclose={closeProductModal}
/>
