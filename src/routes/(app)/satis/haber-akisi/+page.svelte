<script lang="ts">
	import { untrack } from 'svelte';
	import { db } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Avatar, Badge, Modal } from '$lib/components/ui';

	// ── Types ──────────────────────────────────────────────────────────────────

	type Profile = { id: string; fullName: string; photoUrl?: string };

	type LineItem = {
		id: string;
		productName: string;
		productSku?: string;
		brandName?: string;
		unit: string;
		quantity: number;
		unitPrice: number;
		discountRate: number;
		vatRate: number;
		vatAmount: number;
		lineTotal: number;
		lineTotalWithVat: number;
		isIncludedPart: boolean;
		notes?: string;
	};

	type FeedOrder = {
		id: string;
		orderNumber: string;
		customerId: string;
		customerName?: string;
		companyId: string;
		totalWithVat: number;
		subtotal: number;
		totalVat: number;
		currency: string;
		status: string;
		paymentStatus?: string;
		createdBy: string;
		createdAt: number;
		notes?: string;
		customer?: { id: string; name: string };
		items?: LineItem[];
	};

	type UC = { id: string; userId: string; profile?: Profile };

	// ── State ──────────────────────────────────────────────────────────────────

	let orders           = $state<FeedOrder[]>([]);
	let profileByUserId  = $state<Record<string, Profile>>({});
	let loading          = $state(true);
	let companyId        = $derived(authStore.activeCompanyId ?? '');

	let teklifler  = $derived(orders.filter(o => ['draft', 'pending_finance'].includes(o.status)));
	let siparisler = $derived(orders.filter(o => ['in_production', 'shipped', 'completed', 'cancelled'].includes(o.status)));

	// Modal state
	let modalOpen   = $state(false);
	let modalType   = $state<'order' | 'quote'>('order');
	let modalData   = $state<FeedOrder | null>(null);

	// ── Subscription ──────────────────────────────────────────────────────────

	$effect(() => {
		const cId = companyId;
		if (!cId) return;
		loading = true;
		return db.subscribeQuery(
			{
				orders: {
					$: { where: { companyId: cId }, order: { createdAt: 'desc' } },
					customer: {},
					items: {}
				},
				userCompanies: {
					$: { where: { companyId: cId } },
					profile: {}
				}
			},
			(result) => {
				untrack(() => {
					const ucs = (result.data?.userCompanies ?? []) as UC[];
					profileByUserId = Object.fromEntries(
						ucs.filter((uc) => !!uc.profile).map((uc) => [uc.userId, uc.profile!])
					);
					orders  = (result.data?.orders ?? []) as FeedOrder[];
					loading = false;
				});
			}
		);
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function fmtDateTime(ts: number): string {
		const d = new Date(ts);
		const p = (n: number) => String(n).padStart(2, '0');
		return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} günü, saat ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}'te`;
	}

	function fmt(n: number, currency = 'TRY'): string {
		const sym: Record<string, string> = { TRY: 'TL', USD: '$', EUR: '€', GBP: '£' };
		return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym[currency] ?? currency}`;
	}

	function profileOf(uid: string): Profile | undefined { return profileByUserId[uid]; }

	function displayName(p: Profile | undefined): string { return p?.fullName ?? 'Personel'; }

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		return parts.length >= 2
			? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
			: name.slice(0, 2).toUpperCase();
	}

	type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

	const QUOTE_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
		draft:           { label: 'Taslak',          variant: 'default' },
		pending_finance: { label: 'Finans Bekliyor', variant: 'warning' },
		cancelled:       { label: 'İptal',           variant: 'danger'  }
	};

	const ORDER_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
		in_production: { label: 'Üretimde',    variant: 'info'    },
		shipped:       { label: 'Kargoda',     variant: 'info'    },
		completed:     { label: 'Tamamlandı',  variant: 'success' },
		cancelled:     { label: 'İptal',       variant: 'danger'  }
	};

	const PAYMENT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
		unpaid:  { label: 'Ödenmedi', variant: 'danger'  },
		partial: { label: 'Kısmi',    variant: 'warning' },
		paid:    { label: 'Ödendi',   variant: 'success' }
	};

	function statusBadge(map: Record<string, { label: string; variant: BadgeVariant }>, key: string | undefined) {
		return map[key ?? ''] ?? { label: key ?? '—', variant: 'default' as BadgeVariant };
	}

	function openModal(type: 'order' | 'quote', data: FeedOrder) {
		modalType = type;
		modalData = data;
		modalOpen = true;
	}

	// Sorted items: regular lines first, included parts last
	function sortedItems(items: LineItem[] | undefined): LineItem[] {
		if (!items?.length) return [];
		return [...items].sort((a, b) => {
			if (a.isIncludedPart === b.isIncludedPart) return 0;
			return a.isIncludedPart ? 1 : -1;
		});
	}
</script>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<div class="flex h-full flex-col overflow-hidden">

	<!-- Header -->
	<div class="shrink-0 border-b border-[#1e1e1e] px-6 py-4">
		<h2 class="text-base font-semibold text-white">Haber Akışı</h2>
		<p class="mt-0.5 text-xs text-gray-400">Tüm personelin teklif ve sipariş girişlerinin canlı akışı</p>
	</div>

	<!-- Two-column feed -->
	<div class="flex flex-1 gap-px overflow-hidden">

		<!-- ══ SİPARİŞLER ═══════════════════════════════════════════════════════ -->
		<div class="flex flex-1 flex-col overflow-hidden border-r border-[#1e1e1e]">
			<div class="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#1e1e1e]">
				<span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
				<h3 class="text-sm font-semibold text-white">Siparişler</h3>
				{#if !loading}
					<span class="ml-auto text-xs text-gray-500">{siparisler.length}</span>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto" style="scrollbar-width: thin;">
				{#if loading}
					{#each [1, 2, 3, 4] as _, i (i)}
						<div class="h-[130px] bg-[#141414] animate-pulse border-b border-[#1a1a1a]"></div>
					{/each}
				{:else if siparisler.length === 0}
					<div class="flex h-40 items-center justify-center text-xs text-gray-500">
						Henüz sipariş yok
					</div>
				{:else}
					{#each siparisler as order (order.id)}
						{@const p    = profileOf(order.createdBy)}
						{@const name = displayName(p)}
						{@const cust = order.customer?.name ?? order.customerName ?? 'Müşteri'}
						<div class="border-b border-[#1a1a1a] bg-[#111] hover:bg-[#161616] transition-colors px-4 py-4">
							<div class="flex gap-3">

								<!-- Avatar + name -->
								<div class="flex shrink-0 flex-col items-center gap-1.5 w-14">
									{#if p?.photoUrl}
										<Avatar image={p.photoUrl} size="lg" />
									{:else}
										<div class="w-14 h-14 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-sm font-bold text-gray-300">
											{initials(name)}
										</div>
									{/if}
									<span class="text-[9px] leading-tight text-center text-gray-400 w-full truncate">
										{name.split(' ')[0]}
									</span>
								</div>

								<!-- Info -->
								<div class="flex-1 min-w-0">
									<p class="text-sm font-semibold text-indigo-300 leading-tight">{name}</p>
									<p class="mt-0.5 text-[10px] text-gray-400 leading-snug">{fmtDateTime(order.createdAt)}</p>

									<div class="mt-1.5 flex flex-wrap items-center gap-1">
										<Badge label="Sipariş Giriş" variant="success" />
										<span class="text-[10px] text-gray-300">Olayını Gerçekleştirdi.</span>
									</div>

									<p class="mt-2 text-[10px] text-gray-400">
										Müşteri: <span class="font-bold text-white uppercase tracking-wide">{cust}</span>
									</p>

									<div class="mt-2 flex items-center justify-between gap-2">
										<button
											type="button"
											onclick={() => openModal('order', order)}
											class="px-2.5 py-0.5 rounded-full border border-emerald-700 text-[10px] font-medium text-emerald-400 hover:bg-emerald-900/30 transition-colors"
										>
											Detay
										</button>
										<span class="text-xs font-semibold text-white shrink-0">
											{fmt(order.totalWithVat ?? 0, order.currency)}
										</span>
									</div>
								</div>

							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- ══ TEKLİFLER ════════════════════════════════════════════════════════ -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<div class="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#1e1e1e]">
				<span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
				<h3 class="text-sm font-semibold text-white">Teklifler</h3>
				{#if !loading}
					<span class="ml-auto text-xs text-gray-500">{teklifler.length}</span>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto" style="scrollbar-width: thin;">
				{#if loading}
					{#each [1, 2, 3, 4] as _, i (i)}
						<div class="h-[130px] bg-[#141414] animate-pulse border-b border-[#1a1a1a]"></div>
					{/each}
				{:else if teklifler.length === 0}
					<div class="flex h-40 items-center justify-center text-xs text-gray-500">
						Henüz teklif yok
					</div>
				{:else}
					{#each teklifler as quote (quote.id)}
						{@const p    = profileOf(quote.createdBy)}
						{@const name = displayName(p)}
						{@const cust = quote.customer?.name ?? 'Müşteri'}
						<div class="border-b border-[#1a1a1a] bg-[#111] hover:bg-[#161616] transition-colors px-4 py-4">
							<div class="flex gap-3">

								<!-- Avatar + name -->
								<div class="flex shrink-0 flex-col items-center gap-1.5 w-14">
									{#if p?.photoUrl}
										<Avatar image={p.photoUrl} size="lg" />
									{:else}
										<div class="w-14 h-14 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-sm font-bold text-gray-300">
											{initials(name)}
										</div>
									{/if}
									<span class="text-[9px] leading-tight text-center text-gray-400 w-full truncate">
										{name.split(' ')[0]}
									</span>
								</div>

								<!-- Info -->
								<div class="flex-1 min-w-0">
									<p class="text-sm font-semibold text-indigo-300 leading-tight">{name}</p>
									<p class="mt-0.5 text-[10px] text-gray-400 leading-snug">{fmtDateTime(quote.createdAt)}</p>

									<div class="mt-1.5 flex flex-wrap items-center gap-1">
										<Badge label="Teklif Giriş" variant="warning" />
										<span class="text-[10px] text-gray-300">Olayını Gerçekleştirdi.</span>
									</div>

									<p class="mt-2 text-[10px] text-gray-400">
										Müşteri: <span class="font-bold text-white uppercase tracking-wide">{cust}</span>
									</p>

									<div class="mt-2 flex items-center justify-between gap-2">
										<button
											type="button"
											onclick={() => openModal('quote', quote)}
											class="px-2.5 py-0.5 rounded-full border border-amber-700 text-[10px] font-medium text-amber-400 hover:bg-amber-900/30 transition-colors"
										>
											Detay
										</button>
										<span class="text-xs font-semibold text-white shrink-0">
											{fmt(quote.totalWithVat ?? 0, quote.currency)}
										</span>
									</div>
								</div>

							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

	</div>
</div>

<!-- ════════════════════════════════════════════════════════════════════════ -->
<!-- DETAIL MODAL                                                           -->
<!-- ════════════════════════════════════════════════════════════════════════ -->
<Modal
	open={modalOpen}
	title={modalType === 'order' ? 'Sipariş Detayı' : 'Teklif Detayı'}
	width="680px"
	onclose={() => (modalOpen = false)}
>
	{#if modalData}
		<div class="overflow-y-auto max-h-[70vh] p-5" style="scrollbar-width: thin;">

			{#if modalType === 'order'}
				{@const o  = modalData as FeedOrder}
				{@const sb = statusBadge(ORDER_STATUS, o.status)}
				{@const pb = statusBadge(PAYMENT_STATUS, o.paymentStatus)}
				{@const lines = sortedItems(o.items)}

				<!-- Meta row -->
				<div class="grid grid-cols-2 gap-3 mb-5">
					<div>
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Sipariş No</p>
						<p class="text-sm font-mono font-semibold text-white">{o.orderNumber ?? '—'}</p>
					</div>
					<div>
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Tarih</p>
						<p class="text-sm text-gray-200">{fmtDateTime(o.createdAt)}</p>
					</div>
					<div>
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Müşteri</p>
						<p class="text-sm font-bold text-white uppercase">{o.customer?.name ?? o.customerName ?? '—'}</p>
					</div>
					<div class="flex flex-col gap-1.5">
						<p class="text-[10px] text-gray-500 uppercase tracking-wider">Durum</p>
						<div class="flex gap-1.5 flex-wrap">
							<Badge label={sb.label} variant={sb.variant} />
							<Badge label={pb.label} variant={pb.variant} />
						</div>
					</div>
				</div>

				<!-- Items table -->
				{#if lines.length > 0}
					<div class="rounded-xl border border-[#2a2a2a] overflow-hidden mb-4">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-[#2a2a2a] bg-[#1a1a1a]">
									<th class="text-left px-3 py-2 text-gray-400 font-medium">Ürün</th>
									<th class="text-right px-3 py-2 text-gray-400 font-medium w-12">Adet</th>
									<th class="text-right px-3 py-2 text-gray-400 font-medium w-24">Birim Fiyat</th>
									<th class="text-right px-3 py-2 text-gray-400 font-medium w-24">Toplam</th>
								</tr>
							</thead>
							<tbody>
								{#each lines as line (line.id)}
									<tr class="border-b border-[#1e1e1e] last:border-0
										{line.isIncludedPart ? 'opacity-60' : ''}">
										<td class="px-3 py-2">
											<p class="text-gray-100 leading-tight">{line.productName}</p>
											{#if line.productSku}
												<p class="text-[10px] text-gray-500">{line.productSku}</p>
											{/if}
											{#if line.isIncludedPart}
												<span class="text-[9px] text-emerald-500">+ Dahil</span>
											{/if}
										</td>
										<td class="px-3 py-2 text-right text-gray-200">{line.quantity} {line.unit}</td>
										<td class="px-3 py-2 text-right text-gray-200">{fmt(line.unitPrice, o.currency)}</td>
										<td class="px-3 py-2 text-right font-medium text-white">{fmt(line.lineTotalWithVat, o.currency)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-xs text-gray-500 mb-4">Sipariş kalemi bulunamadı.</p>
				{/if}

				<!-- Totals -->
				<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 flex flex-col gap-1.5">
					<div class="flex justify-between text-xs text-gray-400">
						<span>Ara Toplam</span><span>{fmt(o.subtotal ?? 0, o.currency)}</span>
					</div>
					<div class="flex justify-between text-xs text-gray-400">
						<span>KDV</span><span>{fmt(o.totalVat ?? 0, o.currency)}</span>
					</div>
					<div class="flex justify-between text-sm font-bold text-white border-t border-[#2a2a2a] pt-1.5 mt-0.5">
						<span>Genel Toplam</span><span>{fmt(o.totalWithVat ?? 0, o.currency)}</span>
					</div>
				</div>

				{#if o.notes}
					<div class="mt-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notlar</p>
						<p class="text-xs text-gray-300">{o.notes}</p>
					</div>
				{/if}

			{:else}
				{@const q  = modalData as FeedOrder}
				{@const sb = statusBadge(QUOTE_STATUS, q.status)}
				{@const lines = sortedItems(q.items)}

				<!-- Meta row -->
				<div class="grid grid-cols-2 gap-3 mb-5">
					<div>
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Teklif No</p>
						<p class="text-sm font-mono font-semibold text-white">{q.orderNumber ?? '—'}</p>
					</div>
					<div>
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Tarih</p>
						<p class="text-sm text-gray-200">{fmtDateTime(q.createdAt)}</p>
					</div>
					<div>
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Müşteri</p>
						<p class="text-sm font-bold text-white uppercase">{q.customer?.name ?? '—'}</p>
					</div>
					<div class="flex flex-col gap-1.5">
						<p class="text-[10px] text-gray-500 uppercase tracking-wider">Durum</p>
						<Badge label={sb.label} variant={sb.variant} />
					</div>
				</div>

				<!-- Items table -->
				{#if lines.length > 0}
					<div class="rounded-xl border border-[#2a2a2a] overflow-hidden mb-4">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-[#2a2a2a] bg-[#1a1a1a]">
									<th class="text-left px-3 py-2 text-gray-400 font-medium">Ürün</th>
									<th class="text-right px-3 py-2 text-gray-400 font-medium w-12">Adet</th>
									<th class="text-right px-3 py-2 text-gray-400 font-medium w-24">Birim Fiyat</th>
									<th class="text-right px-3 py-2 text-gray-400 font-medium w-24">Toplam</th>
								</tr>
							</thead>
							<tbody>
								{#each lines as line (line.id)}
									<tr class="border-b border-[#1e1e1e] last:border-0
										{line.isIncludedPart ? 'opacity-60' : ''}">
										<td class="px-3 py-2">
											<p class="text-gray-100 leading-tight">{line.productName}</p>
											{#if line.productSku}
												<p class="text-[10px] text-gray-500">{line.productSku}</p>
											{/if}
											{#if line.notes}
												<p class="text-[10px] text-gray-500 italic">{line.notes}</p>
											{/if}
											{#if line.isIncludedPart}
												<span class="text-[9px] text-emerald-500">+ Dahil</span>
											{/if}
										</td>
										<td class="px-3 py-2 text-right text-gray-200">{line.quantity} {line.unit}</td>
										<td class="px-3 py-2 text-right text-gray-200">{fmt(line.unitPrice, q.currency)}</td>
										<td class="px-3 py-2 text-right font-medium text-white">{fmt(line.lineTotalWithVat, q.currency)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-xs text-gray-500 mb-4">Teklif kalemi bulunamadı.</p>
				{/if}

				<!-- Totals -->
				<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 flex flex-col gap-1.5">
					<div class="flex justify-between text-xs text-gray-400">
						<span>Ara Toplam</span><span>{fmt(q.subtotal ?? 0, q.currency)}</span>
					</div>
					<div class="flex justify-between text-xs text-gray-400">
						<span>KDV</span><span>{fmt(q.totalVat ?? 0, q.currency)}</span>
					</div>
					<div class="flex justify-between text-sm font-bold text-white border-t border-[#2a2a2a] pt-1.5 mt-0.5">
						<span>Genel Toplam</span><span>{fmt(q.totalWithVat ?? 0, q.currency)}</span>
					</div>
				</div>

				{#if q.notes}
					<div class="mt-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
						<p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notlar</p>
						<p class="text-xs text-gray-300">{q.notes}</p>
					</div>
				{/if}
			{/if}

		</div>
	{/if}
</Modal>
