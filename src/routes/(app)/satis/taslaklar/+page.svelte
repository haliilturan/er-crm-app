<script lang="ts">
	import { untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Modal, TextInput, TextArea, Select, Badge } from '$lib/components/ui';
	import ProductFormModal from '$lib/components/ui/ProductFormModal.svelte';

	// ── Types ──────────────────────────────────────────────────────────────────

	type DraftPart = {
		id: string;
		name: string;
		partType?: string;
		quantity: number;
		isGift: boolean;
		sortOrder: number;
	};

	type ProductDraft = {
		id: string;
		name: string;
		nameSearch?: string;
		sku?: string;
		serialNo?: string;
		firm?: string;
		category?: string;
		applicationArea?: string;
		description?: string;
		technicalDescription?: string;
		photo?: string;
		technicalDrawing?: string;
		isCustom?: boolean;
		type?: string;
		status?: string;
		companyId: string;
		createdBy: string;
		createdAt: number;
		parts?: DraftPart[];
	};

	// ── Product type config ───────────────────────────────────────────────────

	type ProductTypeConfig = { id: string; label: string; isCustom: boolean; paths: string[] };

	const PRODUCT_TYPES: ProductTypeConfig[] = [
		{
			id: 'firca', label: 'Fırça', isCustom: true,
			paths: [
				'M9.06 11.9l8.07-8.06a2.85 2.85 0 114.03 4.03l-8.06 8.08',
				'M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1 1 2.65 2.02 5 2.02 2.65 0 4.5-1.5 4.5-3.96.02-2.67-2.05-3.1-4.5-3.1z'
			]
		},
		{
			id: 'makine', label: 'Makine', isCustom: false,
			paths: [
				'M12 15a3 3 0 100-6 3 3 0 000 6z',
				'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'
			]
		},
		{
			id: 'kimyasal', label: 'Kimyasal', isCustom: false,
			paths: [
				'M10 2v7.527a2 2 0 01-.211.896L4.72 20.55a1 1 0 00.9 1.45h12.76a1 1 0 00.9-1.45l-5.069-10.127A2 2 0 0114 9.527V2',
				'M8.5 2h7',
				'M7 16h10'
			]
		},
	];

	// ── Constants ─────────────────────────────────────────────────────────────

	const FIRMS = ['Euromak', 'Hilal Fırça', 'Mix7', 'Teknocall', 'Teksa'];

	const CATEGORIES = [
		'Silindir Fırçalar','Dairesel Fırçalar','Panel Fırçalar','Şerit Fırçalar',
		'Koltuk Yıkama Fırçaları','Özel Tasarım Fırçalar','Sarf Malzemeleri','Masraf',
		'Ticari Kalem','Halı Şampuanları','Leke Çıkarıcılar','Halı Parfümleri',
		'Oto Yıkama Ürünleri','Evsel Temizlik Ürünleri','Yardımcı Ürünler',
		'Halı Yıkama Makinaları','Halı Sıkma Makinaları','Halı Çırpma Makinaları',
		'Endüstriyel Süpürgeler','Manuel Halı Yıkama Makinaları','Koltuk Yıkama Makinaları',
		'Overlok makinesi','Ekonomik Makinalar','Otomatik Çamaşır Yıkama Makinası',
		'ENDÜSTRİYEL BRANDA YIKAMA MAKİNESİ','Halı kurutma ve nem alma makinesi',
		'YEDEK PARÇALAR','NAKLİYE','Muhtelif Ürünler','Spare parts',
		'Carpet Washing Machines','Carpet Dust Removers','Carpet Spinning Machines',
		'Carpet Finishing Machines','Sofa Cleaning Machines','Industrial Washing Machines',
		'Economical Cleaning Machines','Disc Brushes','Roller Brushes',
		'Carpet Shampoos','Carpet Perfumes','Stain Removers'
	];

	const PART_TYPE_OPTIONS = [
		{ value: 'hazir', label: 'Hazır Ürün' },
		{ value: 'ozel',  label: 'Özel Ürün'  }
	];

	type Product = {
		id: string;
		name: string;
		nameSearch?: string;
		sku?: string;
		category?: string;
		firm?: string;
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
		// brush fields
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

	let drafts          = $state<ProductDraft[]>([]);
	let loading         = $state(true);
	let products        = $state<Product[]>([]);
	let productsLoading = $state(true);
	let companyId       = $derived(authStore.activeCompanyId ?? '');
	let searchQuery     = $state('');
	let productSearch   = $state('');

	// Page tabs
	let pageTab = $state<'new' | 'existing'>('new');

	// Modal
	let modalOpen        = $state(false);
	let productModal     = $state(false);
	let editingProduct   = $state<Product | null>(null);
	let derivingProduct  = $state<Product | null>(null);
	let selectionModal        = $state(false);
	let selectionStep         = $state<'root' | 'type'>('root');
	let selectedProductTypeId = $state<string | null>(null);
	let pickerModal           = $state(false);
	let pickerSearch          = $state('');
	let pendingCategory       = $state('');
	let pendingIsCustom       = $state(false);
	let activeTab      = $state<'hazir' | 'ozel'>('hazir');
	let editingId      = $state<string | null>(null);
	let saving         = $state(false);
	let errorMsg       = $state('');

	// Form fields
	let fFirm                 = $state('');
	let fName                 = $state('');
	let fSku                  = $state('');
	let fSerialNo             = $state('');
	let fCategory             = $state('');
	let fApplicationArea      = $state('');
	let fDescription          = $state('');
	let fTechnicalDescription = $state('');
	let fPhoto                = $state('');
	let fTechnicalDrawing     = $state('');
	let fParts                = $state<{ tempId: string; name: string; partType: string }[]>([]);

	// ── Subscription ──────────────────────────────────────────────────────────

	$effect(() => {
		const cId = companyId;
		if (!cId) return;
		loading = true;
		return db.subscribeQuery(
			{
				productDrafts: {
					$: { where: { companyId: cId }, order: { createdAt: 'desc' } },
					parts: {}
				}
			},
			(result) => {
				untrack(() => {
					drafts  = (result.data?.productDrafts ?? []) as ProductDraft[];
					loading = false;
				});
			}
		);
	});

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

	// ── Filtered lists ────────────────────────────────────────────────────────

	const filteredDrafts = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return drafts;
		return drafts.filter(
			(d) =>
				d.name.toLowerCase().includes(q) ||
				(d.category?.toLowerCase().includes(q) ?? false) ||
				(d.firm?.toLowerCase().includes(q) ?? false) ||
				(d.sku?.toLowerCase().includes(q) ?? false)
		);
	});

	const pickerProducts = $derived.by(() => {
		const q = pickerSearch.trim().toLowerCase();
		const base = [...products].sort((a, b) => b.createdAt - a.createdAt);
		if (!q) return base;
		return base.filter(p =>
			p.name.toLowerCase().includes(q) ||
			(p.sku?.toLowerCase().includes(q) ?? false) ||
			(p.category?.toLowerCase().includes(q) ?? false)
		);
	});

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

	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload  = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	async function handlePhotoChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) fPhoto = await fileToBase64(file);
	}

	async function handleDrawingChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) fTechnicalDrawing = await fileToBase64(file);
	}

	function resetForm() {
		fFirm = ''; fName = ''; fSku = ''; fSerialNo = ''; fCategory = '';
		fApplicationArea = ''; fDescription = ''; fTechnicalDescription = '';
		fPhoto = ''; fTechnicalDrawing = '';
		fParts = [];
		activeTab = 'hazir';
		errorMsg = '';
	}

	function openNew() {
		editingId = null;
		resetForm();
		modalOpen = true;
	}

	function openEdit(draft: ProductDraft) {
		editingId             = draft.id;
		fFirm                 = draft.firm ?? '';
		fName                 = draft.name ?? '';
		fSku                  = draft.sku ?? '';
		fSerialNo             = draft.serialNo ?? '';
		fCategory             = draft.category ?? '';
		fApplicationArea      = draft.applicationArea ?? '';
		fDescription          = draft.description ?? '';
		fTechnicalDescription = draft.technicalDescription ?? '';
		fPhoto                = draft.photo ?? '';
		fTechnicalDrawing     = draft.technicalDrawing ?? '';
		activeTab             = draft.isCustom || draft.type === 'custom' ? 'ozel' : 'hazir';
		fParts = (draft.parts ?? [])
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((p) => ({ tempId: p.id, name: p.name, partType: p.partType ?? 'hazir' }));
		errorMsg = '';
		modalOpen = true;
	}

	function addPart() {
		fParts = [
			...fParts,
			{ tempId: `tmp-${Date.now()}-${Math.random()}`, name: '', partType: 'hazir' }
		];
	}

	function removePart(idx: number) {
		fParts = fParts.filter((_, i) => i !== idx);
	}

	function updatePartName(idx: number, val: string) {
		fParts = fParts.map((p, i) => (i === idx ? { ...p, name: val } : p));
	}

	function updatePartType(idx: number, val: string) {
		fParts = fParts.map((p, i) => (i === idx ? { ...p, partType: val } : p));
	}

	function closeSelectionModal() {
		selectionModal        = false;
		selectionStep         = 'root';
		selectedProductTypeId = null;
	}

	function handleTypeConfirm() {
		const t = PRODUCT_TYPES.find(x => x.id === selectedProductTypeId);
		if (!t) return;
		pendingCategory = t.label;
		pendingIsCustom = t.isCustom;
		closeSelectionModal();
		editingProduct  = null;
		derivingProduct = null;
		productModal    = true;
	}

	// ── Product actions ───────────────────────────────────────────────────────

	async function deleteProduct(productId: string) {
		if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
		try {
			await db.transact([(tx.products as any)[productId].delete()]);
		} catch (err) {
			console.error('[taslaklar] deleteProduct error:', err);
		}
	}

	// ── Save ──────────────────────────────────────────────────────────────────

	async function save() {
		if (!fName.trim()) { errorMsg = 'Ürün adı zorunludur.'; return; }
		saving   = true;
		errorMsg = '';
		try {
			const draftId = editingId ?? id();
			const now     = Date.now();
			const userId  = authStore.userId!;

			const ops: any[] = [];

			const fields: Record<string, unknown> = {
				name:                 fName.trim(),
				nameSearch:           normalize(fName.trim()),
				sku:                  fSku.trim()                  || undefined,
				serialNo:             fSerialNo.trim()             || undefined,
				firm:                 fFirm                        || undefined,
				category:             fCategory                    || undefined,
				applicationArea:      fApplicationArea.trim()      || undefined,
				description:          fDescription.trim()          || undefined,
				technicalDescription: fTechnicalDescription.trim() || undefined,
				photo:                fPhoto                       || undefined,
				technicalDrawing:     fTechnicalDrawing            || undefined,
				isCustom:             activeTab === 'ozel',
				type:                 activeTab === 'hazir' ? 'ready' : 'custom',
				companyId,
				status:               'draft',
				updatedBy:            userId,
				updatedAt:            now,
				...(editingId ? {} : { createdBy: userId, createdAt: now })
			};
			ops.push(tx.productDrafts[draftId].update(fields));

			// Delete old parts, create new ones
			const existingParts = editingId
				? (drafts.find((d) => d.id === editingId)?.parts ?? [])
				: [];
			for (const p of existingParts) {
				ops.push(tx.productDraftParts[p.id].delete());
			}
			fParts.forEach((p, i) => {
				if (!p.name.trim()) return;
				const partId = id();
				ops.push(
					tx.productDraftParts[partId].update({
						productDraftId: draftId,
						name:           p.name.trim(),
						partType:       p.partType,
						quantity:       1,
						isGift:         false,
						sortOrder:      i
					}),
					tx.productDraftParts[partId].link({ productDraft: draftId })
				);
			});

			await db.transact(ops);
			modalOpen = false;
			resetForm();
		} catch (err) {
			console.error('[taslaklar] save error:', err);
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
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
				<!-- Page tab switcher -->
				<div class="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 border border-[#2a2a2a]">
					<button
						type="button"
						onclick={() => (pageTab = 'new')}
						class="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
							{pageTab === 'new' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}"
					>Yeni Ürün Ekle</button>
					<button
						type="button"
						onclick={() => (pageTab = 'existing')}
						class="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
							{pageTab === 'existing' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}"
					>Hazır Ürün Ekle</button>
				</div>

				<!-- Search + action buttons per tab -->
				{#if pageTab === 'new'}
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
						onclick={() => (selectionModal = true)}
						class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black
							text-sm font-medium hover:bg-[#e8e8e8] transition-colors"
					>
						<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M12 5v14M5 12h14"/>
						</svg>
						Ürün Ekle
					</button>
				{:else if pageTab === 'existing'}
					<div class="relative">
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none"
							viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Ara…"
							class="w-52 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-8 pr-3 py-2
								text-sm text-white placeholder-[#555] outline-none focus:border-[#444]"
						/>
					</div>
					<button
						type="button"
						onclick={() => openNew()}
						class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#2a2a2a] text-gray-400
							text-sm font-medium hover:bg-[#1a1a1a] hover:text-white transition-colors"
					>
						<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M12 5v14M5 12h14"/>
						</svg>
						Taslak Ekle
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Tab: Yeni Ürün Ekle — Products table -->
	{#if pageTab === 'new'}
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
							onclick={() => (productModal = true)}
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
									<p class="text-white font-medium">{product.name}</p>
									{#if product.sku}
										<p class="text-[10px] text-gray-600 font-mono mt-0.5">{product.sku}</p>
									{/if}
								</td>

								<!-- Kategori -->
								<td class="px-4 py-3 max-w-[160px]">
									{#if product.category}
										<span class="text-xs text-gray-400 truncate block" title={product.category}>{product.category}</span>
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
	{/if}

	<!-- Tab: Hazır Ürün Ekle (current table) -->
	{#if pageTab === 'existing'}
		<div class="flex-1 overflow-auto" style="scrollbar-width: thin;">
			{#if loading}
				<div class="flex h-32 items-center justify-center">
					<div class="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin opacity-30"></div>
				</div>
			{:else if filteredDrafts.length === 0}
				<div class="flex h-40 items-center justify-center text-sm text-gray-500">
					{searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz taslak ürün yok'}
				</div>
			{:else}
				<table class="w-full text-sm">
					<thead class="sticky top-0 z-10">
						<tr class="border-b border-[#1e1e1e] bg-[#111]">
							<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
							<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Ürün</th>
							<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Detay</th>
							<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Kod</th>
							<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Stok</th>
							<th class="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Firma</th>
							<th class="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Düzenle</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredDrafts as draft (draft.id)}
							<tr class="border-b border-[#1a1a1a] hover:bg-[#151515] transition-colors">
								<!-- Kategori -->
								<td class="px-4 py-3 text-xs max-w-[140px]">
									{#if draft.category}
										<span class="text-gray-400 truncate block" title={draft.category}>{draft.category}</span>
									{:else}
										<span class="text-gray-600">—</span>
									{/if}
								</td>

								<!-- Ürün -->
								<td class="px-4 py-3">
									<p class="text-white font-medium">{draft.name}</p>
									{#if draft.isCustom || draft.type === 'custom'}
										<span class="text-[10px] text-purple-400">Özel Ürün</span>
									{:else}
										<span class="text-[10px] text-sky-400">Hazır Ürün</span>
									{/if}
								</td>

								<!-- Detay -->
								<td class="px-4 py-3 max-w-[200px]">
									{#if draft.description}
										<p class="text-gray-400 text-xs truncate" title={draft.description}>{draft.description}</p>
									{:else}
										<span class="text-gray-600 text-xs">—</span>
									{/if}
								</td>

								<!-- Kod -->
								<td class="px-4 py-3 text-gray-400 text-xs font-mono">
									{draft.sku || '—'}
								</td>

								<!-- Stok -->
								<td class="px-4 py-3 text-gray-600 text-xs">—</td>

								<!-- Firma -->
								<td class="px-4 py-3">
									{#if draft.firm}
										<Badge label={draft.firm} variant="default" />
									{:else}
										<span class="text-gray-600 text-xs">—</span>
									{/if}
								</td>

								<!-- Düzenle -->
								<td class="px-4 py-3 text-center">
									<button
										type="button"
										onclick={() => openEdit(draft)}
										class="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
										title="Düzenle"
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
											<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
										</svg>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- ADD / EDIT MODAL                                                       -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
<Modal
	open={modalOpen}
	title={editingId ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
	width="720px"
	onclose={() => (modalOpen = false)}
>
	<!-- Fixed header + tabs -->
	<div class="shrink-0 border-b border-[#2a2a2a]">
		<div class="flex items-center justify-between px-5 pt-4 pb-3">
			<h3 class="text-sm font-semibold text-white">
				{editingId ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
			</h3>
			<button
				type="button"
				onclick={() => (modalOpen = false)}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
			>✕</button>
		</div>

		<div class="flex gap-1 px-5 pb-3">
			<button
				type="button"
				onclick={() => (activeTab = 'hazir')}
				class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors
					{activeTab === 'hazir' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}"
			>Hazır Ürün</button>
			<button
				type="button"
				onclick={() => (activeTab = 'ozel')}
				class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors
					{activeTab === 'ozel' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}"
			>Özel Ürün</button>
		</div>
	</div>

	<!-- Scrollable form -->
	<div class="flex-1 overflow-y-auto p-5" style="scrollbar-width: thin;">
		{#if errorMsg}
			<div class="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">
				{errorMsg}
			</div>
		{/if}

		<div class="flex flex-col gap-4">

			<!-- Firma + Kategori -->
			<div class="grid grid-cols-2 gap-3">
				<Select label="İlgili Firma"  bind:value={fFirm}     placeholder="Seçin" options={FIRMS} />
				<Select label="Kategori"      bind:value={fCategory} placeholder="Seçin" options={CATEGORIES} />
			</div>

			<!-- Ürün Adı -->
			<TextInput label="Ürün Adı" bind:value={fName} placeholder="Ürün adını girin" required />

			<!-- SKU + Seri No -->
			<div class="grid grid-cols-2 gap-3">
				<TextInput label="SKU / Ürün Kod" bind:value={fSku}      placeholder="SKU-001" />
				<TextInput label="Ürün Seri No"   bind:value={fSerialNo} placeholder="SN-001" />
			</div>

			<!-- Uygulama Alanı -->
			<TextInput
				label="Uygulama Alanı"
				bind:value={fApplicationArea}
				placeholder="Örn: Halı yıkama makinaları için"
			/>

			<!-- Açıklamalar -->
			<div class="grid grid-cols-2 gap-3">
				<TextArea label="Açıklama"         bind:value={fDescription}         placeholder="Ürün açıklaması" rows={3} />
				<TextArea label="Teknik Açıklama"  bind:value={fTechnicalDescription} placeholder="Teknik detaylar"  rows={3} />
			</div>

			<!-- Dosya yükleme alanları -->
			<div class="grid grid-cols-2 gap-3">
				<!-- Fotoğraf -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs text-gray-500">Fotoğraf</span>
					<label
						class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed
							border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] cursor-pointer transition-colors overflow-hidden"
					>
						{#if fPhoto}
							<img src={fPhoto} alt="Fotoğraf önizleme" class="h-full w-full object-contain" />
						{:else}
							<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<rect x="3" y="3" width="18" height="18" rx="2"/>
								<circle cx="8.5" cy="8.5" r="1.5"/>
								<polyline points="21 15 16 10 5 21"/>
							</svg>
							<span class="text-xs text-gray-600">Resim yükle</span>
						{/if}
						<input type="file" accept="image/*" class="sr-only" onchange={handlePhotoChange} />
					</label>
					{#if fPhoto}
						<button type="button" onclick={() => (fPhoto = '')}
							class="text-[10px] text-red-400 hover:text-red-300 text-center transition-colors">
							Kaldır
						</button>
					{/if}
				</div>

				<!-- Teknik Resim -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs text-gray-500">Teknik Resim</span>
					<label
						class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed
							border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] cursor-pointer transition-colors overflow-hidden"
					>
						{#if fTechnicalDrawing}
							<img src={fTechnicalDrawing} alt="Teknik resim önizleme" class="h-full w-full object-contain" />
						{:else}
							<svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
								<line x1="16" y1="13" x2="8" y2="13"/>
								<line x1="16" y1="17" x2="8" y2="17"/>
							</svg>
							<span class="text-xs text-gray-600">Dosya yükle</span>
						{/if}
						<input type="file" accept="image/*,application/pdf" class="sr-only" onchange={handleDrawingChange} />
					</label>
					{#if fTechnicalDrawing}
						<button type="button" onclick={() => (fTechnicalDrawing = '')}
							class="text-[10px] text-red-400 hover:text-red-300 text-center transition-colors">
							Kaldır
						</button>
					{/if}
				</div>
			</div>

			<!-- Dahil Parçalar -->
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-xs font-medium text-gray-400">Dahil Parçalar</span>
					<button
						type="button"
						onclick={addPart}
						class="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2a2a2a]
							text-xs text-gray-400 hover:text-white hover:border-[#444] transition-colors"
					>
						<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
							<path d="M12 5v14M5 12h14"/>
						</svg>
						Parça Ekle
					</button>
				</div>

				{#if fParts.length === 0}
					<p class="text-xs text-gray-600 text-center py-3 rounded-xl border border-dashed border-[#2a2a2a]">
						Henüz parça eklenmedi
					</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each fParts as part, idx (part.tempId)}
							<div class="flex items-center gap-2">
								<div class="flex-1">
									<TextInput
										label=""
										value={part.name}
										placeholder="Parça adı"
										oninput={(e) => updatePartName(idx, (e.target as HTMLInputElement).value)}
									/>
								</div>
								<div class="w-36 shrink-0">
									<Select
										label=""
										value={part.partType}
										options={PART_TYPE_OPTIONS}
										onchange={(opt) => updatePartType(idx, opt.value)}
									/>
								</div>
								<button
									type="button"
									onclick={() => removePart(idx)}
									aria-label="Parçayı kaldır"
									class="shrink-0 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
								>
									<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M18 6L6 18M6 6l12 12"/>
									</svg>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

		</div>
	</div>

	<!-- Footer -->
	<div class="shrink-0 flex items-center justify-end gap-2 border-t border-[#2a2a2a] px-5 py-3">
		<button
			type="button"
			onclick={() => (modalOpen = false)}
			class="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-gray-400
				hover:bg-[#1a1a1a] hover:text-white transition-colors"
		>İptal</button>
		<button
			type="button"
			onclick={save}
			disabled={saving}
			class="px-5 py-2 rounded-xl bg-white text-black text-sm font-medium
				hover:bg-[#e8e8e8] transition-colors disabled:opacity-50"
		>{saving ? 'Kaydediliyor…' : editingId ? 'Güncelle' : 'Kaydet'}</button>
	</div>
</Modal>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- SELECTION MODAL                                                        -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
{#if selectionModal}
<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
	onclick={(e) => { if (e.target === e.currentTarget) closeSelectionModal(); }}
	onkeydown={(e) => { if (e.key === 'Escape') closeSelectionModal(); }}
>
	<div class="w-[480px] rounded-2xl border border-[#2a2a2a] bg-[#111] p-6 shadow-2xl">

		{#if selectionStep === 'root'}
			<!-- ── Step 1: root ─────────────────────────────────────────────── -->
			<div class="flex items-center justify-between mb-5">
				<p class="text-sm font-semibold text-white">Yeni Ürün Ekle</p>
				<button
					type="button"
					onclick={closeSelectionModal}
					class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
				>✕</button>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<!-- Option A: Hazır Ürün → type selector -->
				<button
					type="button"
					onclick={() => { selectionStep = 'type'; }}
					class="flex flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-[#161616] p-5 text-left hover:border-[#444] hover:bg-[#1a1a1a] transition-colors"
				>
					<div class="w-10 h-10 rounded-xl bg-[#1e1e1e] flex items-center justify-center">
						<svg class="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
							<line x1="16" y1="13" x2="8" y2="13"/>
							<line x1="16" y1="17" x2="8" y2="17"/>
							<line x1="10" y1="9" x2="8" y2="9"/>
						</svg>
					</div>
					<div>
						<p class="text-sm font-semibold text-white mb-1">Hazır Ürün</p>
						<p class="text-xs text-gray-500 leading-relaxed">Yeni bir ürün sıfırdan oluştur</p>
					</div>
				</button>

				<!-- Option B: Mevcut Üründen Türet -->
				<button
					type="button"
					onclick={() => { closeSelectionModal(); pickerSearch = ''; pickerModal = true; }}
					class="flex flex-col gap-3 rounded-xl border border-[#2a2a2a] bg-[#161616] p-5 text-left hover:border-[#444] hover:bg-[#1a1a1a] transition-colors"
				>
					<div class="w-10 h-10 rounded-xl bg-[#1e1e1e] flex items-center justify-center">
						<svg class="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
							<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
						</svg>
					</div>
					<div>
						<p class="text-sm font-semibold text-white mb-1">Mevcut Üründen Türet</p>
						<p class="text-xs text-gray-500 leading-relaxed">Kayıtlı bir ürünü referans alarak yeni taslak oluştur</p>
					</div>
				</button>
			</div>

		{:else}
			<!-- ── Step 2: type selector ─────────────────────────────────────── -->
			<div class="flex items-center gap-2 mb-5">
				<button
					type="button"
					onclick={() => { selectionStep = 'root'; selectedProductTypeId = null; }}
					class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e1e] transition-colors"
					title="Geri"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M19 12H5M12 5l-7 7 7 7"/>
					</svg>
				</button>
				<p class="text-sm font-semibold text-white">Ürün Tipi Seçin</p>
				<button
					type="button"
					onclick={closeSelectionModal}
					class="ml-auto text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
				>✕</button>
			</div>

			<div class="grid grid-cols-3 gap-3 mb-6">
				{#each PRODUCT_TYPES as pt (pt.id)}
					<button
						type="button"
						onclick={() => (selectedProductTypeId = pt.id)}
						class="flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors
							{selectedProductTypeId === pt.id
								? 'border-white/40 bg-white/5'
								: 'border-[#2a2a2a] bg-[#161616] hover:border-[#444] hover:bg-[#1a1a1a]'}"
					>
						<div class="w-10 h-10 rounded-xl bg-[#1e1e1e] flex items-center justify-center">
							<svg
								class="w-5 h-5 transition-colors {selectedProductTypeId === pt.id ? 'text-white' : 'text-gray-400'}"
								viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
							>
								{#each pt.paths as d (d)}
									<path {d}/>
								{/each}
							</svg>
						</div>
						<p class="text-xs font-semibold transition-colors {selectedProductTypeId === pt.id ? 'text-white' : 'text-gray-400'}">
							{pt.label}
						</p>
					</button>
				{/each}
			</div>

			<div class="flex items-center justify-between">
				<button
					type="button"
					onclick={() => { selectionStep = 'root'; selectedProductTypeId = null; }}
					class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M19 12H5M12 5l-7 7 7 7"/>
					</svg>
					Geri
				</button>
				<button
					type="button"
					disabled={!selectedProductTypeId}
					onclick={handleTypeConfirm}
					class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black text-sm font-medium
						hover:bg-[#e8e8e8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				>
					Devam Et
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path d="M5 12h14M12 5l7 7-7 7"/>
					</svg>
				</button>
			</div>
		{/if}

	</div>
</div>
{/if}

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
				<p class="text-sm font-semibold text-white">Ürün Seç</p>
				<p class="text-xs text-gray-500 mt-0.5">Referans almak istediğiniz ürünü seçin</p>
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
			{#if pickerProducts.length === 0}
				<div class="flex items-center justify-center h-32 text-sm text-gray-500">
					{pickerSearch ? 'Sonuç bulunamadı' : 'Ürün yok'}
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
	onSaved={() => { productModal = false; editingProduct = null; derivingProduct = null; pendingCategory = ''; pendingIsCustom = false; }}
	onclose={() => { productModal = false; editingProduct = null; derivingProduct = null; pendingCategory = ''; pendingIsCustom = false; }}
/>
