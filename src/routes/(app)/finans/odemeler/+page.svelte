<script lang="ts">
	import { untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Badge, SectionHead, Modal, TextInput, TextArea, NumberInput } from '$lib/components/ui';

	// ── Types ──────────────────────────────────────────────────────────────────

	type Payment = {
		id: string;
		amount: number;
		currency: string;
		paidAt: number;
		note?: string;
		recordedBy: string;
	};

	type Order = {
		id: string;
		orderNumber: string;
		customerName?: string;
		customerId: string;
		companyId: string;
		totalWithVat: number;
		currency: string;
		status: string;
		paymentStatus?: string;
		createdAt: number;
		payments?: Payment[];
	};

	// ── State ──────────────────────────────────────────────────────────────────

	let orders    = $state<Order[]>([]);
	let loading   = $state(true);
	let companyId = $derived(authStore.activeCompanyId ?? '');

	// Modal
	let modalOpen    = $state(false);
	let activeOrder  = $state<Order | null>(null);
	let payAmount    = $state(0);
	let payCurrency  = $state('TRY');
	let payDateStr   = $state('');
	let payNote      = $state('');
	let saving       = $state(false);
	let errorMsg     = $state('');

	// ── Subscription ──────────────────────────────────────────────────────────

	$effect(() => {
		const cId = companyId;
		if (!cId) return;
		loading = true;
		return db.subscribeQuery(
			{
				orders: {
					$: { where: { companyId: cId }, order: { createdAt: 'desc' } },
					payments: {}
				}
			},
			(result) => {
				untrack(() => {
					orders  = (result.data?.orders ?? []) as Order[];
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

	function paidTotal(order: Order): number {
		return (order.payments ?? []).reduce((s, p) => s + p.amount, 0);
	}

	function remaining(order: Order): number {
		return Math.max(0, order.totalWithVat - paidTotal(order));
	}

	type BadgeVariant = 'success' | 'warning' | 'danger' | 'default';

	function paymentBadge(status: string | undefined): { label: string; variant: BadgeVariant } {
		if (status === 'paid')    return { label: 'Ödendi',   variant: 'success' };
		if (status === 'partial') return { label: 'Kısmi',    variant: 'warning' };
		return                           { label: 'Ödenmedi', variant: 'danger'  };
	}

	function todayStr(): string {
		const d = new Date();
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	// ── Open modal ────────────────────────────────────────────────────────────

	function openModal(order: Order) {
		activeOrder = order;
		payAmount   = 0;
		payCurrency = order.currency ?? 'TRY';
		payDateStr  = todayStr();
		payNote     = '';
		errorMsg    = '';
		modalOpen   = true;
	}

	// ── Save payment ──────────────────────────────────────────────────────────

	async function savePayment() {
		if (!activeOrder || saving || payAmount <= 0) return;
		saving   = true;
		errorMsg = '';
		try {
			const payId    = id();
			const now      = Date.now();
			const paidAtTs = payDateStr ? new Date(payDateStr).getTime() : now;
			const userId   = authStore.userId!;

			// Calculate new paymentStatus
			const prevPaid = paidTotal(activeOrder);
			const newPaid  = prevPaid + payAmount;
			const total    = activeOrder.totalWithVat;
			const newStatus =
				newPaid >= total - 0.01 ? 'paid' :
				newPaid > 0             ? 'partial' : 'unpaid';

			await db.transact([
				// Create payment record
				tx.payments[payId].update({
					orderId:      activeOrder.id,
					customerId:   activeOrder.customerId,
					customerName: activeOrder.customerName ?? '',
					companyId:    activeOrder.companyId,
					amount:       payAmount,
					currency:     payCurrency,
					paidAt:       paidAtTs,
					note:         payNote || undefined,
					recordedBy:   userId,
					createdAt:    now
				}),
				// Link payment → order
				tx.payments[payId].link({ order: activeOrder.id }),
				// Update order paymentStatus
				tx.orders[activeOrder.id].update({
					paymentStatus: newStatus,
					updatedAt:     now
				})
			]);

			modalOpen = false;
		} catch (err) {
			console.error('[savePayment] error:', err);
			errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- Header -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
		<SectionHead title="Ödemeler" description="Sipariş ödeme takibi" />
	</div>

	<!-- List -->
	<div class="flex-1 overflow-y-auto p-4" style="scrollbar-width: thin;">
		{#if loading}
			<div class="flex h-32 items-center justify-center">
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
			</div>
		{:else if orders.length === 0}
			<div class="flex h-32 items-center justify-center text-sm text-[#555]">
				Henüz sipariş yok
			</div>
		{:else}
			<div class="flex flex-col gap-2">
				{#each orders as order (order.id)}
					{@const pb = paymentBadge(order.paymentStatus)}
					{@const paid = paidTotal(order)}
					{@const rem  = remaining(order)}
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
						<div class="flex items-start justify-between gap-3">
							<!-- Info -->
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate text-sm font-medium text-white">
										{order.customerName ?? 'Müşteri'}
									</p>
									<Badge label={pb.label} variant={pb.variant} />
								</div>
								<p class="mt-0.5 text-xs text-[#555]">
									{order.orderNumber} · {fmtDate(order.createdAt)}
								</p>

								<!-- Progress row -->
								<div class="mt-2 flex items-center gap-3 text-xs">
									<span class="text-[#777]">Toplam</span>
									<span class="text-white">{fmt(order.totalWithVat, order.currency)}</span>
									<span class="text-[#777]">Ödenen</span>
									<span class="text-emerald-400">{fmt(paid, order.currency)}</span>
									{#if rem > 0.01}
										<span class="text-[#777]">Kalan</span>
										<span class="text-amber-400">{fmt(rem, order.currency)}</span>
									{/if}
								</div>

								<!-- Existing payments -->
								{#if (order.payments ?? []).length > 0}
									<div class="mt-2 flex flex-col gap-1">
										{#each (order.payments ?? []) as p (p.id)}
											<div class="flex items-center gap-2 text-xs text-[#666]">
												<span class="text-emerald-600">+</span>
												<span>{fmt(p.amount, p.currency)}</span>
												<span>·</span>
												<span>{fmtDate(p.paidAt)}</span>
												{#if p.note}
													<span>· {p.note}</span>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Add payment button (finans/admin) -->
							{#if authStore.isFinans && order.paymentStatus !== 'paid'}
								<button
									onclick={() => openModal(order)}
									class="shrink-0 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs font-medium text-[#aaa] transition hover:bg-[#222] hover:text-white"
								>
									+ Ödeme Ekle
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

</div>

<!-- Add payment modal -->
<Modal
	open={modalOpen}
	title="Ödeme Ekle — {activeOrder?.orderNumber ?? ''}"
	width="420px"
	onclose={() => (modalOpen = false)}
>
	<div class="p-5">
		<div class="flex flex-col gap-4">
			<div class="flex gap-3">
				<div class="flex-1">
					<NumberInput label="Tutar" bind:value={payAmount} min={0.01} step={0.01} />
				</div>
				<div class="w-28">
					<label for="pay-currency" class="mb-1 block text-xs text-[#777]">Para Birimi</label>
					<select
						id="pay-currency"
						bind:value={payCurrency}
						class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
					>
						<option value="TRY">TRY</option>
						<option value="USD">USD</option>
						<option value="EUR">EUR</option>
						<option value="GBP">GBP</option>
					</select>
				</div>
			</div>

			<div>
				<label for="pay-date" class="mb-1 block text-xs text-[#777]">Ödeme Tarihi</label>
				<input
					id="pay-date"
					type="date"
					bind:value={payDateStr}
					class="w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#444]"
				/>
			</div>

			<TextArea label="Not" bind:value={payNote} rows={2} placeholder="Opsiyonel not..." />

			{#if activeOrder}
				<div class="rounded-lg bg-[#111] px-3 py-2 text-xs text-[#666]">
					Kalan bakiye:
					<span class="ml-1 text-amber-400 font-medium">
						{fmt(remaining(activeOrder), activeOrder.currency)}
					</span>
				</div>
			{/if}

			{#if errorMsg}
				<p class="text-xs text-red-400">{errorMsg}</p>
			{/if}
		</div>

		<div class="mt-5 flex justify-end gap-2">
			<button
				onclick={() => (modalOpen = false)}
				class="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-[#aaa] transition hover:bg-[#222]"
			>
				İptal
			</button>
			<button
				onclick={savePayment}
				disabled={saving || payAmount <= 0}
				class="rounded-lg border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-800/50 disabled:opacity-40"
			>
				{saving ? 'Kaydediliyor…' : 'Kaydet'}
			</button>
		</div>
	</div>
</Modal>
