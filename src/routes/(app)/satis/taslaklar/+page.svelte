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

	// ── State ──────────────────────────────────────────────────────────────────

	let drafts       = $state<ProductDraft[]>([]);
	let loading      = $state(true);
	let companyId    = $derived(authStore.activeCompanyId ?? '');
	let searchQuery  = $state('');

	// Page tabs
	let pageTab = $state<'new' | 'existing'>('new');

	// Modal
	let modalOpen      = $state(false);
	let productModal   = $state(false);
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

	// ── Filtered list ─────────────────────────────────────────────────────────

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

				<!-- Search (only in Hazır Ürün tab) -->
				{#if pageTab === 'existing'}
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

	<!-- Tab: Yeni Ürün Ekle -->
	{#if pageTab === 'new'}
		<div class="flex-1 flex flex-col items-center justify-center gap-5">
			<div class="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
				<svg class="w-6 h-6 text-[#555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
					<polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
					<line x1="12" y1="22.08" x2="12" y2="12"/>
				</svg>
			</div>
			<div class="text-center">
				<p class="text-sm font-semibold text-white">Yeni Ürün Oluştur</p>
				<p class="text-xs text-[#555] mt-1">Ürün bilgilerini doldurarak products veritabanına ekleyin</p>
			</div>
			<button
				type="button"
				onclick={() => (productModal = true)}
				class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium
					hover:bg-[#e8e8e8] transition-colors"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M12 5v14M5 12h14"/>
				</svg>
				Ürün Formu Aç
			</button>
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

<ProductFormModal
	open={productModal}
	{companyId}
	onSaved={() => { productModal = false; }}
	onclose={() => (productModal = false)}
/>
