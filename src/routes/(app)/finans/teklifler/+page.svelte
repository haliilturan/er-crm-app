<script lang="ts">
	import { untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Badge, SectionHead } from '$lib/components/ui';
	import { refreshRates } from '$lib/services/rates';

	// ── Types ──────────────────────────────────────────────────────────────────

	type OrderItem = {
		id: string;
		productId?: string;
		parentItemId?: string;
		isIncludedPart: boolean;
		productName: string;
		productSku?: string;
		brandName?: string;
		unit: string;
		quantity: number;
		listPrice: number;
		discountRate: number;
		unitPrice: number;
		vatRate: number;
		vatAmount: number;
		lineTotal: number;
		lineTotalWithVat: number;
		notes?: string;
		sortOrder: number;
	};

	type Order = {
		id: string;
		orderNumber: string;
		customerId: string;
		companyId: string;
		status: string;
		currency: string;
		subtotal: number;
		totalVat: number;
		totalWithVat: number;
		financeApprovedAt?: number;
		financeApprovedBy?: string;
		deliveryType?: string;
		paymentType?: string;
		deliveryAddress?: string;
		deliveryCity?: string;
		deliveryCountry?: string;
		notes?: string;
		createdBy: string;
		createdAt: number;
		customer?: { id: string; name: string };
		items?: OrderItem[];
	};

	// ── State ──────────────────────────────────────────────────────────────────

	let orders     = $state<Order[]>([]);
	let loading    = $state(true);
	let myFullName = $state('');

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) return;
		return db.subscribeQuery(
			{ userProfiles: { $: { where: { userId: uid } } } },
			(res) => {
				untrack(() => {
					const p = (res.data?.userProfiles ?? [])[0] as any;
					myFullName = p?.fullName ?? authStore.userEmail?.split('@')[0] ?? 'Kullanıcı';
				});
			}
		);
	});

	let saving   = $state(false);
	let errorMsg = $state('');

	// Detail modal
	let detailOpen  = $state(false);
	let detailOrder = $state<Order | null>(null);

	function openDetail(o: Order) {
		detailOrder = o;
		detailOpen  = true;
	}

	// ── Subscription ──────────────────────────────────────────────────────────

	$effect(() => {
		loading = true;
		return db.subscribeQuery(
			{
				orders: {
					$: { where: { status: 'pending_finance' }, order: { createdAt: 'desc' } },
					customer: {},
					items: {}
				}
			},
			(result) => {
				untrack(() => {
					orders = (result.data?.orders ?? []) as Order[];
					loading = false;
				});
			}
		);
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function fmt(n: number, cur = 'TRY'): string {
		return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
	}

	function fmtDate(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', {
			day: '2-digit', month: '2-digit', year: 'numeric'
		});
	}

	type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

	function statusBadge(o: Order): { label: string; variant: BadgeVariant } {
		if (o.status === 'pending_finance') return { label: 'Finans Bekliyor', variant: 'warning' };
		return { label: 'İnceleniyor', variant: 'info' };
	}

	// ── Actions ───────────────────────────────────────────────────────────────

	async function approveOrder(order: Order) {
		if (saving) return;
		saving = true;
		errorMsg = '';
		await refreshRates();
		try {
			const now    = Date.now();
			const userId = authStore.userId!;

			await db.transact([
				tx.orders[order.id].update({
					status:            'in_production',
					financeApprovedAt: now,
					financeApprovedBy: userId,
					paymentStatus:     'unpaid',
					updatedBy:         userId,
					updatedAt:         now
				}),
				tx.orderStatusHistory[id()].update({
					orderId:    order.id,
					fromStatus: 'pending_finance',
					toStatus:   'in_production',
					changedBy:  userId,
					changedAt:  now
				}),
				tx.activityFeed[id()].update({
					type:                'order_approved',
					companyId:           order.companyId,
					actorId:             userId,
					actorName:           myFullName,
					description:         '1 teklif onaylandı, siparişe geçti',
					relatedEntityType:   'order',
					relatedEntityId:     order.id,
					relatedEntityNumber: order.orderNumber,
					customerId:          order.customerId,
					customerCompanyName: order.customer?.name ?? '',
					createdAt:           now
				})
			]);
		} catch (err) {
			console.error('[approveOrder] error:', err);
			errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
		} finally {
			saving = false;
		}
	}


</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- Header -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
		<SectionHead title="Finans — Teklifler" description="Finans onayı bekleyen teklifler" />
	</div>

	<!-- Error banner -->
	{#if errorMsg}
		<div class="mx-4 mt-3 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-xs text-red-400">
			{errorMsg}
		</div>
	{/if}

	<!-- List -->
	<div class="flex-1 overflow-y-auto p-4" style="scrollbar-width: thin;">
		{#if loading}
			<div class="flex h-32 items-center justify-center">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
			</div>
		{:else if orders.length === 0}
			<div class="flex h-32 items-center justify-center text-sm text-[#555]">
				Bekleyen teklif yok
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each orders as q (q.id)}
					{@const sb = statusBadge(q)}
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
						<div class="flex items-start justify-between gap-3">
							<!-- Info -->
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate text-sm font-medium text-white">
										{q.customer?.name ?? 'Müşteri'}
									</p>
									<Badge label={sb.label} variant={sb.variant} />
								</div>
								<p class="mt-0.5 text-xs text-[#555]">
									{q.orderNumber} · {fmtDate(q.createdAt)} ·
									{(q.items ?? []).length} kalem
								</p>
								<p class="mt-1 text-sm font-semibold text-white">
									{fmt(q.totalWithVat, q.currency)}
								</p>
							</div>

							<!-- Actions -->
							<div class="flex shrink-0 items-start gap-2">
								<button
									onclick={() => openDetail(q)}
									class="rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#888] transition hover:border-[#555] hover:text-white"
								>
									Detay
								</button>
								{#if authStore.isFinans}
									<button
										onclick={() => approveOrder(q)}
										disabled={saving}
										class="rounded-lg border border-emerald-700 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-800/50 disabled:opacity-40"
									>
										Onayla
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

</div>

<!-- Detail modal -->
{#if detailOpen && detailOrder}
	{@const dq = detailOrder}
	{@const sb = statusBadge(dq)}
	{@const sortedItems = [...(dq.items ?? [])].sort((a, b) => {
		if (a.isIncludedPart !== b.isIncludedPart) return a.isIncludedPart ? 1 : -1;
		return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
	})}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Sipariş Detayı"
		tabindex="-1"
		onclick={() => (detailOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (detailOpen = false)}
	>
		<div
			class="relative flex w-[720px] max-h-[80vh] flex-col rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="shrink-0 flex items-center justify-between border-b border-[#2a2a2a] px-6 py-4">
				<div>
					<p class="text-base font-bold text-white">{dq.orderNumber}</p>
					<p class="text-xs text-[#555] mt-0.5">
						{fmtDate(dq.createdAt)} · {dq.customer?.name ?? '—'} · {(dq.items ?? []).length} kalem
					</p>
				</div>
				<div class="flex items-center gap-3">
					<Badge label={sb.label} variant={sb.variant} />
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

			<div class="flex-1 min-h-0 overflow-y-auto p-6" style="scrollbar-width: thin;">
				{#if sortedItems.length === 0}
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
							{#each sortedItems as it (it.id)}
								<tr class="border-b border-[#1e1e1e] {it.isIncludedPart ? 'opacity-60' : ''}">
									<td class="py-2 pr-3">
										<p class="{it.isIncludedPart ? 'text-[#888]' : 'text-white'}">{it.productName}</p>
										{#if it.isIncludedPart}
											<span class="text-[10px] text-[#555]">Dahil</span>
										{/if}
									</td>
									<td class="py-2 pr-3 text-right text-[#aaa]">{it.quantity} {it.unit}</td>
									<td class="py-2 pr-3 text-right text-[#aaa]">{fmt(it.unitPrice ?? 0, dq.currency)}</td>
									<td class="py-2 text-right text-white">{fmt(it.lineTotalWithVat ?? 0, dq.currency)}</td>
								</tr>
							{/each}
						</tbody>
					</table>

					<div class="mt-4 flex flex-col items-end gap-1.5 border-t border-[#2a2a2a] pt-4">
						<div class="flex items-center gap-6">
							<span class="text-xs text-[#555]">Ara Toplam</span>
							<span class="w-36 text-right text-sm text-[#aaa]">{fmt(dq.subtotal, dq.currency)}</span>
						</div>
						<div class="flex items-center gap-6">
							<span class="text-xs text-[#555]">KDV</span>
							<span class="w-36 text-right text-sm text-[#aaa]">{fmt(dq.totalVat, dq.currency)}</span>
						</div>
						<div class="flex items-center gap-6">
							<span class="text-xs font-semibold text-[#888]">GENEL TOPLAM</span>
							<span class="w-36 text-right text-base font-bold text-white">{fmt(dq.totalWithVat, dq.currency)}</span>
						</div>
					</div>

					{#if dq.notes?.trim()}
						<div class="mt-4 rounded-lg border border-[#2a2a2a] bg-[#111] px-4 py-3">
							<p class="mb-1 text-xs text-[#555]">Notlar</p>
							<p class="whitespace-pre-wrap text-sm text-[#888]">{dq.notes}</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
