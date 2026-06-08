<script lang="ts">
	import { db, id as genId, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Modal, Select, TextInput, TextArea, NumberInput } from '$lib/components/ui';

	export type SavedProduct = {
		id: string;
		name: string;
		sku: string;
		firm: string;
		category: string;
	};

	let {
		open,
		companyId,
		onSaved,
		onclose
	}: {
		open: boolean;
		companyId: string;
		onSaved: (p: SavedProduct) => void;
		onclose: () => void;
	} = $props();

	const FIRMS = ['Euromak', 'Hilal Fırça', 'Mix7', 'Teknocall', 'Teksa'];

	const CATEGORIES = [
		'Silindir Fırçalar', 'Dairesel Fırçalar', 'Panel Fırçalar', 'Şerit Fırçalar',
		'Koltuk Yıkama Fırçaları', 'Özel Tasarım Fırçalar', 'Sarf Malzemeleri', 'Masraf',
		'Ticari Kalem', 'Halı Şampuanları', 'Leke Çıkarıcılar', 'Halı Parfümleri',
		'Oto Yıkama Ürünleri', 'Evsel Temizlik Ürünleri', 'Yardımcı Ürünler',
		'Halı Yıkama Makinaları', 'Halı Sıkma Makinaları', 'Halı Çırpma Makinaları',
		'Endüstriyel Süpürgeler', 'Manuel Halı Yıkama Makinaları', 'Koltuk Yıkama Makinaları',
		'Overlok makinesi', 'Ekonomik Makinalar', 'Otomatik Çamaşır Yıkama Makinası',
		'ENDÜSTRİYEL BRANDA YIKAMA MAKİNESİ', 'Halı kurutma ve nem alma makinesi',
		'YEDEK PARÇALAR', 'NAKLİYE', 'Muhtelif Ürünler', 'Spare parts',
		'Carpet Washing Machines', 'Carpet Dust Removers', 'Carpet Spinning Machines',
		'Sofa Cleaning Machines', 'Industrial Washing Machines', 'Economical Cleaning Machines',
		'Disc Brushes', 'Roller Brushes'
	];

	const PART_TYPES = [
		{ value: 'hazir', label: 'Hazır Ürün' },
		{ value: 'ozel',  label: 'Özel Ürün'  }
	];

	type PartRow = { tempId: string; name: string; quantity: number; partType: string };

	let productId        = $state(genId());
	let sku              = $state('');
	let name             = $state('');
	let firm             = $state('');
	let category         = $state('');
	let applicationArea  = $state('');
	let description      = $state('');
	let photo            = $state('');
	let technicalDrawing = $state('');
	let technicalDescr   = $state('');
	let parts            = $state<PartRow[]>([]);
	let saving           = $state(false);
	let errorMsg         = $state('');

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
		if (file) photo = await fileToBase64(file);
	}

	async function handleDrawingChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) technicalDrawing = await fileToBase64(file);
	}

	$effect(() => {
		if (!open) {
			productId        = genId();
			sku              = '';
			name             = '';
			firm             = '';
			category         = '';
			applicationArea  = '';
			description      = '';
			photo            = '';
			technicalDrawing = '';
			technicalDescr   = '';
			parts            = [];
			errorMsg         = '';
			saving           = false;
		}
	});

	function addPart() {
		parts = [...parts, { tempId: `tmp-${Date.now()}`, name: '', quantity: 1, partType: 'hazir' }];
	}

	function removePart(idx: number) {
		parts = parts.filter((_, i) => i !== idx);
	}

	function updatePartType(idx: number, val: string) {
		parts = parts.map((p, i) => i === idx ? { ...p, partType: val } : p);
	}

	async function save() {
		if (!name.trim()) { errorMsg = 'Ürün adı zorunludur.'; return; }
		const pid = productId.trim();
		if (!pid) { errorMsg = 'Ürün ID boş olamaz.'; return; }
		saving   = true;
		errorMsg = '';
		try {
			const skuVal = sku.trim() || `PROD-${pid.slice(0, 8).toUpperCase()}`;
			const validParts = parts.filter((p) => p.name.trim());
			const includedParts = validParts.length
				? JSON.stringify(validParts.map((p) => ({ name: p.name.trim(), quantity: p.quantity, type: p.partType })))
				: undefined;

			await db.transact([
				(tx.products[pid] as any).update({
					name:                 name.trim(),
					nameSearch:           normalize(name.trim()),
					sku:                  skuVal,
					firm:                 firm               || undefined,
					category:             category           || undefined,
					applicationArea:      applicationArea.trim()  || undefined,
					description:          description.trim()      || undefined,
					photo:                photo                   || undefined,
					technicalDrawing:     technicalDrawing        || undefined,
					technicalDescription: technicalDescr.trim()   || undefined,
					includedParts,
					type:      'product',
					status:    'active',
					vatRate:   20,
					unit:      'Adet',
					companyId,
					createdBy: authStore.userId!,
					createdAt: Date.now()
				})
			]);
			onSaved({ id: pid, name: name.trim(), sku: skuVal, firm, category });
			onclose();
		} catch (err) {
			console.error('[ProductFormModal] save error:', err);
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}
</script>

<Modal {open} title="" width="640px" {onclose}>
	<!-- Header -->
	<div class="shrink-0 border-b border-[#2a2a2a]">
		<div class="flex items-center justify-between px-5 pt-4 pb-3">
			<div>
				<p class="text-sm font-semibold text-white">Ürün Ekle</p>
				<p class="text-xs text-[#555] mt-0.5">products namespace'ine kalıcı olarak kaydedilecek</p>
			</div>
			<button
				type="button"
				onclick={onclose}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
			>✕</button>
		</div>
	</div>

	<!-- Scrollable form -->
	<div class="flex-1 overflow-y-auto px-5 py-4" style="max-height: 65vh; scrollbar-width: thin;">
		{#if errorMsg}
			<div class="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">{errorMsg}</div>
		{/if}

		<div class="flex flex-col gap-3.5">

			<!-- ID -->
			<TextInput
				label="ID (otomatik oluşturuldu, değiştirilebilir)"
				bind:value={productId}
				placeholder="UUID"
			/>

			<!-- SKU + Ürün Adı -->
			<div class="grid grid-cols-2 gap-3">
				<TextInput label="SKU / Ürün Kod" bind:value={sku} placeholder="Boş bırakılırsa otomatik" />
				<TextInput label="Ürün Adı *" bind:value={name} placeholder="Ürün adını girin" required />
			</div>

			<!-- Marka + Kategori -->
			<div class="grid grid-cols-2 gap-3">
				<Select label="Marka" bind:value={firm}     options={FIRMS}       placeholder="Seçin..." />
				<Select label="Kategori" bind:value={category} options={CATEGORIES} placeholder="Seçin..." />
			</div>

			<!-- Uygulama Alanı -->
			<TextInput
				label="Uygulama Alanı"
				bind:value={applicationArea}
				placeholder="Örn: Halı yıkama makinaları için"
			/>

			<!-- Açıklama -->
			<TextArea label="Açıklama" bind:value={description} placeholder="Ürün açıklaması..." rows={3} />

			<!-- Fotoğraf + Teknik Resim -->
			<div class="grid grid-cols-2 gap-3">
				<!-- Fotoğraf -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs text-gray-500">Fotoğraf</span>
					<label class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed
						border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] cursor-pointer transition-colors overflow-hidden">
						{#if photo}
							<img src={photo} alt="Önizleme" class="h-full w-full object-contain" />
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
					{#if photo}
						<button type="button" onclick={() => (photo = '')}
							class="text-[10px] text-red-400 hover:text-red-300 text-center transition-colors">
							Kaldır
						</button>
					{/if}
				</div>

				<!-- Teknik Resim -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs text-gray-500">Teknik Resim</span>
					<label class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed
						border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] cursor-pointer transition-colors overflow-hidden">
						{#if technicalDrawing}
							<img src={technicalDrawing} alt="Teknik resim" class="h-full w-full object-contain" />
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
					{#if technicalDrawing}
						<button type="button" onclick={() => (technicalDrawing = '')}
							class="text-[10px] text-red-400 hover:text-red-300 text-center transition-colors">
							Kaldır
						</button>
					{/if}
				</div>
			</div>

			<!-- Teknik Açıklama -->
			<TextArea label="Teknik Açıklama" bind:value={technicalDescr} placeholder="Teknik detaylar, özellikler..." rows={3} />

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

				{#if parts.length === 0}
					<p class="text-xs text-gray-600 text-center py-3 rounded-xl border border-dashed border-[#2a2a2a]">
						Henüz parça eklenmedi
					</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each parts as part, idx (part.tempId)}
							<div class="flex items-end gap-2">
								<div class="flex-1">
									<TextInput label="" bind:value={parts[idx].name} placeholder="Parça adı" />
								</div>
								<div class="w-24 shrink-0">
									<NumberInput label="Adet" bind:value={parts[idx].quantity} min={1} />
								</div>
								<div class="w-36 shrink-0">
									<Select
										label=""
										value={part.partType}
										options={PART_TYPES}
										onchange={(opt) => updatePartType(idx, opt.value)}
									/>
								</div>
								<button
									type="button"
									onclick={() => removePart(idx)}
									aria-label="Kaldır"
									class="shrink-0 p-1.5 mb-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
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
			onclick={onclose}
			class="px-4 py-2 rounded-xl border border-[#2a2a2a] text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
		>İptal</button>
		<button
			type="button"
			onclick={save}
			disabled={saving}
			class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-[#e8e8e8] transition-colors disabled:opacity-50"
		>
			{#if saving}
				<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
				Kaydediliyor…
			{:else}
				Kaydet
			{/if}
		</button>
	</div>
</Modal>
