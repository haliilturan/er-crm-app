<script lang="ts">
	import { untrack } from 'svelte';
	import { db, id as genId, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Modal, Select, TextInput, TextArea, NumberInput } from '$lib/components/ui';

	export type SavedProduct = {
		id: string;
		name: string;
		sku: string;
		brandName: string;
		category: string;
	};

	export type EditableProduct = {
		id: string;
		name?: string;
		sku?: string;
		firm?: string;
		brandName?: string;
		category?: string;
		applicationArea?: string;
		description?: string;
		descTR?: string;
		descEN?: string;
		descRU?: string;
		descAR?: string;
		descFR?: string;
		photo?: string;
		technicalDrawing?: string;
		technicalDescription?: string;
		includedParts?: string;
		type?: string;
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
		baseWidth?: number;
		baseLength?: number;
		baseHeight?: number;
		holeDistanceX?: number;
		holeDistanceY?: number;
	};

	let {
		open,
		companyId,
		onSaved = () => {},
		onclose,
		editProduct = null,
		deriveProduct = null,
		initialCategory = '',
		initialProductType = null,
		quoteMode = false,
		quoteSourceProduct = null,
		onAddToQuote = undefined,
		onSaveAndAdd = undefined,
		draftMode = false,
	}: {
		open: boolean;
		companyId: string;
		onSaved?: (p: SavedProduct) => void;
		onclose: () => void;
		editProduct?: EditableProduct | null;
		deriveProduct?: EditableProduct | null;
		initialCategory?: string;
		initialProductType?: 'ready' | 'custom' | null;
		quoteMode?: boolean;
		quoteSourceProduct?: EditableProduct | null;
		onAddToQuote?: () => void;
		onSaveAndAdd?: (p: SavedProduct) => void;
		draftMode?: boolean;
	} = $props();

	let brands = $state<{ id: string; name: string }[]>([]);

	$effect(() => {
		const cId = companyId;
		if (!cId) return;
		return db.subscribeQuery(
			{ brands: { $: { where: { companyId: cId }, order: { name: 'asc' } } } },
			(res) => {
				untrack(() => {
					brands = (res.data?.brands ?? []) as { id: string; name: string }[];
				});
			}
		);
	});

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

	const BASE_MATERIALS = [
		'PE Çubuk', 'PE100 Levha', 'PE500 Levha', 'PE1000 Levha', 'PP Levha',
		'PP Çubuk', 'PVC Levha', 'PVC Çubuk', 'DELRİN', 'POLYAMID', 'AHŞAP', 'SUNTA', 'MDF'
	];

	const ENCODER_DIAMETERS = ['3', '3.5', '4', '4.5', '4.8', '6', '6.5', '6.8', '7', '7.5'];

	const BRISTLE_MATERIALS = [
		'PP', 'PBT', 'Pet', 'PVC', 'PE Nylon', 'Nylon 6 Avrupa', 'Nylon 6 Çin',
		'Nylon 6.6', 'Nylon 6.10', 'Nylon 6.12', 'At Yele Beyaz', 'At Yele Kırçıllı',
		'At Kuyruk', 'Keçi Kılı', 'Domuz Kılı', 'Samur Kılı', 'Sığır Kılı', 'Tampiko',
		'Palmira', 'Pirinç Tel', 'Paslanmaz Çelik Tel', 'Çelik Tel', 'Bronz Tel', 'Abrasive Nylon'
	];

	const BRISTLE_THICKNESSES = [
		'0.15', '0.20', '0.25', '0.30', '0.35', '0.40', '0.50', '0.60', '0.70',
		'0.80', '0.90', '1.00', '1.10', '1.20', '1.30', '1.40', '1.50', '2.00',
		'2.20', '2.40', '2.60', '2.80', '3.00'
	];

	const WIRE_DIAMETERS = ['0.6', '0.8', '1', '1.2'];

	type PartRow = { tempId: string; name: string; quantity: number; partType: string };

	// ── Existing state ────────────────────────────────────────────────────────────
	let productId        = $state(genId());
	let sku              = $state('');
	let name             = $state('');
	let brandName        = $state('');
	let category         = $state('');
	let applicationArea  = $state('');
	let description      = $state('');
	let descTR           = $state('');
	let descEN           = $state('');
	let descRU           = $state('');
	let descAR           = $state('');
	let descFR           = $state('');
	let activeDescLangs  = $state<string[]>(['TR']);
	let photo            = $state('');
	let technicalDrawing = $state('');
	let technicalDescr   = $state('');
	let parts            = $state<PartRow[]>([]);
	let saving           = $state(false);
	let errorMsg         = $state('');

	// ── Brush-specific state ──────────────────────────────────────────────────────
	let productType          = $state<'ready' | 'custom'>('ready');
	let brushType            = $state('');
	let brushWidth           = $state(0);
	let brushLength          = $state(0);
	let brushHeight          = $state(0);
	let processingType       = $state('');
	let trimmingType         = $state('');
	let baseMaterial         = $state('');
	let encoderDiameter      = $state('');
	let bristleMaterial      = $state('');
	let bristleThickness     = $state('');
	let bristleLength        = $state(0);
	let wireDiameter         = $state('');
	let specialProcess       = $state(false);
	let externalProcess      = $state(0);
	let extraEquipment       = $state(0);
	let packaging            = $state(0);
	let bristleInsertionTime = $state(0);
	let bristleTrimmingTime  = $state(0);
	let baseProcessingTime   = $state(0);
	let packagingTime        = $state(0);
	let highPotential        = $state(false);
	let urgentProduction     = $state(false);
	let orderQuantity        = $state(0);
	let baseWidth            = $state(0);
	let baseLength           = $state(0);
	let baseHeight           = $state(0);
	let holeDistanceX        = $state(0);
	let holeDistanceY        = $state(0);

	const isDirty = $derived.by(() => {
		if (!quoteMode || !quoteSourceProduct) return false;
		const src = quoteSourceProduct;
		return (
			name.trim()            !== (src.name                  ?? '').trim()  ||
			sku.trim()             !== (src.sku                   ?? '').trim()  ||
			brandName.trim()       !== (src.brandName             ?? '').trim() ||
			category               !== (src.category              ?? '')         ||
			applicationArea.trim() !== (src.applicationArea       ?? '').trim() ||
			description.trim()     !== (src.description           ?? '').trim() ||
			descTR.trim()          !== (src.descTR                ?? '').trim() ||
			descEN.trim()          !== (src.descEN                ?? '').trim() ||
			descRU.trim()          !== (src.descRU                ?? '').trim() ||
			descAR.trim()          !== (src.descAR                ?? '').trim() ||
			descFR.trim()          !== (src.descFR                ?? '').trim() ||
			technicalDescr.trim()  !== (src.technicalDescription  ?? '').trim() ||
			productType            !== (src.type === 'custom' ? 'custom' : 'ready') ||
			brushType              !== (src.brushType             ?? '')         ||
			brushWidth             !== (src.brushWidth            ?? 0)          ||
			brushLength            !== (src.brushLength           ?? 0)          ||
			brushHeight            !== (src.brushHeight           ?? 0)          ||
			processingType         !== (src.processingType        ?? '')         ||
			trimmingType           !== (src.trimmingType          ?? '')         ||
			baseMaterial           !== (src.baseMaterial          ?? '')         ||
			encoderDiameter        !== (src.encoderDiameter       ?? '')         ||
			bristleMaterial        !== (src.bristleMaterial       ?? '')         ||
			bristleThickness       !== (src.bristleThickness      ?? '')         ||
			bristleLength          !== (src.bristleLength         ?? 0)          ||
			wireDiameter           !== (src.wireDiameter          ?? '')         ||
			specialProcess         !== (src.specialProcess        ?? false)      ||
			externalProcess        !== (src.externalProcess       ?? 0)          ||
			extraEquipment         !== (src.extraEquipment        ?? 0)          ||
			packaging              !== (src.packaging             ?? 0)          ||
			bristleInsertionTime   !== (src.bristleInsertionTime  ?? 0)          ||
			bristleTrimmingTime    !== (src.bristleTrimmingTime   ?? 0)          ||
			baseProcessingTime     !== (src.baseProcessingTime    ?? 0)          ||
			packagingTime          !== (src.packagingTime         ?? 0)          ||
			highPotential          !== (src.highPotential         ?? false)      ||
			urgentProduction       !== (src.urgentProduction      ?? false)      ||
			orderQuantity          !== (src.orderQuantity         ?? 0)          ||
			baseWidth              !== (src.baseWidth             ?? 0)          ||
			baseLength             !== (src.baseLength            ?? 0)          ||
			baseHeight             !== (src.baseHeight            ?? 0)          ||
			holeDistanceX          !== (src.holeDistanceX         ?? 0)          ||
			holeDistanceY          !== (src.holeDistanceY         ?? 0)          ||
			photo                  !== (src.photo                 ?? '')         ||
			technicalDrawing       !== (src.technicalDrawing      ?? '')
		);
	});

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
			productId            = genId();
			sku                  = '';
			name                 = '';
			brandName            = '';
			category             = '';
			applicationArea      = '';
			description          = '';
			descTR               = '';
			descEN               = '';
			descRU               = '';
			descAR               = '';
			descFR               = '';
			activeDescLangs      = ['TR'];
			photo                = '';
			technicalDrawing     = '';
			technicalDescr       = '';
			parts                = [];
			errorMsg             = '';
			saving               = false;
			productType          = 'ready';
			brushType            = '';
			brushWidth           = 0;
			brushLength          = 0;
			brushHeight          = 0;
			processingType       = '';
			trimmingType         = '';
			baseMaterial         = '';
			encoderDiameter      = '';
			bristleMaterial      = '';
			bristleThickness     = '';
			bristleLength        = 0;
			wireDiameter         = '';
			specialProcess       = false;
			externalProcess      = 0;
			extraEquipment       = 0;
			packaging            = 0;
			bristleInsertionTime = 0;
			bristleTrimmingTime  = 0;
			baseProcessingTime   = 0;
			packagingTime        = 0;
			highPotential        = false;
			urgentProduction     = false;
			orderQuantity        = 0;
			baseWidth            = 0;
			baseLength           = 0;
			baseHeight           = 0;
			holeDistanceX        = 0;
			holeDistanceY        = 0;
		}
	});

	$effect(() => {
		if (open && deriveProduct) {
			productId            = genId();
			name                 = deriveProduct.name             ?? '';
			sku                  = 'COPY-' + genId().slice(0, 8).toUpperCase();
			brandName            = deriveProduct.brandName         ?? deriveProduct.firm ?? '';
			category             = deriveProduct.category         ?? '';
			applicationArea      = deriveProduct.applicationArea  ?? '';
			description          = deriveProduct.description      ?? '';
			descTR               = deriveProduct.descTR           ?? '';
			descEN               = deriveProduct.descEN           ?? '';
			descRU               = deriveProduct.descRU           ?? '';
			descAR               = deriveProduct.descAR           ?? '';
			descFR               = deriveProduct.descFR           ?? '';
			photo                = deriveProduct.photo            ?? '';
			technicalDrawing     = deriveProduct.technicalDrawing ?? '';
			technicalDescr       = deriveProduct.technicalDescription ?? '';
			productType          = deriveProduct.type === 'custom' ? 'custom' : 'ready';
			brushType            = deriveProduct.brushType            ?? '';
			brushWidth           = deriveProduct.brushWidth           ?? 0;
			brushLength          = deriveProduct.brushLength          ?? 0;
			brushHeight          = deriveProduct.brushHeight          ?? 0;
			processingType       = deriveProduct.processingType       ?? '';
			trimmingType         = deriveProduct.trimmingType         ?? '';
			baseMaterial         = deriveProduct.baseMaterial         ?? '';
			encoderDiameter      = deriveProduct.encoderDiameter      ?? '';
			bristleMaterial      = deriveProduct.bristleMaterial      ?? '';
			bristleThickness     = deriveProduct.bristleThickness     ?? '';
			bristleLength        = deriveProduct.bristleLength        ?? 0;
			wireDiameter         = deriveProduct.wireDiameter         ?? '';
			specialProcess       = deriveProduct.specialProcess       ?? false;
			externalProcess      = deriveProduct.externalProcess      ?? 0;
			extraEquipment       = deriveProduct.extraEquipment       ?? 0;
			packaging            = deriveProduct.packaging            ?? 0;
			bristleInsertionTime = deriveProduct.bristleInsertionTime ?? 0;
			bristleTrimmingTime  = deriveProduct.bristleTrimmingTime  ?? 0;
			baseProcessingTime   = deriveProduct.baseProcessingTime   ?? 0;
			packagingTime        = deriveProduct.packagingTime        ?? 0;
			highPotential        = deriveProduct.highPotential        ?? false;
			urgentProduction     = deriveProduct.urgentProduction     ?? false;
			orderQuantity        = deriveProduct.orderQuantity        ?? 0;
			baseWidth            = deriveProduct.baseWidth            ?? 0;
			baseLength           = deriveProduct.baseLength           ?? 0;
			baseHeight           = deriveProduct.baseHeight           ?? 0;
			holeDistanceX        = deriveProduct.holeDistanceX        ?? 0;
			holeDistanceY        = deriveProduct.holeDistanceY        ?? 0;
			if (deriveProduct.includedParts) {
				try {
					const parsed = JSON.parse(deriveProduct.includedParts) as Array<{ name: string; quantity: number; type?: string }>;
					parts = parsed.map((p, i) => ({
						tempId: `derive-${i}`,
						name: p.name,
						quantity: p.quantity,
						partType: p.type ?? 'hazir'
					}));
				} catch {
					parts = [];
				}
			} else {
				parts = [];
			}
		}
	});

	$effect(() => {
		if (open && !editProduct && !deriveProduct && initialCategory) {
			category    = initialCategory;
			productType = initialProductType ?? 'ready';
		}
	});

	$effect(() => {
		if (open && quoteMode && quoteSourceProduct) {
			const src = quoteSourceProduct;
			productId            = genId();
			name                 = src.name                  ?? '';
			sku                  = src.sku                   ?? '';
			brandName            = src.brandName               ?? src.firm ?? '';
			category             = src.category              ?? '';
			applicationArea      = src.applicationArea       ?? '';
			description          = src.description           ?? '';
			descTR               = src.descTR                ?? '';
			descEN               = src.descEN                ?? '';
			descRU               = src.descRU                ?? '';
			descAR               = src.descAR                ?? '';
			descFR               = src.descFR                ?? '';
			activeDescLangs      = ['TR',
				...(src.descEN ? ['EN'] : []),
				...(src.descRU ? ['RU'] : []),
				...(src.descAR ? ['AR'] : []),
				...(src.descFR ? ['FR'] : []),
			];
			photo                = src.photo                 ?? '';
			technicalDrawing     = src.technicalDrawing      ?? '';
			technicalDescr       = src.technicalDescription  ?? '';
			productType          = src.type === 'custom' ? 'custom' : 'ready';
			brushType            = src.brushType             ?? '';
			brushWidth           = src.brushWidth            ?? 0;
			brushLength          = src.brushLength           ?? 0;
			brushHeight          = src.brushHeight           ?? 0;
			processingType       = src.processingType        ?? '';
			trimmingType         = src.trimmingType          ?? '';
			baseMaterial         = src.baseMaterial          ?? '';
			encoderDiameter      = src.encoderDiameter       ?? '';
			bristleMaterial      = src.bristleMaterial       ?? '';
			bristleThickness     = src.bristleThickness      ?? '';
			bristleLength        = src.bristleLength         ?? 0;
			wireDiameter         = src.wireDiameter          ?? '';
			specialProcess       = src.specialProcess        ?? false;
			externalProcess      = src.externalProcess       ?? 0;
			extraEquipment       = src.extraEquipment        ?? 0;
			packaging            = src.packaging             ?? 0;
			bristleInsertionTime = src.bristleInsertionTime  ?? 0;
			bristleTrimmingTime  = src.bristleTrimmingTime   ?? 0;
			baseProcessingTime   = src.baseProcessingTime    ?? 0;
			packagingTime        = src.packagingTime         ?? 0;
			highPotential        = src.highPotential         ?? false;
			urgentProduction     = src.urgentProduction      ?? false;
			orderQuantity        = src.orderQuantity         ?? 0;
			baseWidth            = src.baseWidth             ?? 0;
			baseLength           = src.baseLength            ?? 0;
			baseHeight           = src.baseHeight            ?? 0;
			holeDistanceX        = src.holeDistanceX         ?? 0;
			holeDistanceY        = src.holeDistanceY         ?? 0;
			if (src.includedParts) {
				try {
					const parsed = JSON.parse(src.includedParts) as Array<{ name: string; quantity: number; type?: string }>;
					parts = parsed.map((p, i) => ({
						tempId: `qsrc-${i}`,
						name: p.name,
						quantity: p.quantity,
						partType: p.type ?? 'hazir'
					}));
				} catch {
					parts = [];
				}
			} else {
				parts = [];
			}
		}
	});

	$effect(() => {
		if (open && editProduct && !deriveProduct) {
			productId            = editProduct.id;
			name                 = editProduct.name             ?? '';
			sku                  = editProduct.sku              ?? '';
			brandName            = editProduct.brandName         ?? editProduct.firm ?? '';
			category             = editProduct.category         ?? '';
			applicationArea      = editProduct.applicationArea  ?? '';
			description          = editProduct.description      ?? '';
			descTR               = editProduct.descTR           ?? '';
			descEN               = editProduct.descEN           ?? '';
			descRU               = editProduct.descRU           ?? '';
			descAR               = editProduct.descAR           ?? '';
			descFR               = editProduct.descFR           ?? '';
			photo                = editProduct.photo            ?? '';
			technicalDrawing     = editProduct.technicalDrawing ?? '';
			technicalDescr       = editProduct.technicalDescription ?? '';
			productType          = editProduct.type === 'custom' ? 'custom' : 'ready';
			brushType            = editProduct.brushType            ?? '';
			brushWidth           = editProduct.brushWidth           ?? 0;
			brushLength          = editProduct.brushLength          ?? 0;
			brushHeight          = editProduct.brushHeight          ?? 0;
			processingType       = editProduct.processingType       ?? '';
			trimmingType         = editProduct.trimmingType         ?? '';
			baseMaterial         = editProduct.baseMaterial         ?? '';
			encoderDiameter      = editProduct.encoderDiameter      ?? '';
			bristleMaterial      = editProduct.bristleMaterial      ?? '';
			bristleThickness     = editProduct.bristleThickness     ?? '';
			bristleLength        = editProduct.bristleLength        ?? 0;
			wireDiameter         = editProduct.wireDiameter         ?? '';
			specialProcess       = editProduct.specialProcess       ?? false;
			externalProcess      = editProduct.externalProcess      ?? 0;
			extraEquipment       = editProduct.extraEquipment       ?? 0;
			packaging            = editProduct.packaging            ?? 0;
			bristleInsertionTime = editProduct.bristleInsertionTime ?? 0;
			bristleTrimmingTime  = editProduct.bristleTrimmingTime  ?? 0;
			baseProcessingTime   = editProduct.baseProcessingTime   ?? 0;
			packagingTime        = editProduct.packagingTime        ?? 0;
			highPotential        = editProduct.highPotential        ?? false;
			urgentProduction     = editProduct.urgentProduction     ?? false;
			orderQuantity        = editProduct.orderQuantity        ?? 0;
			baseWidth            = editProduct.baseWidth            ?? 0;
			baseLength           = editProduct.baseLength           ?? 0;
			baseHeight           = editProduct.baseHeight           ?? 0;
			holeDistanceX        = editProduct.holeDistanceX        ?? 0;
			holeDistanceY        = editProduct.holeDistanceY        ?? 0;
			if (editProduct.includedParts) {
				try {
					const parsed = JSON.parse(editProduct.includedParts) as Array<{ name: string; quantity: number; type?: string }>;
					parts = parsed.map((p, i) => ({
						tempId: `edit-${i}`,
						name: p.name,
						quantity: p.quantity,
						partType: p.type ?? 'hazir'
					}));
				} catch {
					parts = [];
				}
			} else {
				parts = [];
			}
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

	async function addToQuote() {
		if (quoteMode && !quoteSourceProduct) {
			await save();
		} else {
			onAddToQuote?.();
			onclose();
		}
	}

	async function saveAndAdd() {
		if (!isDirty || !quoteSourceProduct) return;
		if (!name.trim()) { errorMsg = 'Ürün adı zorunludur.'; return; }
		if (!sku.trim())  { errorMsg = 'SKU zorunludur.'; return; }
		const pid = productId.trim();
		if (!pid) { errorMsg = 'Ürün ID boş olamaz.'; return; }
		saving   = true;
		errorMsg = '';
		try {
			const skuVal = sku.trim();
			const validParts = parts.filter((p) => p.name.trim());
			const includedParts = validParts.length
				? JSON.stringify(validParts.map((p) => ({ name: p.name.trim(), quantity: p.quantity, type: p.partType })))
				: undefined;

			await db.transact([
				(tx.products[pid] as any).update({
					name:                 name.trim(),
					nameSearch:           normalize(name.trim()),
					sku:                  skuVal,
					brandName:            brandName.trim()        || undefined,
					category:             category                || undefined,
					applicationArea:      applicationArea.trim()  || undefined,
					description:          description.trim()      || undefined,
					descTR:               descTR.trim()           || undefined,
					descEN:               descEN.trim()           || undefined,
					descRU:               descRU.trim()           || undefined,
					descAR:               descAR.trim()           || undefined,
					descFR:               descFR.trim()           || undefined,
					photo:                photo                   || undefined,
					technicalDrawing:     technicalDrawing        || undefined,
					technicalDescription: technicalDescr.trim()   || undefined,
					includedParts,
					type:             productType,
					status:           'active',
					vatRate:          20,
					unit:             'Adet',
					companyId,
					sourceProductId:  quoteSourceProduct.id,
					createdBy:        authStore.userId!,
					createdAt:        Date.now(),
					...(productType === 'custom' ? {
						brushType:            brushType                       || undefined,
						brushWidth:           brushWidth > 0                  ? brushWidth           : undefined,
						brushLength:          brushLength > 0                 ? brushLength          : undefined,
						brushHeight:          brushHeight > 0                 ? brushHeight          : undefined,
						processingType:       processingType                  || undefined,
						trimmingType:         trimmingType                    || undefined,
						baseMaterial:         baseMaterial                    || undefined,
						encoderDiameter:      encoderDiameter                 || undefined,
						bristleMaterial:      bristleMaterial                 || undefined,
						bristleThickness:     bristleThickness                || undefined,
						bristleLength:        bristleLength > 0               ? bristleLength        : undefined,
						wireDiameter:         wireDiameter                    || undefined,
						specialProcess:       specialProcess                  || undefined,
						externalProcess:      externalProcess > 0             ? externalProcess      : undefined,
						extraEquipment:       extraEquipment > 0              ? extraEquipment       : undefined,
						packaging:            packaging > 0                   ? packaging            : undefined,
						bristleInsertionTime: bristleInsertionTime > 0        ? bristleInsertionTime : undefined,
						bristleTrimmingTime:  bristleTrimmingTime > 0         ? bristleTrimmingTime  : undefined,
						baseProcessingTime:   baseProcessingTime > 0          ? baseProcessingTime   : undefined,
						packagingTime:        packagingTime > 0               ? packagingTime        : undefined,
						highPotential:        highPotential                   || undefined,
						urgentProduction:     urgentProduction                || undefined,
						orderQuantity:        orderQuantity > 0               ? orderQuantity        : undefined,
						baseWidth:            baseWidth > 0                   ? baseWidth            : undefined,
						baseLength:           baseLength > 0                  ? baseLength           : undefined,
						baseHeight:           baseHeight > 0                  ? baseHeight           : undefined,
						holeDistanceX:        holeDistanceX > 0               ? holeDistanceX        : undefined,
						holeDistanceY:        holeDistanceY > 0               ? holeDistanceY        : undefined,
					} : {})
				})
			]);
			onSaveAndAdd?.({ id: pid, name: name.trim(), sku: skuVal, brandName: brandName.trim(), category });
			onclose();
		} catch (err) {
			console.error('[ProductFormModal] saveAndAdd error:', err);
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	async function save() {
		if (!name.trim()) { errorMsg = 'Ürün adı zorunludur.'; return; }
		if (!sku.trim() && !draftMode) { errorMsg = 'SKU zorunludur.'; return; }
		const pid = productId.trim();
		if (!pid) { errorMsg = 'Ürün ID boş olamaz.'; return; }
		saving   = true;
		errorMsg = '';
		try {
			const skuVal = sku.trim();
			const validParts = parts.filter((p) => p.name.trim());
			const includedParts = validParts.length
				? JSON.stringify(validParts.map((p) => ({ name: p.name.trim(), quantity: p.quantity, type: p.partType })))
				: undefined;

			await db.transact([
				(tx.products[pid] as any).update({
					name:                 name.trim(),
					nameSearch:           normalize(name.trim()),
					sku:                  skuVal,
					brandName:            brandName.trim()        || undefined,
					category:             category                || undefined,
					applicationArea:      applicationArea.trim()  || undefined,
					description:          description.trim()      || undefined,
					descTR:               descTR.trim()           || undefined,
					descEN:               descEN.trim()           || undefined,
					descRU:               descRU.trim()           || undefined,
					descAR:               descAR.trim()           || undefined,
					descFR:               descFR.trim()           || undefined,
					photo:                photo                   || undefined,
					technicalDrawing:     technicalDrawing        || undefined,
					technicalDescription: technicalDescr.trim()   || undefined,
					includedParts,
					type:      productType,
					status:    draftMode ? 'draft' : 'active',
					vatRate:   20,
					unit:      'Adet',
					companyId,
					...(editProduct && !deriveProduct
						? { updatedBy: authStore.userId!, updatedAt: Date.now() }
						: { createdBy: authStore.userId!, createdAt: Date.now() }),
					...(deriveProduct ? { sourceProductId: deriveProduct.id } : {}),
					...(productType === 'custom' ? {
						brushType:            brushType                       || undefined,
						brushWidth:           brushWidth > 0                  ? brushWidth           : undefined,
						brushLength:          brushLength > 0                 ? brushLength          : undefined,
						brushHeight:          brushHeight > 0                 ? brushHeight          : undefined,
						processingType:       processingType                  || undefined,
						trimmingType:         trimmingType                    || undefined,
						baseMaterial:         baseMaterial                    || undefined,
						encoderDiameter:      encoderDiameter                 || undefined,
						bristleMaterial:      bristleMaterial                 || undefined,
						bristleThickness:     bristleThickness                || undefined,
						bristleLength:        bristleLength > 0               ? bristleLength        : undefined,
						wireDiameter:         wireDiameter                    || undefined,
						specialProcess:       specialProcess                  || undefined,
						externalProcess:      externalProcess > 0             ? externalProcess      : undefined,
						extraEquipment:       extraEquipment > 0              ? extraEquipment       : undefined,
						packaging:            packaging > 0                   ? packaging            : undefined,
						bristleInsertionTime: bristleInsertionTime > 0        ? bristleInsertionTime : undefined,
						bristleTrimmingTime:  bristleTrimmingTime > 0         ? bristleTrimmingTime  : undefined,
						baseProcessingTime:   baseProcessingTime > 0          ? baseProcessingTime   : undefined,
						packagingTime:        packagingTime > 0               ? packagingTime        : undefined,
						highPotential:        highPotential                   || undefined,
						urgentProduction:     urgentProduction                || undefined,
						orderQuantity:        orderQuantity > 0               ? orderQuantity        : undefined,
						baseWidth:            baseWidth > 0                   ? baseWidth            : undefined,
						baseLength:           baseLength > 0                  ? baseLength           : undefined,
						baseHeight:           baseHeight > 0                  ? baseHeight           : undefined,
						holeDistanceX:        holeDistanceX > 0               ? holeDistanceX        : undefined,
						holeDistanceY:        holeDistanceY > 0               ? holeDistanceY        : undefined,
					} : {})
				})
			]);
			onSaved({ id: pid, name: name.trim(), sku: skuVal, brandName: brandName.trim(), category });
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
				<p class="text-sm font-semibold text-white">{quoteMode && quoteSourceProduct ? 'Ürün İncele' : quoteMode ? 'Elle Ürün Ekle' : deriveProduct ? 'Ürün Türet' : editProduct ? 'Ürün Düzenle' : 'Ürün Ekle'}</p>
				<p class="text-xs text-[#555] mt-0.5">{quoteMode && quoteSourceProduct ? 'Düzenleyip taslak olarak da kaydedebilirsiniz' : quoteMode ? 'Ürün bilgilerini girin ve teklife ekleyin' : deriveProduct ? `Kaynak: ${deriveProduct.id.slice(0, 8)}…` : editProduct ? `ID: ${editProduct.id.slice(0, 8)}…` : "products namespace'ine kalıcı olarak kaydedilecek"}</p>
			</div>
			<button
				type="button"
				onclick={onclose}
				class="text-gray-500 hover:text-white transition-colors text-lg leading-none w-6 h-6 flex items-center justify-center"
			>✕</button>
		</div>
	</div>

	<!-- Scrollable form -->
	<div
		class="flex-1 overflow-y-auto px-5 py-4"
		style="max-height: 65vh; scrollbar-width: thin;"
	>
		{#if errorMsg}
			<div class="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-400">{errorMsg}</div>
		{/if}

		<!-- Existing form fields -->
		<div class="flex flex-col gap-3.5">
			<!-- SKU + Ürün Adı -->
			<div class="grid grid-cols-2 gap-3">
				<TextInput label="SKU / Ürün Kod *" bind:value={sku} placeholder="SKU giriniz" />
				<TextInput label="Ürün Adı *" bind:value={name} placeholder="Ürün adını girin" required />
			</div>

			<!-- Marka + Kategori -->
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1">
					<label class="text-xs text-gray-500">Marka</label>
					{#if quoteMode && quoteSourceProduct}
						<p class="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-gray-400">
							{brandName || '—'}
						</p>
					{:else}
						<select
							bind:value={brandName}
							class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm
								text-white focus:border-[#555] focus:outline-none
								[&>option]:bg-[#1a1a1a] [&>option]:text-white"
						>
							<option value="">Seçiniz...</option>
							{#each brands as b (b.id)}
								<option value={b.name}>{b.name}</option>
							{/each}
						</select>
					{/if}
				</div>
				<Select label="Kategori" bind:value={category} options={CATEGORIES} placeholder="Seçin..." />
			</div>

			<!-- Uygulama Alanı -->
			<TextInput
				label="Uygulama Alanı"
				bind:value={applicationArea}
				placeholder="Örn: Halı yıkama makinaları için"
			/>

			<!-- Açıklama (multilingual) -->
			<div class="flex flex-col gap-1.5">
				<span class="text-xs text-gray-500">Açıklama</span>
				<div class="flex gap-1">
					{#each [
						{ code: 'TR', label: 'Türkçe'    },
						{ code: 'EN', label: 'English'   },
						{ code: 'RU', label: 'Русский'   },
						{ code: 'AR', label: 'العربية'   },
						{ code: 'FR', label: 'Français'  },
					] as { code, label } (code)}
						{@const active = activeDescLangs.includes(code)}
						<button
							type="button"
							onclick={() => {
								activeDescLangs = active
									? activeDescLangs.filter(l => l !== code)
									: [...activeDescLangs, code];
							}}
							class="rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors
								{active
									? 'border-[#444] bg-[#2a2a2a] text-white'
									: 'border-[#2a2a2a] bg-transparent text-[#555] hover:border-[#333] hover:text-[#888]'}"
						>{code}</button>
					{/each}
				</div>
				<div class="flex flex-col gap-2">
					{#if activeDescLangs.includes('TR')}
						<div>
							<p class="mb-1 text-[10px] text-[#555]">Türkçe</p>
							<textarea bind:value={descTR} placeholder="Türkçe açıklama..." rows={2}
								class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"></textarea>
						</div>
					{/if}
					{#if activeDescLangs.includes('EN')}
						<div>
							<p class="mb-1 text-[10px] text-[#555]">English</p>
							<textarea bind:value={descEN} placeholder="English description..." rows={2}
								class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"></textarea>
						</div>
					{/if}
					{#if activeDescLangs.includes('RU')}
						<div>
							<p class="mb-1 text-[10px] text-[#555]">Русский</p>
							<textarea bind:value={descRU} placeholder="Описание на русском..." rows={2}
								class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"></textarea>
						</div>
					{/if}
					{#if activeDescLangs.includes('AR')}
						<div>
							<p class="mb-1 text-[10px] text-[#555]">العربية</p>
							<textarea bind:value={descAR} placeholder="الوصف بالعربية..." rows={2} dir="rtl"
								class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none text-right"></textarea>
						</div>
					{/if}
					{#if activeDescLangs.includes('FR')}
						<div>
							<p class="mb-1 text-[10px] text-[#555]">Français</p>
							<textarea bind:value={descFR} placeholder="Description en français..." rows={2}
								class="w-full resize-none rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"></textarea>
						</div>
					{/if}
					{#if activeDescLangs.length === 0}
						<p class="py-1 text-[11px] text-[#444]">Dil seçmek için yukarıdaki butonları kullanın.</p>
					{/if}
				</div>
			</div>

			<!-- Fotoğraf + Teknik Resim -->
			<div class="grid grid-cols-2 gap-3">
				<!-- Fotoğraf -->
				<div class="flex flex-col gap-1.5">
					<span class="text-xs text-gray-500">Fotoğraf</span>
					<label class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] cursor-pointer transition-colors overflow-hidden">
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
					<label class="flex flex-col items-center justify-center gap-1 h-24 rounded-xl border border-dashed border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] cursor-pointer transition-colors overflow-hidden">
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
						class="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2a2a2a] text-xs text-gray-400 hover:text-white hover:border-[#444] transition-colors"
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
		<!-- END existing fields -->

		<!-- ── Brush-specific sections (custom mode only) ───────────────────── -->
		{#if productType === 'custom'}
		<div class="mt-5 pt-5 border-t border-[#2a2a2a] flex flex-col gap-5">

				<!-- Section 1: Fırça Modeli -->
				<div>
					<p class="text-sm font-bold text-white">Fırça Modeli</p>
					<p class="text-xs text-gray-500 mt-0.5 mb-3">Fırçanın temel model özelliklerine ilişkin değerler</p>
					<div class="grid grid-cols-4 gap-2">

						<!-- Fırça Tipi -->
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Fırça Tipi</p>
							<div class="flex flex-col gap-1.5">
								{#each ['Silindir', 'Dairesel', 'Panel-Şerit'] as opt (opt)}
									<label class="flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											checked={brushType === opt}
											onchange={() => (brushType = brushType === opt ? '' : opt)}
											class="w-3.5 h-3.5 accent-white shrink-0"
										/>
										<span class="text-xs text-gray-300 leading-tight">{opt}</span>
									</label>
								{/each}
							</div>
						</div>

						<!-- Fırça Ölçüleri -->
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Fırça Ölçüleri</p>
							<div class="flex flex-col gap-1.5">
								<NumberInput label="En mm"      bind:value={brushWidth}  min={0} />
								<NumberInput label="Boy mm"     bind:value={brushLength} min={0} />
								<NumberInput label="Uzunluk mm" bind:value={brushHeight} min={0} />
							</div>
						</div>

						<!-- İşlenme Şekli -->
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">İşlenme Şekli</p>
							<div class="flex flex-col gap-1.5">
								{#each ['Düz', 'Helisel', 'Çavuş'] as opt (opt)}
									<label class="flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											checked={processingType === opt}
											onchange={() => (processingType = processingType === opt ? '' : opt)}
											class="w-3.5 h-3.5 accent-white shrink-0"
										/>
										<span class="text-xs text-gray-300 leading-tight">{opt}</span>
									</label>
								{/each}
							</div>
						</div>

						<!-- Tıraşlama Şekli -->
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Tıraşlama Şekli</p>
							<div class="flex flex-col gap-1.5">
								{#each ['Düz', 'Konik', 'Kademeli'] as opt (opt)}
									<label class="flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											checked={trimmingType === opt}
											onchange={() => (trimmingType = trimmingType === opt ? '' : opt)}
											class="w-3.5 h-3.5 accent-white shrink-0"
										/>
										<span class="text-xs text-gray-300 leading-tight">{opt}</span>
									</label>
								{/each}
							</div>
						</div>

					</div>
				</div>

				<!-- Section 2: Kıl Hesaplama -->
				<div>
					<p class="text-sm font-bold text-white">Kıl Hesaplama</p>
					<p class="text-xs text-gray-500 mt-0.5 mb-3">Fırçanın kıl özelliklerine ilişkin değerler</p>
					<div class="grid grid-cols-4 gap-2">

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Kıl Malzemesi</p>
							<Select label="" bind:value={bristleMaterial} options={BRISTLE_MATERIALS} placeholder="Lütfen Seçiniz" />
						</div>

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Kıl Kalınlığı</p>
							<Select label="" bind:value={bristleThickness} options={BRISTLE_THICKNESSES} placeholder="Lütfen Seçiniz" />
						</div>

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Kıl Boyu</p>
							<NumberInput label="L mm" bind:value={bristleLength} min={0} />
						</div>

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Tel</p>
							<Select label="" bind:value={wireDiameter} options={WIRE_DIAMETERS} placeholder="Lütfen Seçiniz" />
						</div>

					</div>
				</div>

				<!-- Section 3: Ek Özellikler -->
				<div>
					<p class="text-sm font-bold text-white">Ek Özellikler</p>
					<p class="text-xs text-gray-500 mt-0.5 mb-3">Fırçanın ek özellik ve işlemlerine ilişkin değerler</p>
					<div class="grid grid-cols-4 gap-2">

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Özel İşlem</p>
							<label class="flex items-start gap-1.5 cursor-pointer">
								<input type="checkbox" bind:checked={specialProcess} class="mt-0.5 w-3.5 h-3.5 accent-white shrink-0" />
								<span class="text-xs text-gray-300 leading-tight">Ek İşçilik Gerektirir</span>
							</label>
						</div>

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">İşletme Dışı İşlem</p>
							<NumberInput label="TL" bind:value={externalProcess} min={0} />
						</div>

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Ekstra Aparatlar</p>
							<NumberInput label="TL" bind:value={extraEquipment} min={0} />
						</div>

						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Ambalaj</p>
							<NumberInput label="TL" bind:value={packaging} min={0} />
						</div>

					</div>
				</div>


			<!-- Section 4: Taban Hesaplama -->
				<div>
					<p class="text-sm font-bold text-white mb-3">Taban Hesaplama</p>
					<div class="grid grid-cols-4 gap-2">
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Taban Malzemesi</p>
							<Select label="" bind:value={baseMaterial} options={BASE_MATERIALS} placeholder="Lütfen Seçiniz" />
						</div>
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Taban Ölçüleri</p>
							<div class="flex flex-col gap-2">
								<NumberInput label="En mm" bind:value={baseWidth} min={0} />
								<NumberInput label="Boy mm" bind:value={baseLength} min={0} />
								<NumberInput label="Uzunluk mm" bind:value={baseHeight} min={0} />
							</div>
						</div>
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Ensör Çapı</p>
							<Select label="" bind:value={encoderDiameter} options={ENCODER_DIAMETERS} placeholder="Lütfen Seçiniz" />
						</div>
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Delik Mesafesi</p>
							<div class="flex flex-col gap-2">
								<NumberInput label="Yatay mm" bind:value={holeDistanceX} min={0} />
								<NumberInput label="Dikey mm" bind:value={holeDistanceY} min={0} />
							</div>
						</div>
					</div>
				</div>

				<!-- Section 6: İşçilik Hesaplama -->
				<div>
					<div class="flex items-start justify-between gap-3 mb-3">
						<div>
							<p class="text-sm font-bold text-white">İşçilik Hesaplama</p>
							<p class="text-xs text-gray-500 mt-0.5">Üretim işçilik zamanlamasına ilişkin değerler</p>
						</div>
						<div class="flex flex-wrap items-center gap-1 justify-end shrink-0">
							<span class="text-[10px] text-gray-500">Öngörülen Süreler</span>
							<span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-950/60 text-blue-300">Çakım: {bristleInsertionTime}dk</span>
							<span class="px-1.5 py-0.5 rounded text-[10px] bg-purple-950/60 text-purple-300">Tıraş: {bristleTrimmingTime}dk</span>
							<span class="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300">Taban: {baseProcessingTime}dk</span>
							<span class="px-1.5 py-0.5 rounded text-[10px] bg-green-950/60 text-green-300">Paket: {packagingTime}dk</span>
						</div>
					</div>
					<div class="grid grid-cols-4 gap-2">
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Kıl Çakım Süresi</p>
							<NumberInput label="Dakika" bind:value={bristleInsertionTime} min={0} />
						</div>
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Kıl Tıraşlama Süresi</p>
							<NumberInput label="Dakika" bind:value={bristleTrimmingTime} min={0} />
						</div>
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Taban İşlem Süresi</p>
							<NumberInput label="Dakika" bind:value={baseProcessingTime} min={0} />
						</div>
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Paketleme Süresi</p>
							<NumberInput label="Dakika" bind:value={packagingTime} min={0} />
						</div>
					</div>
				</div>

				<!-- Section 7: Üretim Bilgileri -->
				<div>
					<p class="text-sm font-bold text-white">Üretim Bilgileri</p>
					<p class="text-xs text-gray-500 mt-0.5 mb-3">Ürünün üretim önceliğine ilişkin değerler</p>
					<div class="grid grid-cols-3 gap-2">
						<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-3">
							<p class="text-[11px] font-medium text-gray-500 mb-2">Üretim Önceliği</p>
							<label class="flex items-start gap-1.5 cursor-pointer">
								<input type="checkbox" bind:checked={urgentProduction} class="mt-0.5 w-3.5 h-3.5 accent-white shrink-0" />
								<span class="text-xs text-gray-300 leading-tight">Acil Üretim</span>
							</label>
						</div>
					</div>
				</div>

		</div>
		{/if}
		<!-- END brush sections -->

	</div>

	<!-- Footer -->
	<div class="shrink-0 flex items-center justify-end gap-2 border-t border-[#2a2a2a] px-5 py-3">
		{#if quoteMode}
			{#if quoteSourceProduct}
			<button
				type="button"
				disabled={!isDirty || saving}
				onclick={saveAndAdd}
				class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors
					{isDirty && !saving ? 'border border-amber-800 text-amber-400 hover:bg-amber-950/30' : 'border border-[#2a2a2a] text-gray-600 cursor-not-allowed opacity-50'}"
			>
				{#if saving}
					<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					Kaydediliyor…
				{:else}
					Taslak Kaydet ve Ekle
				{/if}
			</button>
			{/if}
			<button
				type="button"
				onclick={addToQuote}
				class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-[#e8e8e8] transition-colors"
			>
				Ürün Ekle
			</button>
		{:else}
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
					{deriveProduct ? 'Yeni Taslak Olarak Kaydet' : 'Kaydet'}
				{/if}
			</button>
		{/if}
	</div>
</Modal>
