<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Tabs, Button, Badge, Avatar } from '$lib/components/ui';
	import QuoteForm from '$lib/components/teklifler/QuoteForm.svelte';

	// ─── Props ────────────────────────────────────────────────────────────────
	let {
		customerId,
		onedit
	}: {
		customerId: string;
		onedit?: (id: string) => void;
	} = $props();

	// ─── Types ────────────────────────────────────────────────────────────────
	type CustomerRow = {
		id: string;
		name: string;
		phone: string;
		email?: string;
		country?: string;
		city?: string;
		address?: string;
		taxNumber?: string;
		companyType: string;
		status: string;
		source?: string;
		contactName?: string;
		contactTitle?: string;
		createdAt: number;
	};

	type NoteRow = {
		id: string;
		title?: string;
		content: string;
		createdBy: string;
		createdAt: number;
		author?: { id: string; fullName: string };
	};

	type QuoteRow = {
		id: string;
		quoteNumber: string;
		status: string;
		currency: string;
		totalWithVat: number;
		subtotal?: number;
		totalVat?: number;
		notes?: string;
		createdAt: number;
		items?: any[];
	};

	type OrderRow = {
		id: string;
		orderNumber: string;
		status: string;
		currency: string;
		totalWithVat: number;
		subtotal?: number;
		totalVat?: number;
		notes?: string;
		createdAt: number;
		items?: any[];
	};

	type LangCode = 'tr' | 'en' | 'ru' | 'ar' | 'fr';
	type LangDict = {
		quote: string; order: string;
		quoteNo: string; orderNo: string;
		date: string; customer: string;
		product: string; qty: string; unitPrice: string; total: string;
		subtotal: string; vat: string; grandTotal: string;
		included: string; notes: string;
	};

	// ─── PDF i18n ─────────────────────────────────────────────────────────────
	const LANGS: { code: LangCode; label: string; flag: string }[] = [
		{ code: 'tr', label: 'Türkçe',  flag: '🇹🇷' },
		{ code: 'en', label: 'English', flag: '🇬🇧' },
		{ code: 'ru', label: 'Русский', flag: '🇷🇺' },
		{ code: 'ar', label: 'العربية', flag: '🇸🇦' },
		{ code: 'fr', label: 'Français', flag: '🇫🇷' },
	];

	const PDF_I18N: Record<LangCode, LangDict> = {
		tr: { quote: 'TEKLIF', order: 'SIPARIS', quoteNo: 'Teklif No', orderNo: 'Siparis No', date: 'Tarih', customer: 'Musteri', product: 'Urun Adi', qty: 'Miktar', unitPrice: 'Birim Fiyat', total: 'Toplam', subtotal: 'Ara Toplam', vat: 'KDV', grandTotal: 'GENEL TOPLAM', included: 'Dahil', notes: 'Notlar' },
		en: { quote: 'QUOTATION', order: 'ORDER', quoteNo: 'Quote No', orderNo: 'Order No', date: 'Date', customer: 'Customer', product: 'Product', qty: 'Qty', unitPrice: 'Unit Price', total: 'Total', subtotal: 'Subtotal', vat: 'VAT', grandTotal: 'GRAND TOTAL', included: 'Included', notes: 'Notes' },
		ru: { quote: 'PREDLOZHENIE', order: 'ZAKAZ', quoteNo: 'Nomer pred.', orderNo: 'Nomer zakaza', date: 'Data', customer: 'Klient', product: 'Tovar', qty: 'Kol-vo', unitPrice: 'Tsena/ed.', total: 'Itogo', subtotal: 'Promezhutok', vat: 'NDS', grandTotal: 'OBSHCHIY ITOG', included: 'V komplekte', notes: 'Zametki' },
		ar: { quote: 'ARD AL-ASAAR', order: 'TALAB', quoteNo: 'Raqm al-ard', orderNo: 'Raqm al-talab', date: 'Al-tarikh', customer: 'Al-amil', product: 'Al-muntaj', qty: 'Al-kam.', unitPrice: 'Seer/wahda', total: 'Al-majmou', subtotal: 'Majm. al-fari', vat: 'Al-dareeba', grandTotal: 'AL-MAJMOU AL-KULLI', included: 'Marfaq', notes: 'Mulahazat' },
		fr: { quote: 'DEVIS', order: 'COMMANDE', quoteNo: 'N° Devis', orderNo: 'N° Commande', date: 'Date', customer: 'Client', product: 'Produit', qty: 'Qté', unitPrice: 'Prix unit.', total: 'Total', subtotal: 'Sous-total', vat: 'TVA', grandTotal: 'TOTAL GÉNÉRAL', included: 'Inclus', notes: 'Notes' },
	};

	// ─── Constants ────────────────────────────────────────────────────────────
	const TABS = [
		{ value: 'info',     label: 'Bilgiler'   },
		{ value: 'notes',    label: 'Notlar'     },
		{ value: 'quotes',   label: 'Teklifler'  },
		{ value: 'orders',   label: 'Siparişler' },
		{ value: 'payments', label: 'Ödemeler'   }
	];

	const typeLabels: Record<string, string> = {
		corporate: 'Kurumsal',
		individual: 'Bireysel'
	};

	const sourceLabels: Record<string, string> = {
		referral: 'Referans',
		web: 'Web',
		cold: 'Soğuk İletişim',
		other: 'Diğer'
	};

	const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
		lead:              { label: 'Potansiyel',   variant: 'warning' },
		active:            { label: 'Aktif',         variant: 'success' },
		inactive:          { label: 'Pasif',         variant: 'default' },
		draft:             { label: 'Taslak',        variant: 'default' },
		pending_finance:   { label: 'Finans Onayı',  variant: 'warning' },
		approved:          { label: 'Onaylandı',     variant: 'success' },
		rejected:          { label: 'Reddedildi',    variant: 'danger'  },
		cancelled:         { label: 'İptal',         variant: 'danger'  },
		pending_production:{ label: 'Üretim Bekliyor', variant: 'warning' },
		in_production:     { label: 'Üretimde',      variant: 'info'    },
		ready:             { label: 'Hazır',          variant: 'info'    },
		shipped:           { label: 'Kargoda',        variant: 'info'    },
		delivered:         { label: 'Teslim Edildi',  variant: 'success' }
	};

	// ─── State ────────────────────────────────────────────────────────────────
	let tabValue      = $state('info');
	let showQuoteForm = $state(false);
	let customer   = $state<CustomerRow | null>(null);
	let notes      = $state<NoteRow[]>([]);
	let quotes     = $state<QuoteRow[]>([]);
	let orders     = $state<OrderRow[]>([]);
	let loading    = $state(true);
	let userId     = $state<string | null>(null);

	let noteForm      = $state({ title: '', content: '' });
	let noteAttempted = $state(false);
	let noteSaving    = $state(false);
	let noteError     = $state('');

	let langModalOpen  = $state(false);
	let langForType    = $state<'quote' | 'order'>('quote');
	let langForEntity  = $state<QuoteRow | OrderRow | null>(null);
	let pdfGenerating  = $state(false);

	let allQuoteItems = $state<any[]>([]);
	let allOrderItems = $state<any[]>([]);

	let detailOpen    = $state(false);
	let detailType    = $state<'quote' | 'order'>('quote');
	let detailEntity  = $state<QuoteRow | OrderRow | null>(null);
	let detailLoading = $state(false);

	let detailItems = $derived(
		detailType === 'quote'
			? allQuoteItems.filter((i: any) => i.quoteId === detailEntity?.id)
			: allOrderItems.filter((i: any) => i.orderId === detailEntity?.id)
	);
	let detailItemsSorted = $derived(
		[...detailItems].sort((a: any, b: any) => {
			if (a.isIncludedPart !== b.isIncludedPart) return a.isIncludedPart ? 1 : -1;
			return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
		})
	);

	let noteValid = $derived(noteForm.content.trim().length > 0);

	// ─── Helpers ──────────────────────────────────────────────────────────────
	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', {
			day: '2-digit', month: 'short', year: 'numeric'
		});
	}

	function formatTs(ts: number): string {
		return new Date(ts).toLocaleString('tr-TR', {
			day: '2-digit', month: 'short', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function initials(name: string): string {
		return (name ?? 'M').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
	}

	function formatMoney(amount: number, currency: string): string {
		return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;
	}

	function normPdf(s: string): string {
		return (s ?? '')
			.replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ş/g, 's').replace(/Ş/g, 'S')
			.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ç/g, 'c').replace(/Ç/g, 'C')
			.replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ü/g, 'u').replace(/Ü/g, 'U');
	}

	function truncatePdf(s: string, max = 44): string {
		const n = normPdf(s);
		return n.length > max ? n.slice(0, max - 2) + '..' : n;
	}

	function fmtPdf(amount: number, sym: string): string {
		return (amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + sym;
	}

	// ─── Timer ───────────────────────────────────────────────────────────────
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(noteTimer));

	// ─── Auth + global item subscriptions (component ömrü boyunca açık kalır) ──
	onMount(() => {
		const cleanupAuth = db.subscribeAuth((s) => { userId = s.user?.id ?? null; });

		const cleanupQuoteItems = db.subscribeQuery(
			{ quoteItems: {} },
			(result) => {
				allQuoteItems = result.data?.quoteItems ?? [];
			}
		);

		const cleanupOrderItems = db.subscribeQuery(
			{ orderItems: {} },
			(result) => {
				allOrderItems = result.data?.orderItems ?? [];
			}
		);

		return () => { cleanupAuth(); cleanupQuoteItems(); cleanupOrderItems(); };
	});

	// ─── Reset tab on customer change ─────────────────────────────────────────
	$effect(() => {
		customerId;
		tabValue = 'info';
		showQuoteForm = false;
	});

	// ─── Customer data ────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;
		untrack(() => { loading = true; });

		return db.subscribeQuery(
			{ customers: { $: { where: { id: cId } } } },
			(result) => {
				const c = ((result.data?.customers ?? []) as unknown[])[0] as CustomerRow | undefined;
				untrack(() => {
					customer = c ?? null;
					loading  = false;
				});
			}
		);
	});

	// ─── Notes ───────────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;

		return db.subscribeQuery(
			{
				customerNotes: {
					$: { where: { customerId: cId }, order: { createdAt: 'desc' } },
					author: {}
				}
			},
			(result) => {
				untrack(() => {
					notes = (result.data?.customerNotes ?? []) as NoteRow[];
				});
			}
		);
	});

	// ─── Quotes ──────────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;

		return db.subscribeQuery(
			{ quotes: { $: { where: { customerId: cId }, order: { createdAt: 'desc' } } } },
			(result) => {
				untrack(() => {
					quotes = (result.data?.quotes ?? []) as QuoteRow[];
				});
			}
		);
	});

	// ─── Orders ──────────────────────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) return;

		return db.subscribeQuery(
			{ orders: { $: { where: { customerId: cId }, order: { createdAt: 'desc' } } } },
			(result) => {
				untrack(() => {
					orders = (result.data?.orders ?? []) as OrderRow[];
				});
			}
		);
	});


	// ─── Add note ────────────────────────────────────────────────────────────
	async function addNote() {
		noteAttempted = true;
		const companyId = authStore.activeCompanyId;
		if (!noteValid || !customerId || !companyId || !userId) return;

		noteSaving = true;
		noteError  = '';

		try {
			await db.transact([
				tx.customerNotes[id()].update({
					...(noteForm.title.trim() && { title: noteForm.title.trim() }),
					content:   noteForm.content.trim(),
					companyId,
					customerId,
					createdBy: userId,
					createdAt: Date.now()
				})
			]);
			noteForm      = { title: '', content: '' };
			noteAttempted = false;
		} catch {
			noteError = 'Not eklenemedi. Lütfen tekrar deneyin.';
		} finally {
			noteSaving = false;
		}
	}

	function openDetailModal(type: 'quote' | 'order', entity: QuoteRow | OrderRow) {
		detailType   = type;
		detailEntity = entity;
		detailOpen   = true;
	}

	function openLangModal(type: 'quote' | 'order', entity: QuoteRow | OrderRow) {
		langForType   = type;
		langForEntity = entity;
		langModalOpen = true;
	}

	async function loadItemsOnce(type: 'quote' | 'order', entityId: string): Promise<any[]> {
		return new Promise((resolve) => {
			let cleanup: (() => void) | undefined;
			const handler = (result: any) => {
				if (result.isLoading) return;
				cleanup?.();
				const key   = type === 'quote' ? 'quoteItems' : 'orderItems';
				const field = type === 'quote' ? 'quoteId'    : 'orderId';
				resolve((result.data?.[key] ?? []).filter((i: any) => i[field] === entityId));
			};
			const key   = type === 'quote' ? 'quoteItems' : 'orderItems';
			const field = type === 'quote' ? 'quoteId'    : 'orderId';
			cleanup = db.subscribeQuery(
				{ [key]: { $: { where: { [field]: entityId } } } }, handler
			);
		});
	}

	async function generatePdf(lang: LangCode) {
		if (!langForEntity) return;
		langModalOpen = false;
		pdfGenerating = true;
		try {
			const isQuote  = langForType === 'quote';
			const entity   = langForEntity;
			const items    = await loadItemsOnce(isQuote ? 'quote' : 'order', entity.id);
			const { jsPDF } = await import('jspdf');
			const L        = PDF_I18N[lang];
			const sym      = entity.currency === 'TRY' ? 'TL' : entity.currency === 'USD' ? '$' : entity.currency === 'EUR' ? '€' : (entity.currency || 'TL');
			const entityNum = normPdf(isQuote ? (entity as QuoteRow).quoteNumber : (entity as OrderRow).orderNumber);
			const cName    = normPdf(customer?.name ?? '—');
			const docDate  = new Date(entity.createdAt).toLocaleDateString('en-GB');

			const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
			const W = 210, ML = 15, MR = 15, CW = W - ML - MR;
			let y = 15;

			// ── Title
			doc.setFontSize(20);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(20, 20, 20);
			doc.text(isQuote ? L.quote : L.order, W / 2, y, { align: 'center' });
			y += 7;

			// ── Meta line
			doc.setFontSize(8.5);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(100, 100, 100);
			const numLbl = isQuote ? L.quoteNo : L.orderNo;
			doc.text(`${numLbl}: ${entityNum}   |   ${L.date}: ${docDate}   |   ${L.customer}: ${cName}`, W / 2, y, { align: 'center' });
			y += 5;

			// ── Separator
			doc.setDrawColor(210, 210, 210);
			doc.line(ML, y, W - MR, y);
			y += 5;

			// ── Column x positions
			const cProduct   = ML;
			const cQty       = ML + 83;
			const cUnitPrice = ML + 109;
			const cTotal     = ML + 148;
			const cTotalEnd  = W - MR;

			// ── Table header
			doc.setFillColor(28, 28, 28);
			doc.setTextColor(255, 255, 255);
			doc.rect(ML, y, CW, 7, 'F');
			doc.setFontSize(7.5);
			doc.setFont('helvetica', 'bold');
			doc.text(L.product, cProduct + 2, y + 4.8);
			doc.text(L.qty, cQty + 8, y + 4.8, { align: 'center' });
			doc.text(L.unitPrice, (cUnitPrice + cTotal) / 2, y + 4.8, { align: 'center' });
			doc.text(L.total, (cTotal + cTotalEnd) / 2, y + 4.8, { align: 'center' });
			y += 7;

			// ── Rows
			const sorted = [...items].sort((a: any, b: any) => {
				if (a.isIncludedPart !== b.isIncludedPart) return a.isIncludedPart ? 1 : -1;
				return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
			});
			doc.setFont('helvetica', 'normal');
			sorted.forEach((item: any, idx: number) => {
				const rowH = 6.5;
				if (idx % 2 === 0) {
					doc.setFillColor(246, 246, 246);
					doc.rect(ML, y, CW, rowH, 'F');
				}
				doc.setFontSize(8);
				if (item.isIncludedPart) {
					doc.setTextColor(140, 140, 140);
				} else {
					doc.setTextColor(30, 30, 30);
				}
				doc.text(truncatePdf(item.productName ?? '', item.isIncludedPart ? 40 : 44), cProduct + 2, y + 4.5);
				doc.text(String(item.quantity ?? 0), cQty + 8, y + 4.5, { align: 'center' });
				doc.text(fmtPdf(item.unitPrice ?? 0, sym), cTotal - 2, y + 4.5, { align: 'right' });
				doc.text(fmtPdf(item.lineTotalWithVat ?? 0, sym), cTotalEnd - 2, y + 4.5, { align: 'right' });
				if (item.isIncludedPart) {
					doc.setFontSize(6);
					doc.text(`[${L.included}]`, cProduct + 2, y + rowH - 0.3);
				}
				y += rowH;
				if (y > 265) { doc.addPage(); y = 15; }
			});

			// ── Bottom line
			doc.setDrawColor(210, 210, 210);
			doc.line(ML, y, W - MR, y);
			y += 5;

			// ── Totals
			const sub   = (entity as any).subtotal   ?? 0;
			const vat   = (entity as any).totalVat   ?? 0;
			const grand = entity.totalWithVat ?? 0;
			const tX    = W - MR - 65;

			doc.setFontSize(8.5);
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(100, 100, 100);
			doc.text(L.subtotal, tX, y + 5);
			doc.setTextColor(30, 30, 30);
			doc.text(fmtPdf(sub, sym), W - MR - 2, y + 5, { align: 'right' });
			y += 6;

			doc.setTextColor(100, 100, 100);
			doc.text(L.vat, tX, y + 5);
			doc.setTextColor(30, 30, 30);
			doc.text(fmtPdf(vat, sym), W - MR - 2, y + 5, { align: 'right' });
			y += 6;

			doc.setFillColor(28, 28, 28);
			doc.rect(tX - 4, y, W - MR - tX + 4, 8, 'F');
			doc.setFontSize(9);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(255, 255, 255);
			doc.text(L.grandTotal, tX - 1, y + 5.5);
			doc.text(fmtPdf(grand, sym), W - MR - 2, y + 5.5, { align: 'right' });
			y += 12;

			// ── Notes
			const notesText = (entity as any).notes;
			if (notesText?.trim()) {
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(8);
				doc.setTextColor(100, 100, 100);
				doc.text(L.notes + ':', ML, y);
				y += 4;
				doc.setTextColor(60, 60, 60);
				const wrapped = doc.splitTextToSize(normPdf(notesText), CW);
				doc.text(wrapped, ML, y);
			}

			doc.save(`${isQuote ? 'teklif' : 'siparis'}-${entityNum}.pdf`);
		} finally {
			pdfGenerating = false;
		}
	}
</script>

<!-- ─── Loading ─────────────────────────────────────────────────────────────── -->
{#if loading}
	<div class="flex h-full items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
	</div>

{:else if customer}
	<div class="flex h-full flex-col overflow-hidden">

		<!-- ── Header ─────────────────────────────────────────────────────────── -->
		<div class="shrink-0 border-b border-[#2a2a2a] bg-[#111111] px-6 py-5">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-4 min-w-0">
					<Avatar fallbackText={initials(customer.name)} size="lg" />
					<div class="min-w-0">
						<h2 class="text-xl font-bold text-white leading-tight truncate">{customer.name}</h2>
						<div class="mt-1.5 flex flex-wrap items-center gap-2">
							{#if statusConfig[customer.status]}
								{@const sc = statusConfig[customer.status]!}
								<Badge variant={sc.variant} label={sc.label} />
							{/if}
							{#if customer.city}
								<span class="text-sm text-[#888]">{customer.city}</span>
							{/if}
							{#if customer.contactName}
								<span class="text-sm text-[#888]">· {customer.contactName}</span>
							{/if}
						</div>
					</div>
				</div>

				<Button variant="icon" onclick={() => onedit?.(customerId)}>
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
					</svg>
				</Button>
			</div>

			<div class="mt-4">
				<Tabs bind:value={tabValue} tabs={TABS} />
			</div>
		</div>

		<!-- ── Tab content ────────────────────────────────────────────────────── -->
		<div class="flex-1 min-h-0 overflow-y-auto p-6" style="scrollbar-width: none;">

			{#if tabValue === 'info'}
				<div class="flex flex-col gap-4 max-w-2xl">

					{#snippet infoCard(heading: string)}
						<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
							<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">{heading}</p>
						</div>
					{/snippet}

					<!-- Genel -->
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Genel</p>
						<dl class="divide-y divide-[#2a2a2a]">
							{#snippet inforow(label: string, value: string | undefined)}
								{#if value}
									<div class="flex items-center justify-between gap-4 py-2.5">
										<dt class="text-sm text-[#888] shrink-0">{label}</dt>
										<dd class="text-sm font-medium text-white text-right">{value}</dd>
									</div>
								{/if}
							{/snippet}
							{@render inforow('Müşteri Tipi', typeLabels[customer.companyType] ?? customer.companyType)}
							{@render inforow('Durum', statusConfig[customer.status]?.label ?? customer.status)}
							{@render inforow('Kaynak', customer.source ? (sourceLabels[customer.source] ?? customer.source) : undefined)}
						</dl>
					</div>

					<!-- İletişim -->
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">İletişim</p>
						<dl class="divide-y divide-[#2a2a2a]">
							{#snippet inforow2(label: string, value: string | undefined)}
								{#if value}
									<div class="flex items-center justify-between gap-4 py-2.5">
										<dt class="text-sm text-[#888] shrink-0">{label}</dt>
										<dd class="text-sm font-medium text-white text-right">{value}</dd>
									</div>
								{/if}
							{/snippet}
							{@render inforow2('Yetkili', customer.contactName && customer.contactTitle
								? `${customer.contactName} — ${customer.contactTitle}`
								: customer.contactName)}
							{@render inforow2('Telefon', customer.phone)}
							{@render inforow2('E-posta', customer.email)}
							{@render inforow2('Şehir', customer.city)}
							{@render inforow2('Ülke', customer.country)}
							{@render inforow2('Adres', customer.address)}
						</dl>
					</div>

					<!-- Sistem -->
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#555]">Sistem</p>
						<dl class="divide-y divide-[#2a2a2a]">
							{#snippet inforow3(label: string, value: string | undefined)}
								{#if value}
									<div class="flex items-center justify-between gap-4 py-2.5">
										<dt class="text-sm text-[#888] shrink-0">{label}</dt>
										<dd class="text-sm font-medium text-white text-right">{value}</dd>
									</div>
								{/if}
							{/snippet}
							{@render inforow3('Vergi No', customer.taxNumber)}
							{@render inforow3('Oluşturulma', formatDate(customer.createdAt))}
						</dl>
					</div>
				</div>

			{:else if tabValue === 'notes'}
				<div class="flex flex-col gap-4 max-w-2xl">

					<!-- Yeni not formu -->
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
						<p class="mb-3 text-sm font-semibold text-white">Yeni Not</p>
						<div class="space-y-3">
							<input
								type="text"
								bind:value={noteForm.title}
								placeholder="Başlık (opsiyonel)"
								class="block w-full rounded-xl border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
							/>
							<textarea
								bind:value={noteForm.content}
								rows="3"
								placeholder="Not içeriği..."
								class="block w-full resize-none rounded-xl border px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none bg-[#111111] {noteAttempted && !noteForm.content.trim()
									? 'border-[#ff4444]'
									: 'border-[#2a2a2a] focus:border-[#555]'}"
							></textarea>
							{#if noteAttempted && !noteForm.content.trim()}
								<p class="text-xs text-[#ff4444]">İçerik alanı zorunludur.</p>
							{/if}
							{#if noteError}
								<p class="text-xs text-[#ff4444]">{noteError}</p>
							{/if}
							<div class="flex justify-end">
								<button
									onclick={addNote}
									disabled={noteSaving}
									class="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-[#e0e0e0] disabled:opacity-50"
								>
									{#if noteSaving}
										<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
										Ekleniyor...
									{:else}
										Not Ekle
									{/if}
								</button>
							</div>
						</div>
					</div>

					<!-- Not listesi -->
					{#if notes.length === 0}
						<div class="rounded-xl border border-dashed border-[#2a2a2a] py-10 text-center">
							<p class="text-sm text-[#888]">Henüz not eklenmemiş.</p>
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							{#each notes as note (note.id)}
								<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
									{#if note.title}
										<p class="mb-1.5 text-sm font-semibold text-white">{note.title}</p>
									{/if}
									<p class="whitespace-pre-wrap text-sm leading-relaxed text-[#888]">{note.content}</p>
									<div class="mt-3 flex items-center gap-2">
										<div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#333] text-[10px] font-bold text-[#888]">
											{initials(note.author?.fullName ?? 'K')}
										</div>
										<span class="text-xs text-[#555]">
											{note.author?.fullName ?? 'Kullanıcı'} · {formatTs(note.createdAt)}
										</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if tabValue === 'quotes'}
				{#if showQuoteForm}
					<QuoteForm
						{customerId}
						onClose={() => (showQuoteForm = false)}
						onSaved={() => (showQuoteForm = false)}
					/>
				{:else}
					<div class="max-w-2xl">
						<div class="mb-4 flex items-center justify-between">
							<p class="text-sm text-[#888]">{quotes.length} teklif</p>
							<button
								type="button"
								onclick={() => (showQuoteForm = true)}
								class="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black transition hover:bg-[#e0e0e0]"
							>
								<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 4.5v15m7.5-7.5h-15" />
								</svg>
								Yeni Teklif
							</button>
						</div>
						{#if quotes.length === 0}
							<div class="rounded-xl border border-dashed border-[#2a2a2a] py-10 text-center">
								<p class="text-sm text-[#888]">Henüz teklif oluşturulmamış.</p>
								<button
									type="button"
									onclick={() => (showQuoteForm = true)}
									class="mt-3 text-sm text-white underline underline-offset-2"
								>İlk teklifi oluştur</button>
							</div>
						{:else}
							<div class="flex flex-col gap-2">
								{#each quotes as quote (quote.id)}
									{@const qsc = statusConfig[quote.status]}
									<div class="flex items-center justify-between rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-5 py-4">
										<div>
											<p class="text-sm font-bold text-white">{quote.quoteNumber}</p>
											<p class="text-xs text-[#888] mt-0.5">{formatDate(quote.createdAt)}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[#888]">{formatMoney(quote.totalWithVat, quote.currency)}</span>
											{#if qsc}
												<Badge variant={qsc.variant} label={qsc.label} />
											{/if}
											<button
												type="button"
												onclick={() => openDetailModal('quote', quote)}
												class="flex h-7 items-center rounded-lg border border-[#2a2a2a] px-2 text-xs text-[#666] transition hover:border-[#444] hover:text-white"
												title="Detay"
											>Detay</button>
											<button
												type="button"
												onclick={() => openLangModal('quote', quote)}
												class="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#666] transition hover:border-[#444] hover:text-white"
												aria-label="PDF İndir"
												title="PDF İndir"
											>
												<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

			{:else if tabValue === 'orders'}
				<div class="max-w-2xl">
					{#if orders.length === 0}
						<div class="rounded-xl border border-dashed border-[#2a2a2a] py-10 text-center">
							<p class="text-sm text-[#888]">Henüz sipariş oluşturulmamış.</p>
						</div>
					{:else}
						<div class="flex flex-col gap-2">
							{#each orders as order (order.id)}
								{@const osc = statusConfig[order.status]}
								<div class="flex items-center justify-between rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-5 py-4">
									<div>
										<p class="text-sm font-bold text-white">{order.orderNumber}</p>
										<p class="text-xs text-[#888] mt-0.5">{formatDate(order.createdAt)}</p>
									</div>
									<div class="flex items-center gap-3">
										<span class="text-sm font-semibold text-[#888]">{formatMoney(order.totalWithVat, order.currency)}</span>
										{#if osc}
											<Badge variant={osc.variant} label={osc.label} />
										{/if}
										<button
											type="button"
											onclick={() => openDetailModal('order', order)}
											class="flex h-7 items-center rounded-lg border border-[#2a2a2a] px-2 text-xs text-[#666] transition hover:border-[#444] hover:text-white"
											title="Detay"
										>Detay</button>
										<button
											type="button"
											onclick={() => openLangModal('order', order)}
											class="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#666] transition hover:border-[#444] hover:text-white"
											aria-label="PDF İndir"
											title="PDF İndir"
										>
											<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
											</svg>
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else}
				<!-- Ödemeler (placeholder) -->
				<div class="flex h-48 items-center justify-center rounded-xl border border-dashed border-[#2a2a2a]">
					<div class="text-center">
						<p class="text-sm font-medium text-[#888]">Ödemeler yakında</p>
						<p class="mt-0.5 text-xs text-[#555]">Bu bölüm geliştirme aşamasında.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

{:else}
	<div class="flex h-full items-center justify-center">
		<p class="text-sm text-[#888]">Müşteri bulunamadı.</p>
	</div>
{/if}

<!-- ─── Language selection modal ─────────────────────────────────────────── -->
{#if langModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="PDF dil seçimi"
		tabindex="-1"
		onclick={() => (langModalOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (langModalOpen = false)}
	>
		<div
			class="relative w-[300px] rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				onclick={() => (langModalOpen = false)}
				class="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#555] hover:bg-[#2a2a2a] hover:text-white transition"
				aria-label="Kapat"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>

			<h3 class="mb-5 text-center text-sm font-bold text-white">PDF Dilini Seçin</h3>

			<div class="flex flex-col gap-2">
				{#each LANGS as lang (lang.code)}
					<button
						type="button"
						disabled={pdfGenerating}
						onclick={() => generatePdf(lang.code)}
						class="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-sm font-medium text-white transition hover:border-[#444] hover:bg-[#222] disabled:opacity-50"
					>
						<span class="text-xl leading-none">{lang.flag}</span>
						<span>{lang.label}</span>
						{#if pdfGenerating}
							<span class="ml-auto h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></span>
						{/if}
					</button>
				{/each}
			</div>

			{#if pdfGenerating}
				<p class="mt-4 text-center text-xs text-[#555]">PDF oluşturuluyor...</p>
			{/if}
		</div>
	</div>
{/if}

<!-- ─── Detail modal ─────────────────────────────────────────────────────── -->
{#if detailOpen && detailEntity}
	{@const de = detailEntity}
	{@const isQ = detailType === 'quote'}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Detay"
		tabindex="-1"
		onclick={() => (detailOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (detailOpen = false)}
	>
		<div
			class="relative flex w-[720px] max-h-[80vh] flex-col rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="shrink-0 flex items-center justify-between border-b border-[#2a2a2a] px-6 py-4">
				<div>
					<p class="text-base font-bold text-white">
						{isQ ? (de as QuoteRow).quoteNumber : (de as OrderRow).orderNumber}
					</p>
					<p class="text-xs text-[#555] mt-0.5">
						{formatDate(de.createdAt)}{customer ? ' · ' + customer.name : ''}
					</p>
				</div>
				<div class="flex items-center gap-3">
					{#if statusConfig[de.status]}
						{@const sc = statusConfig[de.status]!}
						<Badge variant={sc.variant} label={sc.label} />
					{/if}
					<button
						type="button"
						onclick={() => (detailOpen = false)}
						class="flex h-7 w-7 items-center justify-center rounded-full text-[#555] transition hover:bg-[#2a2a2a] hover:text-white"
						aria-label="Kapat"
					>
						<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="flex-1 min-h-0 overflow-y-auto p-6" style="scrollbar-width: thin;">
				{#if detailLoading}
					<div class="flex h-32 items-center justify-center">
						<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
					</div>
				{:else if detailItemsSorted.length === 0}
					<p class="py-8 text-center text-sm text-[#555]">Kalem bulunamadı.</p>
				{:else}
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[#2a2a2a] text-left">
								<th class="pb-2 pr-3 text-xs font-medium text-[#555]">Ürün</th>
								<th class="pb-2 pr-3 w-16 text-xs font-medium text-[#555] text-right">Miktar</th>
								<th class="pb-2 pr-3 w-28 text-xs font-medium text-[#555] text-right">Birim Fiyat</th>
								<th class="pb-2 w-28 text-xs font-medium text-[#555] text-right">Tutar</th>
							</tr>
						</thead>
						<tbody>
							{#each detailItemsSorted as it (it.id)}
								<tr class="border-b border-[#1e1e1e] {it.isIncludedPart ? 'opacity-60' : ''}">
									<td class="py-2 pr-3">
										<p class="{it.isIncludedPart ? 'text-[#888]' : 'text-white'}">{it.productName}</p>
										{#if it.isIncludedPart}
											<span class="text-[10px] text-[#555]">Dahil</span>
										{/if}
									</td>
									<td class="py-2 pr-3 text-right text-[#aaa]">{it.quantity} {it.unit ?? ''}</td>
									<td class="py-2 pr-3 text-right text-[#aaa]">{formatMoney(it.unitPrice ?? 0, de.currency)}</td>
									<td class="py-2 text-right text-white">{formatMoney(it.lineTotalWithVat ?? 0, de.currency)}</td>
								</tr>
							{/each}
						</tbody>
					</table>

					<div class="mt-4 flex flex-col items-end gap-1.5 border-t border-[#2a2a2a] pt-4">
						<div class="flex items-center gap-6">
							<span class="text-xs text-[#555]">Ara Toplam</span>
							<span class="w-36 text-right text-sm text-[#aaa]">{formatMoney((de as any).subtotal ?? 0, de.currency)}</span>
						</div>
						<div class="flex items-center gap-6">
							<span class="text-xs text-[#555]">KDV</span>
							<span class="w-36 text-right text-sm text-[#aaa]">{formatMoney((de as any).totalVat ?? 0, de.currency)}</span>
						</div>
						<div class="flex items-center gap-6">
							<span class="text-xs font-semibold text-[#888]">GENEL TOPLAM</span>
							<span class="w-36 text-right text-base font-bold text-white">{formatMoney(de.totalWithVat, de.currency)}</span>
						</div>
					</div>

					{#if (de as any).notes?.trim()}
						<div class="mt-4 rounded-lg border border-[#2a2a2a] bg-[#111] px-4 py-3">
							<p class="mb-1 text-xs text-[#555]">Notlar</p>
							<p class="whitespace-pre-wrap text-sm text-[#888]">{(de as any).notes}</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
