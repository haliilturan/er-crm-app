<script lang="ts">
	import { untrack } from 'svelte';
	import { db } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { notoSansBase64 } from '$lib/fonts/notoSansBase64';
	import { notoSansArabicBase64 } from '$lib/fonts/notoSansArabicBase64';

	type Quote = {
		id: string;
		orderNumber?: string;
		customerId: string;
		companyId: string;
		status: string;
		currency: string;
		totalWithVat: number;
		createdBy: string;
		createdAt: number;
		assignedTo: string;
	};

	type Order = {
		id: string;
		orderNumber?: string;
		customerName?: string;
		customerId: string;
		companyId: string;
		status: string;
		currency: string;
		totalWithVat: number;
		createdBy: string;
		createdAt: number;
	};

	type UserProfile = {
		id: string;
		fullName: string;
		email: string;
		userId?: string;
	};

	type Lang = 'tr' | 'en' | 'ru' | 'ar' | 'fr';

	// ── State ──────────────────────────────────────────────────────────────────
	let activeTab        = $state<'company' | 'personnel'>('company');
	let period           = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
	let selectedPersonnel = $state('all');
	let pdfModal         = $state(false);
	let pdfLang          = $state<Lang>('tr');
	let pdfExporting     = $state(false);
	let quotes           = $state<Quote[]>([]);
	let orders           = $state<Order[]>([]);
	let profiles         = $state<UserProfile[]>([]);
	let loading          = $state(true);

	// Chart element refs for capture
	let barChartContainer  = $state<HTMLElement | null>(null);
	let lineChartContainer = $state<HTMLElement | null>(null);

	let companyIds = $derived(authStore.companyIds);

	// ── Data fetch ─────────────────────────────────────────────────────────────
	$effect(() => {
		const cIds = companyIds;
		if (!cIds.length) return;
		loading = true;
		const u1 = db.subscribeQuery(
			{ orders: { $: { where: { companyId: { in: cIds }, status: { in: ['draft', 'pending_finance'] } } } } },
			(r) => untrack(() => { quotes = (r.data?.orders ?? []) as Quote[]; })
		);
		const u2 = db.subscribeQuery(
			{ orders: { $: { where: { companyId: { in: cIds }, status: { in: ['in_production', 'shipped', 'completed', 'cancelled'] } } } } },
			(r) => untrack(() => { orders = (r.data?.orders ?? []) as Order[]; loading = false; })
		);
		const u3 = db.subscribeQuery(
			{ userProfiles: {} },
			(r) => untrack(() => { profiles = (r.data?.userProfiles ?? []) as UserProfile[]; })
		);
		return () => { u1(); u2(); u3(); };
	});

	// ── Period start ───────────────────────────────────────────────────────────
	function calcPeriodStart(p: typeof period): number {
		const now = new Date();
		if (p === 'daily')  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		if (p === 'weekly') {
			const day = now.getDay() || 7;
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const d = new Date(now);
			d.setDate(now.getDate() - day + 1);
			return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		}
		if (p === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
		return new Date(now.getFullYear(), 0, 1).getTime();
	}

	const periodStart = $derived(calcPeriodStart(period));

	// Fixed current-month start for target (always this calendar month)
	function currentMonthStart(): number {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
	}

	// ── Filtered data ──────────────────────────────────────────────────────────
	const filteredQuotes = $derived.by(() => {
		let q = quotes.filter(x => x.createdAt >= periodStart);
		if (activeTab === 'personnel' && selectedPersonnel !== 'all')
			q = q.filter(x => x.assignedTo === selectedPersonnel || x.createdBy === selectedPersonnel);
		return q;
	});

	const filteredOrders = $derived.by(() => {
		let o = orders.filter(x => x.createdAt >= periodStart);
		if (activeTab === 'personnel' && selectedPersonnel !== 'all')
			o = o.filter(x => x.createdBy === selectedPersonnel);
		return o;
	});

	// ── Stat cards ─────────────────────────────────────────────────────────────
	const totalQuotes      = $derived(filteredQuotes.length);
	const totalOrders      = $derived(filteredOrders.length);
	const totalQuoteAmount = $derived(filteredQuotes.reduce((s, q) => s + (q.totalWithVat || 0), 0));
	const totalOrderAmount = $derived(filteredOrders.reduce((s, o) => s + (o.totalWithVat || 0), 0));
	const conversionRate   = $derived(totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0);
	const avgQuoteAmount   = $derived(totalQuotes > 0 ? totalQuoteAmount / totalQuotes : 0);

	// ── Monthly target (always current calendar month) ─────────────────────────
	const MONTHLY_TARGET_USD = 330_000;

	const achievedUSD = $derived.by(() => {
		const ms = currentMonthStart();
		return orders
			.filter(o => o.createdAt >= ms && o.currency === 'USD')
			.reduce((s, o) => s + (o.totalWithVat || 0), 0);
	});

	const achievedTL = $derived.by(() => {
		const ms = currentMonthStart();
		return orders
			.filter(o => o.createdAt >= ms && (o.currency === 'TRY' || o.currency === 'TL'))
			.reduce((s, o) => s + (o.totalWithVat || 0), 0);
	});

	const remaining = $derived(Math.max(0, MONTHLY_TARGET_USD - achievedUSD));

	// ── Chart buckets ──────────────────────────────────────────────────────────
	type Bucket = { label: string; start: number; end: number };

	function buildBuckets(p: typeof period): Bucket[] {
		const now = new Date();
		if (p === 'daily') {
			return Array.from({ length: 24 }, (_, h) => {
				const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h).getTime();
				return { label: `${h}:00`, start: s, end: s + 3_600_000 };
			});
		}
		if (p === 'weekly') {
			const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
			const day = now.getDay() || 7;
			return DAYS.map((label, i) => {
				// eslint-disable-next-line svelte/prefer-svelte-reactivity
				const d = new Date(now);
				d.setDate(now.getDate() - day + 1 + i);
				const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
				return { label, start: s, end: s + 86_400_000 };
			});
		}
		if (p === 'monthly') {
			const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
			return Array.from({ length: days }, (_, i) => {
				const s = new Date(now.getFullYear(), now.getMonth(), i + 1).getTime();
				return { label: `${i + 1}`, start: s, end: s + 86_400_000 };
			});
		}
		const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
		return MONTHS.map((label, m) => ({
			label,
			start: new Date(now.getFullYear(), m, 1).getTime(),
			end:   new Date(now.getFullYear(), m + 1, 1).getTime()
		}));
	}

	type ChartPoint = { label: string; quoteCount: number; orderCount: number; quoteAmt: number; orderAmt: number };

	const chartData = $derived.by((): ChartPoint[] => {
		const buckets = buildBuckets(period);
		return buckets.map(b => ({
			label:      b.label,
			quoteCount: filteredQuotes.filter(q => q.createdAt >= b.start && q.createdAt < b.end).length,
			orderCount: filteredOrders.filter(o => o.createdAt >= b.start && o.createdAt < b.end).length,
			quoteAmt:   filteredQuotes.filter(q => q.createdAt >= b.start && q.createdAt < b.end).reduce((s, q) => s + (q.totalWithVat || 0), 0),
			orderAmt:   filteredOrders.filter(o => o.createdAt >= b.start && o.createdAt < b.end).reduce((s, o) => s + (o.totalWithVat || 0), 0)
		}));
	});

	// ── SVG chart helpers ──────────────────────────────────────────────────────
	const PL = 40, PR = 16, PT = 12, PB = 28;
	const CW = 560, CH = 180;
	const IW = $derived(CW - PL - PR);
	const IH = $derived(CH - PT - PB);

	const barMax = $derived(Math.max(...chartData.map(d => Math.max(d.quoteCount, d.orderCount)), 1));
	const amtMax = $derived(Math.max(...chartData.map(d => Math.max(d.quoteAmt, d.orderAmt)), 1));

	function barY(val: number, mx: number) { return PT + IH - (val / mx) * IH; }
	function barH(val: number, mx: number) { return (val / mx) * IH; }

	function linePoints(data: ChartPoint[], key: 'quoteAmt' | 'orderAmt', mx: number): string {
		return data.map((d, i) => {
			const x = PL + (i / Math.max(data.length - 1, 1)) * IW;
			const y = PT + IH - (d[key] / mx) * IH;
			return `${x},${y}`;
		}).join(' ');
	}

	function yLabels(mx: number, steps = 4): number[] {
		const step = mx / steps;
		return Array.from({ length: steps + 1 }, (_, i) => Math.round(step * i));
	}

	// ── Personnel ──────────────────────────────────────────────────────────────
	const personnelList = $derived(profiles.map(p => ({ uid: p.userId ?? p.id, name: p.fullName })));

	function getPersonnelName(userId: string): string {
		const p = profiles.find(pr => pr.userId === userId || pr.id === userId);
		return p?.fullName ?? userId.slice(0, 8);
	}

	const personnelRows = $derived.by(() =>
		filteredQuotes
			.slice()
			.sort((a, b) => b.createdAt - a.createdAt)
			.map(q => ({
				date:        fmtDate(q.createdAt),
				assignedTo:  getPersonnelName(q.assignedTo ?? q.createdBy),
				quoteNumber: q.orderNumber ?? '—',
				amount:      q.totalWithVat,
				currency:    q.currency,
				status:      q.status
			}))
	);

	// ── Formatters ─────────────────────────────────────────────────────────────
	function fmt(n: number): string {
		return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}
	function fmtDate(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	function fmtK(n: number): string {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
		return String(Math.round(n));
	}
	function statusLabel(s: string): string {
		const MAP: Record<string, string> = {
			draft: 'Taslak', pending_finance: 'Finans Onayı', cancelled: 'İptal'
		};
		return MAP[s] ?? s;
	}

	// ── PDF translations ───────────────────────────────────────────────────────
	const LANGS = {
		tr: {
			title: 'Satış Raporu', period: 'Dönem', exportDate: 'Oluşturma Tarihi',
			stats: 'İstatistikler', metric: 'Metrik', value: 'Değer',
			fields: ['Toplam Teklif Sayısı','Toplam Sipariş Sayısı','Toplam Teklif Tutarı (TL)','Toplam Sipariş Tutarı (TL)','Dönüşüm Oranı (%)','Ortalama Teklif Tutarı'],
			targetSection: 'Aylık Satış Hedefi',
			targetLabel: 'Aylık Hedef', achievedUsd: 'Gerçekleşen (USD)', achievedTl: 'Gerçekleşen (TL)', remaining: 'Hedefe Kalan', remainingSuffix: 'KALDI',
			chartsTitle: 'Grafikler', barChartTitle: 'Teklif / Sipariş Sayısı', lineChartTitle: 'Tutar Trendi',
			detail: 'Teklif Detayları', date: 'Tarih', customer: 'Müşteri', quote: 'Teklif No', amount: 'Tutar', status: 'Durum',
			noData: 'Bu dönemde veri bulunamadı.',
			periodLabels: { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık' },
			colPeriod: 'Dönem', colQuotes: 'Teklifler', colOrders: 'Siparişler',
			rtl: false
		},
		en: {
			title: 'Sales Report', period: 'Period', exportDate: 'Export Date',
			stats: 'Statistics', metric: 'Metric', value: 'Value',
			fields: ['Total Quotes','Total Orders','Total Quote Amount (TL)','Total Order Amount (TL)','Conversion Rate (%)','Avg. Quote Amount'],
			targetSection: 'Monthly Sales Target',
			targetLabel: 'Monthly Target', achievedUsd: 'Achieved (USD)', achievedTl: 'Achieved (TL)', remaining: 'Remaining', remainingSuffix: 'REMAINING',
			chartsTitle: 'Charts', barChartTitle: 'Quote / Order Count', lineChartTitle: 'Amount Trend',
			detail: 'Quote Details', date: 'Date', customer: 'Customer', quote: 'Quote No', amount: 'Amount', status: 'Status',
			noData: 'No data found for this period.',
			periodLabels: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' },
			colPeriod: 'Period', colQuotes: 'Quotes', colOrders: 'Orders',
			rtl: false
		},
		ru: {
			title: 'Отчёт о продажах', period: 'Период', exportDate: 'Дата экспорта',
			stats: 'Статистика', metric: 'Метрика', value: 'Значение',
			fields: ['Всего предложений','Всего заказов','Сумма предложений (TL)','Сумма заказов (TL)','Конверсия (%)','Ср. сумма предложения'],
			targetSection: 'Ежемесячная цель продаж',
			targetLabel: 'Ежемесячная цель', achievedUsd: 'Выполнено (USD)', achievedTl: 'Выполнено (TL)', remaining: 'Остаток', remainingSuffix: 'ОСТАЛОСЬ',
			chartsTitle: 'Графики', barChartTitle: 'Предложения / Заказы', lineChartTitle: 'Динамика сумм',
			detail: 'Детали предложений', date: 'Дата', customer: 'Клиент', quote: '№ предложения', amount: 'Итого', status: 'Статус',
			noData: 'Данные за этот период не найдены.',
			periodLabels: { daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно', yearly: 'Ежегодно' },
			colPeriod: 'Период', colQuotes: 'Предложения', colOrders: 'Заказы',
			rtl: false
		},
		ar: {
			title: 'تقرير المبيعات', period: 'الفترة', exportDate: 'تاريخ التصدير',
			stats: 'الإحصائيات', metric: 'المقياس', value: 'القيمة',
			fields: ['إجمالي العروض','إجمالي الطلبات','مبلغ العروض (TL)','مبلغ الطلبات (TL)','معدل التحويل (%)','متوسط مبلغ العرض'],
			targetSection: 'الهدف الشهري للمبيعات',
			targetLabel: 'الهدف الشهري', achievedUsd: 'المحقق (USD)', achievedTl: 'المحقق (TL)', remaining: 'المتبقي', remainingSuffix: 'متبقي',
			chartsTitle: 'الرسوم البيانية', barChartTitle: 'عدد العروض / الطلبات', lineChartTitle: 'اتجاه المبلغ',
			detail: 'تفاصيل العروض', date: 'التاريخ', customer: 'العميل', quote: 'رقم العرض', amount: 'المبلغ', status: 'الحالة',
			noData: 'لا توجد بيانات لهذه الفترة.',
			periodLabels: { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' },
			colPeriod: 'الفترة', colQuotes: 'العروض', colOrders: 'الطلبات',
			rtl: true
		},
		fr: {
			title: 'Rapport de Ventes', period: 'Période', exportDate: "Date d'export",
			stats: 'Statistiques', metric: 'Métrique', value: 'Valeur',
			fields: ['Total devis','Total commandes','Montant total devis (TL)','Montant total commandes (TL)','Taux de conversion (%)','Montant moyen devis'],
			targetSection: 'Objectif Mensuel de Ventes',
			targetLabel: 'Objectif mensuel', achievedUsd: 'Réalisé (USD)', achievedTl: 'Réalisé (TL)', remaining: 'Restant', remainingSuffix: 'RESTANT',
			chartsTitle: 'Graphiques', barChartTitle: 'Nb. devis / commandes', lineChartTitle: 'Tendance des montants',
			detail: 'Détails des devis', date: 'Date', customer: 'Client', quote: 'N° devis', amount: 'Montant', status: 'Statut',
			noData: 'Aucune donnée pour cette période.',
			periodLabels: { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel', yearly: 'Annuel' },
			colPeriod: 'Période', colQuotes: 'Devis', colOrders: 'Commandes',
			rtl: false
		}
	} as const;

	// ── Chart capture (SVG → canvas → dataURL) ─────────────────────────────────
	async function captureElement(el: HTMLElement | null): Promise<string | null> {
		if (!el) return null;
		try {
			const html2canvas = (await import('html2canvas')).default;
			const canvas = await html2canvas(el, {
				backgroundColor: '#161616',
				scale: 2,
				logging: false,
				useCORS: true
			});
			return canvas.toDataURL('image/png');
		} catch {
			return null;
		}
	}

	// ── Company logo fetch ─────────────────────────────────────────────────────
	async function fetchLogoBase64(url: string): Promise<string | null> {
		try {
			if (url.startsWith('data:')) return url;
			const res = await fetch(url);
			const blob = await res.blob();
			return await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch { return null; }
	}

	// ── PDF export ─────────────────────────────────────────────────────────────
	async function exportPdf() {
		pdfExporting = true;
		try {
			const { jsPDF } = await import('jspdf');

			// A4 landscape: 297 × 210 mm
			const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

			// Register bundled fonts (no network fetch needed)
			doc.addFileToVFS('NotoSans.ttf', notoSansBase64);
			doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
			doc.addFileToVFS('NotoSansArabic.ttf', notoSansArabicBase64);
			doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');

			const L       = LANGS[pdfLang];
			const PAGE_W  = 297; // landscape A4 width in mm
			const isRTL   = L.rtl;

			// Re-apply correct font after addPage() calls
			function setFnt() {
				if (pdfLang === 'ar') doc.setFont('NotoSansArabic', 'normal');
				else                  doc.setFont('NotoSans', 'normal');
			}
			setFnt();

			// RTL-aware text: mirrors x and forces align:'right' for Arabic
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			function txt(s: string, x: number, y: number, o?: Record<string, any>) {
				if (isRTL) doc.text(s, PAGE_W - x, y, { ...(o ?? {}), align: 'right' });
				else       doc.text(s, x, y, o);
			}

			// RTL-aware rect: mirrors x origin so panel sides swap
			function rct(x: number, y: number, w: number, h: number, s: string) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				doc.rect(isRTL ? PAGE_W - x - w : x, y, w, h, s as any);
			}

			// RTL-aware image
			function addImg(d: string, f: string, x: number, y: number, w: number, h: number) {
				doc.addImage(d, f, isRTL ? PAGE_W - x - w : x, y, w, h);
			}

			const company     = authStore.companies[0];
			const companyName = company?.name ?? '';

			// ── A) Header ──────────────────────────────────────────────────────
			doc.setFillColor(17, 17, 17);
			doc.rect(0, 0, PAGE_W, 48, 'F');

			let logoAdded = false;
			if (company?.logoUrl) {
				const logoData = await fetchLogoBase64(company.logoUrl);
				if (logoData) {
					try { addImg(logoData, 'PNG', 14, 8, 24, 24); logoAdded = true; }
					catch { /* skip */ }
				}
			}
			const textX = logoAdded ? 42 : 14;

			doc.setFontSize(18);
			doc.setTextColor(255, 255, 255);
			if (companyName) {
				txt(companyName, textX, 20);
				doc.setFontSize(11);
				doc.setTextColor(160, 160, 160);
				txt(L.title, textX, 29);
			} else {
				txt(L.title, textX, 22);
			}
			doc.setFontSize(9);
			doc.setTextColor(130, 130, 130);
			txt(`${L.period}: ${L.periodLabels[period]}  |  ${fmtDate(periodStart)} - ${fmtDate(Date.now())}`, textX, 37);
			txt(`${L.exportDate}: ${fmtDate(Date.now())}`, textX, 44);

			// ── B) Stats table (left column LTR / right column RTL, x: 14–143) ─
			let y = 56;
			doc.setFontSize(11);
			doc.setTextColor(30, 30, 30);
			txt(L.stats, 14, y);
			y += 5;

			doc.setFillColor(37, 99, 235);
			rct(14, y, 129, 7, 'F');
			doc.setFontSize(8.5);
			doc.setTextColor(255, 255, 255);
			txt(L.metric, 16, y + 5);
			txt(L.value,  108, y + 5);
			y += 9;

			const statValues = [
				String(totalQuotes),
				String(totalOrders),
				`${fmt(totalQuoteAmount)} TRY`,
				`${fmt(totalOrderAmount)} TRY`,
				`%${conversionRate.toFixed(1)}`,
				`${fmt(avgQuoteAmount)} TRY`
			];

			L.fields.forEach((field, i) => {
				if (i % 2 === 0) { doc.setFillColor(245, 245, 250); rct(14, y - 4, 129, 7, 'F'); }
				doc.setFontSize(8);
				doc.setTextColor(30, 30, 30);
				txt(field,        16,  y);
				txt(statValues[i], 108, y);
				y += 8;
			});

			// ── C) Monthly target block ────────────────────────────────────────
			y += 4;
			doc.setFontSize(11);
			doc.setTextColor(30, 30, 30);
			txt(L.targetSection, 14, y);
			y += 5;

			const targetRows: [string, string][] = [
				[L.targetLabel, `${(330_000).toLocaleString('tr-TR')} $`],
				[L.achievedUsd, `${fmt(achievedUSD)} $`],
				[L.achievedTl,  `${fmt(achievedTL)} TL`],
				[L.remaining,   `${fmt(remaining)} $ ${L.remainingSuffix}`]
			];
			targetRows.forEach(([label, val], i) => {
				const bg = i === 3 ? [255, 243, 243] : (i % 2 === 0 ? [240, 253, 244] : [245, 250, 245]);
				doc.setFillColor(bg[0], bg[1], bg[2]);
				rct(14, y - 4, 129, 7, 'F');
				doc.setFontSize(8);
				doc.setTextColor(i === 3 ? 180 : 30, 30, 30);
				txt(label, 16,  y);
				txt(val,   108, y);
				y += 8;
			});

			// ── D) Charts (right column LTR / left column RTL, x: 153–283) ─────
			const barImg  = await captureElement(barChartContainer);
			const lineImg = await captureElement(lineChartContainer);

			if (barImg) {
				addImg(barImg, 'PNG', 153, 52, 132, 44);
			} else {
				let cx = 153, cy = 56;
				doc.setFontSize(9); doc.setTextColor(60, 60, 60);
				txt(L.barChartTitle, cx, cy); cy += 6;
				const vis = chartData.filter(d => d.quoteCount > 0 || d.orderCount > 0).slice(0, 10);
				if (vis.length === 0) {
					doc.setTextColor(150, 150, 150); txt(L.noData, cx, cy);
				} else {
					doc.setFillColor(37, 99, 235); rct(cx, cy, 80, 6, 'F');
					doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
					txt(L.colPeriod, cx + 1,  cy + 4.5);
					txt(L.colQuotes, cx + 30, cy + 4.5);
					txt(L.colOrders, cx + 55, cy + 4.5);
					cy += 8;
					vis.forEach((d, i) => {
						if (i % 2 === 0) { doc.setFillColor(245, 245, 250); rct(cx, cy - 4, 80, 6, 'F'); }
						doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
						txt(d.label,             cx + 1,  cy);
						txt(String(d.quoteCount), cx + 30, cy);
						txt(String(d.orderCount), cx + 55, cy);
						cy += 7;
					});
				}
			}

			if (lineImg) {
				addImg(lineImg, 'PNG', 153, 100, 132, 44);
			} else {
				let cx = 153, cy = 104;
				doc.setFontSize(9); doc.setTextColor(60, 60, 60);
				txt(L.lineChartTitle, cx, cy); cy += 6;
				const vis = chartData.filter(d => d.quoteAmt > 0 || d.orderAmt > 0).slice(0, 10);
				if (vis.length === 0) {
					doc.setTextColor(150, 150, 150); txt(L.noData, cx, cy);
				} else {
					doc.setFillColor(37, 99, 235); rct(cx, cy, 100, 6, 'F');
					doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
					txt(L.colPeriod,            cx + 1,  cy + 4.5);
					txt(`${L.colQuotes} TRY`,   cx + 30, cy + 4.5);
					txt(`${L.colOrders} TRY`,   cx + 70, cy + 4.5);
					cy += 8;
					vis.forEach((d, i) => {
						if (i % 2 === 0) { doc.setFillColor(245, 245, 250); rct(cx, cy - 4, 100, 6, 'F'); }
						doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
						txt(d.label,           cx + 1,  cy);
						txt(fmtK(d.quoteAmt),  cx + 30, cy);
						txt(fmtK(d.orderAmt),  cx + 70, cy);
						cy += 7;
					});
				}
			}

			// ── E) Detail table (personnel tab) ───────────────────────────────
			if (activeTab === 'personnel' && personnelRows.length > 0) {
				doc.addPage();
				setFnt();
				let dy = 20;
				doc.setFontSize(13); doc.setTextColor(30, 30, 30);
				txt(L.detail, 14, dy);
				dy += 8;

				const dc = [14, 55, 100, 170, 230]; // column x positions
				doc.setFillColor(37, 99, 235);
				rct(14, dy - 5, 265, 8, 'F');
				doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
				txt(L.date,     dc[0], dy);
				txt(L.customer, dc[1], dy);
				txt(L.quote,    dc[2], dy);
				txt(L.amount,   dc[3], dy);
				txt(L.status,   dc[4], dy);
				dy += 9;

				doc.setTextColor(30, 30, 30);
				for (const [ri, row] of personnelRows.entries()) {
					if (dy > 195) { doc.addPage(); setFnt(); dy = 20; }
					if (ri % 2 === 0) { doc.setFillColor(245, 245, 250); rct(14, dy - 4, 265, 7, 'F'); }
					doc.setFontSize(8);
					txt(row.date,                    dc[0], dy);
					txt(row.assignedTo.slice(0, 24), dc[1], dy);
					txt(row.quoteNumber,              dc[2], dy);
					txt(`${fmt(row.amount)} ${row.currency}`, dc[3], dy);
					txt(statusLabel(row.status),      dc[4], dy);
					dy += 7;
				}
			}

			doc.save('satis-raporu.pdf');
		} finally {
			pdfExporting = false;
			pdfModal     = false;
		}
	}
</script>

<!-- ── Page ──────────────────────────────────────────────────────────────── -->
<div class="flex h-full flex-col bg-[#111] text-white">

	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] px-6 py-4">
		<div>
			<h1 class="text-lg font-semibold text-white">Raporlar</h1>
			<p class="mt-0.5 text-sm text-gray-500">Satış performansı ve istatistikleri</p>
		</div>
		<button
			onclick={() => (pdfModal = true)}
			class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			PDF İndir
		</button>
	</div>

	<!-- Tabs + Period filter -->
	<div class="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] px-6">
		<div class="flex">
			{#each [['company', 'Şirket Raporu'], ['personnel', 'Personel Raporu']] as [tab, label] (tab)}
				<button
					onclick={() => (activeTab = tab as 'company' | 'personnel')}
					class="border-b-2 px-4 py-3 text-sm font-medium transition-colors {activeTab === tab
						? 'border-blue-500 text-white'
						: 'border-transparent text-gray-400 hover:text-white'}"
				>
					{label}
				</button>
			{/each}
		</div>
		<div class="flex gap-1 py-2">
			{#each [['daily','Günlük'],['weekly','Haftalık'],['monthly','Aylık'],['yearly','Yıllık']] as [p, label] (p)}
				<button
					onclick={() => (period = p as typeof period)}
					class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors {period === p
						? 'bg-blue-600 text-white'
						: 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white'}"
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 space-y-6 overflow-y-auto p-6">

		{#if loading}
			<div class="flex items-center justify-center py-20 text-gray-500">Yükleniyor…</div>
		{:else}

		<!-- Personnel selector -->
		{#if activeTab === 'personnel'}
			<div class="flex items-center gap-3">
				<span class="text-sm text-gray-400">Personel:</span>
				<select
					bind:value={selectedPersonnel}
					class="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="all">Tümü</option>
					{#each personnelList as p (p.uid)}
						<option value={p.uid}>{p.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Stat cards -->
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
			{#each [
				{ label: 'Toplam Teklif',  value: String(totalQuotes),                     sub: 'adet',            color: 'from-blue-600 to-blue-800'    },
				{ label: 'Toplam Sipariş', value: String(totalOrders),                     sub: 'adet',            color: 'from-teal-600 to-teal-800'    },
				{ label: 'Teklif Tutarı',  value: fmt(totalQuoteAmount),                   sub: 'TRY',             color: 'from-blue-500 to-indigo-700'  },
				{ label: 'Sipariş Tutarı', value: fmt(totalOrderAmount),                   sub: 'TRY',             color: 'from-teal-500 to-cyan-700'    },
				{ label: 'Dönüşüm Oranı', value: `%${conversionRate.toFixed(1)}`,          sub: 'teklif → sipariş',color: 'from-purple-600 to-purple-800' },
				{ label: 'Ort. Teklif',   value: fmt(avgQuoteAmount),                      sub: 'TRY / teklif',   color: 'from-rose-500 to-rose-700'    }
			] as card (card.label)}
				<div class="rounded-xl bg-gradient-to-br {card.color} p-5">
					<p class="text-xs font-medium uppercase tracking-wider text-white/70">{card.label}</p>
					<p class="mt-2 text-2xl font-bold text-white">{card.value}</p>
					<p class="mt-0.5 text-xs text-white/60">{card.sub}</p>
				</div>
			{/each}
		</div>

		<!-- Monthly target card -->
		<div class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-5">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-white">Aylık Satış Hedefi</h3>
				<span class="text-xs text-gray-500">Bu ay (USD bazlı)</span>
			</div>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div>
					<p class="text-xs text-gray-500">Hedef</p>
					<p class="mt-1 text-lg font-bold text-white">330.000 $</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Gerçekleşen (USD)</p>
					<p class="mt-1 text-lg font-bold text-teal-400">{fmt(achievedUSD)} $</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Gerçekleşen (TL)</p>
					<p class="mt-1 text-lg font-bold text-blue-400">{fmt(achievedTL)} ₺</p>
				</div>
				<div>
					<p class="text-xs text-gray-500">Hedefe Kalan</p>
					<p class="mt-1 text-lg font-bold {remaining > 0 ? 'text-rose-400' : 'text-green-400'}">{fmt(remaining)} $ KALDI</p>
				</div>
			</div>
			<!-- Progress bar -->
			<div class="mt-4 h-2 overflow-hidden rounded-full bg-[#2a2a2a]">
				<div
					class="h-2 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 transition-all"
					style="width: {Math.min(100, (achievedUSD / MONTHLY_TARGET_USD) * 100).toFixed(1)}%"
				></div>
			</div>
			<p class="mt-1.5 text-right text-xs text-gray-500">{((achievedUSD / MONTHLY_TARGET_USD) * 100).toFixed(1)}% tamamlandı</p>
		</div>

		<!-- Charts -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">

			<!-- Bar chart: counts -->
			<div bind:this={barChartContainer} class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-5">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-sm font-semibold text-white">Teklif / Sipariş Sayısı</h3>
					<div class="flex items-center gap-4 text-xs text-gray-400">
						<span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500"></span>Teklifler</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-teal-500"></span>Siparişler</span>
					</div>
				</div>
				{#if chartData.every(d => d.quoteCount === 0 && d.orderCount === 0)}
					<div class="flex h-[180px] items-center justify-center text-sm text-gray-600">Bu dönemde veri yok</div>
				{:else}
					<svg viewBox="0 0 {CW} {CH}" class="w-full" aria-label="Teklif/Sipariş bar chart">
						{#each yLabels(barMax) as tick, i (i)}
							{@const y = PT + IH - (tick / barMax) * IH}
							<line x1={PL} y1={y} x2={CW - PR} y2={y} stroke="#2a2a2a" stroke-width="1" />
							<text x={PL - 4} y={y + 3} text-anchor="end" font-size="9" fill="#555">{tick}</text>
						{/each}
						<line x1={PL} y1={PT} x2={PL} y2={PT + IH} stroke="#333" stroke-width="1" />
						<line x1={PL} y1={PT + IH} x2={CW - PR} y2={PT + IH} stroke="#333" stroke-width="1" />
						{#each chartData as d, i (i)}
							{@const slotW = IW / chartData.length}
							{@const barW = Math.max((slotW * 0.35), 2)}
							{@const x0 = PL + i * slotW + slotW * 0.15}
							{#if d.quoteCount > 0}
								<rect x={x0} y={barY(d.quoteCount, barMax)} width={barW} height={barH(d.quoteCount, barMax)} fill="#3b82f6" rx="2" />
							{/if}
							{#if d.orderCount > 0}
								<rect x={x0 + barW + 1} y={barY(d.orderCount, barMax)} width={barW} height={barH(d.orderCount, barMax)} fill="#14b8a6" rx="2" />
							{/if}
							{#if chartData.length <= 12 || i % Math.ceil(chartData.length / 12) === 0}
								<text x={x0 + barW} y={CH - 4} text-anchor="middle" font-size="8" fill="#666">{d.label}</text>
							{/if}
						{/each}
					</svg>
				{/if}
			</div>

			<!-- Line chart: amounts -->
			<div bind:this={lineChartContainer} class="rounded-xl border border-[#2a2a2a] bg-[#161616] p-5">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-sm font-semibold text-white">Tutar Trendi</h3>
					<div class="flex items-center gap-4 text-xs text-gray-400">
						<span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-blue-500"></span>Teklifler</span>
						<span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-teal-500"></span>Siparişler</span>
					</div>
				</div>
				{#if chartData.every(d => d.quoteAmt === 0 && d.orderAmt === 0)}
					<div class="flex h-[180px] items-center justify-center text-sm text-gray-600">Bu dönemde veri yok</div>
				{:else}
					<svg viewBox="0 0 {CW} {CH}" class="w-full" aria-label="Tutar trendi line chart">
						{#each yLabels(amtMax) as tick (tick)}
							{@const y = PT + IH - (tick / amtMax) * IH}
							<line x1={PL} y1={y} x2={CW - PR} y2={y} stroke="#2a2a2a" stroke-width="1" />
							<text x={PL - 4} y={y + 3} text-anchor="end" font-size="9" fill="#555">{fmtK(tick)}</text>
						{/each}
						<line x1={PL} y1={PT} x2={PL} y2={PT + IH} stroke="#333" stroke-width="1" />
						<line x1={PL} y1={PT + IH} x2={CW - PR} y2={PT + IH} stroke="#333" stroke-width="1" />
						{#each chartData as d, i (i)}
							{#if chartData.length <= 12 || i % Math.ceil(chartData.length / 12) === 0}
								{@const x = PL + (i / Math.max(chartData.length - 1, 1)) * IW}
								<text x={x} y={CH - 4} text-anchor="middle" font-size="8" fill="#666">{d.label}</text>
							{/if}
						{/each}
						{#if chartData.some(d => d.quoteAmt > 0)}
							<polyline points={linePoints(chartData, 'quoteAmt', amtMax)} fill="none" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
							{#each chartData as d, i (i)}
								{#if d.quoteAmt > 0}
									{@const x = PL + (i / Math.max(chartData.length - 1, 1)) * IW}
									<circle cx={x} cy={PT + IH - (d.quoteAmt / amtMax) * IH} r="3" fill="#3b82f6" />
								{/if}
							{/each}
						{/if}
						{#if chartData.some(d => d.orderAmt > 0)}
							<polyline points={linePoints(chartData, 'orderAmt', amtMax)} fill="none" stroke="#14b8a6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
							{#each chartData as d, i (i)}
								{#if d.orderAmt > 0}
									{@const x = PL + (i / Math.max(chartData.length - 1, 1)) * IW}
									<circle cx={x} cy={PT + IH - (d.orderAmt / amtMax) * IH} r="3" fill="#14b8a6" />
								{/if}
							{/each}
						{/if}
					</svg>
				{/if}
			</div>
		</div>

		<!-- Personnel detail table -->
		{#if activeTab === 'personnel'}
			<div class="rounded-xl border border-[#2a2a2a] bg-[#161616]">
				<div class="border-b border-[#2a2a2a] px-5 py-3">
					<h3 class="text-sm font-semibold text-white">Teklif Detayları</h3>
				</div>
				{#if personnelRows.length === 0}
					<div class="flex items-center justify-center py-10 text-sm text-gray-600">Bu dönemde teklif bulunamadı</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-[#2a2a2a] text-xs text-gray-500">
									<th class="px-5 py-3 text-left font-medium">Tarih</th>
									<th class="px-5 py-3 text-left font-medium">Atanan</th>
									<th class="px-5 py-3 text-left font-medium">Teklif No</th>
									<th class="px-5 py-3 text-right font-medium">Tutar</th>
									<th class="px-5 py-3 text-left font-medium">Durum</th>
								</tr>
							</thead>
							<tbody>
								{#each personnelRows as row, i (i)}
									<tr class="border-b border-[#1e1e1e] hover:bg-[#1a1a1a]">
										<td class="px-5 py-3 text-gray-300">{row.date}</td>
										<td class="px-5 py-3 text-gray-300">{row.assignedTo}</td>
										<td class="px-5 py-3 font-mono text-gray-300">{row.quoteNumber}</td>
										<td class="px-5 py-3 text-right text-gray-200">{fmt(row.amount)} {row.currency}</td>
										<td class="px-5 py-3">
											<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium
												{row.status === 'pending_finance' ? 'bg-amber-900/40 text-amber-400' :
												 row.status === 'cancelled'       ? 'bg-gray-800 text-gray-500'      :
												                                    'bg-blue-900/40 text-blue-400'}">
												{statusLabel(row.status)}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		{/if}
	</div>
</div>

<!-- ── PDF Language Modal ──────────────────────────────────────────────────── -->
{#if pdfModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
		role="dialog" aria-modal="true" tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) pdfModal = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') pdfModal = false; }}
	>
		<div class="w-84 rounded-2xl border border-[#2a2a2a] bg-[#161616] p-6 shadow-2xl" style="width:340px">
			<h2 class="mb-1 text-base font-semibold text-white">PDF Dili Seçin</h2>
			<p class="mb-4 text-sm text-gray-500">Rapor hangi dilde oluşturulsun?</p>

			<div class="space-y-2">
				{#each [
					{ code: 'tr', name: 'Türkçe',    flag: 'TR' },
					{ code: 'en', name: 'English',   flag: 'GB' },
					{ code: 'ru', name: 'Русский',   flag: 'RU' },
					{ code: 'ar', name: 'العربية',   flag: 'SA' },
					{ code: 'fr', name: 'Français',  flag: 'FR' }
				] as opt (opt.code)}
					<button
						onclick={() => (pdfLang = opt.code as Lang)}
						class="flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors
							{pdfLang === opt.code
								? 'border-blue-500 bg-blue-600/10 text-white'
								: 'border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a] hover:bg-[#1e1e1e]'}"
					>
						<!-- Flag code badge -->
						<span class="flex h-6 w-8 items-center justify-center rounded bg-[#2a2a2a] text-[10px] font-bold tracking-widest text-gray-300">
							{opt.flag}
						</span>
						<span class="font-medium">{opt.name}</span>
						{#if pdfLang === opt.code}
							<svg class="ml-auto h-4 w-4 shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>

			<div class="mt-5 flex gap-3">
				<button
					onclick={() => (pdfModal = false)}
					disabled={pdfExporting}
					class="flex-1 rounded-xl border border-[#2a2a2a] py-2.5 text-sm text-gray-400 hover:bg-[#1e1e1e] disabled:opacity-50"
				>
					İptal
				</button>
				<button
					onclick={exportPdf}
					disabled={pdfExporting}
					class="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
				>
					{pdfExporting ? 'Oluşturuluyor…' : 'PDF Oluştur'}
				</button>
			</div>
		</div>
	</div>
{/if}
