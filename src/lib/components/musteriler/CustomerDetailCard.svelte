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
