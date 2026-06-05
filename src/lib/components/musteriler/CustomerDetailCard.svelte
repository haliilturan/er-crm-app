<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { activeCompany } from '$lib/stores/activeCompany.svelte';
	import { Tabs, Button, Badge, Avatar } from '$lib/components/ui';

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
		createdAt: number;
	};

	type OrderRow = {
		id: string;
		orderNumber: string;
		status: string;
		currency: string;
		totalWithVat: number;
		createdAt: number;
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
	let tabValue   = $state('info');
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

	// ─── Timer ───────────────────────────────────────────────────────────────
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(noteTimer));

	// ─── Auth ─────────────────────────────────────────────────────────────────
	onMount(() => db.subscribeAuth((s) => { userId = s.user?.id ?? null; }));

	// ─── Reset tab on customer change ─────────────────────────────────────────
	$effect(() => {
		customerId; // track
		tabValue = 'info';
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
		if (!noteValid || !customerId || !activeCompany.current || !userId) return;

		noteSaving = true;
		noteError  = '';

		try {
			await db.transact([
				tx.customerNotes[id()].update({
					...(noteForm.title.trim() && { title: noteForm.title.trim() }),
					content:   noteForm.content.trim(),
					companyId: activeCompany.current.id,
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
</script>

<!-- ─── Loading ─────────────────────────────────────────────────────────────── -->
{#if loading}
	<div class="flex h-full items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
	</div>

{:else if customer}
	<div class="flex h-full flex-col overflow-hidden">

		<!-- ── Header ─────────────────────────────────────────────────────────── -->
		<div class="shrink-0 border-b border-gray-200 bg-white px-6 py-5">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-4 min-w-0">
					<Avatar fallbackText={initials(customer.name)} size="lg" />
					<div class="min-w-0">
						<h2 class="text-xl font-bold text-gray-800 leading-tight truncate">{customer.name}</h2>
						<div class="mt-1.5 flex flex-wrap items-center gap-2">
							{#if statusConfig[customer.status]}
								{@const sc = statusConfig[customer.status]!}
								<Badge variant={sc.variant} label={sc.label} />
							{/if}
							{#if customer.city}
								<span class="text-sm text-gray-400">{customer.city}</span>
							{/if}
							{#if customer.contactName}
								<span class="text-sm text-gray-400">· {customer.contactName}</span>
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

			<!-- Tabs -->
			<div class="mt-4">
				<Tabs bind:value={tabValue} tabs={TABS} />
			</div>
		</div>

		<!-- ── Tab content ────────────────────────────────────────────────────── -->
		<div class="flex-1 min-h-0 overflow-y-auto p-6">

			{#if tabValue === 'info'}
				<!-- ─── Bilgiler ──────────────────────────────────────────────── -->
				<div class="flex flex-col gap-4 max-w-2xl">

					<!-- Genel -->
					<div class="rounded-xl border border-gray-100 bg-white p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Genel</p>
						<dl class="divide-y divide-gray-50">
							{#snippet inforow(label: string, value: string | undefined)}
								{#if value}
									<div class="flex items-center justify-between gap-4 py-2.5">
										<dt class="text-sm text-gray-400 shrink-0">{label}</dt>
										<dd class="text-sm font-medium text-gray-700 text-right">{value}</dd>
									</div>
								{/if}
							{/snippet}
							{@render inforow('Müşteri Tipi', typeLabels[customer.companyType] ?? customer.companyType)}
							{@render inforow('Durum', statusConfig[customer.status]?.label ?? customer.status)}
							{@render inforow('Kaynak', customer.source ? (sourceLabels[customer.source] ?? customer.source) : undefined)}
						</dl>
					</div>

					<!-- İletişim -->
					<div class="rounded-xl border border-gray-100 bg-white p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">İletişim</p>
						<dl class="divide-y divide-gray-50">
							{#snippet inforow2(label: string, value: string | undefined)}
								{#if value}
									<div class="flex items-center justify-between gap-4 py-2.5">
										<dt class="text-sm text-gray-400 shrink-0">{label}</dt>
										<dd class="text-sm font-medium text-gray-700 text-right">{value}</dd>
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
					<div class="rounded-xl border border-gray-100 bg-white p-5">
						<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Sistem</p>
						<dl class="divide-y divide-gray-50">
							{#snippet inforow3(label: string, value: string | undefined)}
								{#if value}
									<div class="flex items-center justify-between gap-4 py-2.5">
										<dt class="text-sm text-gray-400 shrink-0">{label}</dt>
										<dd class="text-sm font-medium text-gray-700 text-right">{value}</dd>
									</div>
								{/if}
							{/snippet}
							{@render inforow3('Vergi No', customer.taxNumber)}
							{@render inforow3('Oluşturulma', formatDate(customer.createdAt))}
						</dl>
					</div>
				</div>

			{:else if tabValue === 'notes'}
				<!-- ─── Notlar ─────────────────────────────────────────────────── -->
				<div class="flex flex-col gap-4 max-w-2xl">

					<!-- Yeni not formu -->
					<div class="rounded-xl border border-gray-100 bg-white p-5">
						<p class="mb-3 text-sm font-semibold text-gray-700">Yeni Not</p>
						<div class="space-y-3">
							<input
								type="text"
								bind:value={noteForm.title}
								placeholder="Başlık (opsiyonel)"
								class="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
							/>
							<textarea
								bind:value={noteForm.content}
								rows="3"
								placeholder="Not içeriği..."
								class="block w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 {noteAttempted && !noteForm.content.trim()
									? 'border-red-400 focus:border-red-400 focus:ring-red-400'
									: 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white focus:ring-blue-400'}"
							></textarea>
							{#if noteAttempted && !noteForm.content.trim()}
								<p class="text-xs text-red-500">İçerik alanı zorunludur.</p>
							{/if}
							{#if noteError}
								<p class="text-xs text-red-500">{noteError}</p>
							{/if}
							<div class="flex justify-end">
								<button
									onclick={addNote}
									disabled={noteSaving}
									class="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
								>
									{#if noteSaving}
										<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
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
						<div class="rounded-xl border border-dashed border-gray-200 py-10 text-center">
							<p class="text-sm text-gray-400">Henüz not eklenmemiş.</p>
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							{#each notes as note (note.id)}
								<div class="rounded-xl border border-gray-100 bg-white p-5">
									{#if note.title}
										<p class="mb-1.5 text-sm font-semibold text-gray-800">{note.title}</p>
									{/if}
									<p class="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{note.content}</p>
									<div class="mt-3 flex items-center gap-2">
										<div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
											{initials(note.author?.fullName ?? 'K')}
										</div>
										<span class="text-xs text-gray-400">
											{note.author?.fullName ?? 'Kullanıcı'} · {formatTs(note.createdAt)}
										</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if tabValue === 'quotes'}
				<!-- ─── Teklifler ──────────────────────────────────────────────── -->
				<div class="max-w-2xl">
					{#if quotes.length === 0}
						<div class="rounded-xl border border-dashed border-gray-200 py-10 text-center">
							<p class="text-sm text-gray-400">Henüz teklif oluşturulmamış.</p>
						</div>
					{:else}
						<div class="flex flex-col gap-2">
							{#each quotes as quote (quote.id)}
								{@const qsc = statusConfig[quote.status]}
								<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4">
									<div>
										<p class="text-sm font-bold text-gray-800">{quote.quoteNumber}</p>
										<p class="text-xs text-gray-400 mt-0.5">{formatDate(quote.createdAt)}</p>
									</div>
									<div class="flex items-center gap-3">
										<span class="text-sm font-semibold text-gray-700">{formatMoney(quote.totalWithVat, quote.currency)}</span>
										{#if qsc}
											<Badge variant={qsc.variant} label={qsc.label} />
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if tabValue === 'orders'}
				<!-- ─── Siparişler ─────────────────────────────────────────────── -->
				<div class="max-w-2xl">
					{#if orders.length === 0}
						<div class="rounded-xl border border-dashed border-gray-200 py-10 text-center">
							<p class="text-sm text-gray-400">Henüz sipariş oluşturulmamış.</p>
						</div>
					{:else}
						<div class="flex flex-col gap-2">
							{#each orders as order (order.id)}
								{@const osc = statusConfig[order.status]}
								<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4">
									<div>
										<p class="text-sm font-bold text-gray-800">{order.orderNumber}</p>
										<p class="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
									</div>
									<div class="flex items-center gap-3">
										<span class="text-sm font-semibold text-gray-700">{formatMoney(order.totalWithVat, order.currency)}</span>
										{#if osc}
											<Badge variant={osc.variant} label={osc.label} />
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else}
				<!-- ─── Ödemeler (placeholder) ─────────────────────────────────── -->
				<div class="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200">
					<div class="text-center">
						<p class="text-sm font-medium text-gray-500">Ödemeler yakında</p>
						<p class="mt-0.5 text-xs text-gray-400">Bu bölüm geliştirme aşamasında.</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

{:else}
	<div class="flex h-full items-center justify-center">
		<p class="text-sm text-gray-400">Müşteri bulunamadı.</p>
	</div>
{/if}
