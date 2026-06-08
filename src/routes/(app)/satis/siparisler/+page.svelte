<script lang="ts">
	import { untrack } from 'svelte';
	import { db } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { Badge, SectionHead } from '$lib/components/ui';

	type Order = {
		id: string;
		orderNumber?: string;
		customerName?: string;
		customerId: string;
		companyId: string;
		totalWithVat: number;
		currency: string;
		status: string;
		paymentStatus?: string;
		createdAt: number;
	};

	let orders   = $state<Order[]>([]);
	let loading  = $state(true);

	let companyId = $derived(authStore.activeCompanyId ?? '');

	$effect(() => {
		const cId = companyId;
		if (!cId) return;
		loading = true;
		return db.subscribeQuery(
			{ orders: { $: { where: { companyId: cId }, order: { createdAt: 'desc' } } } },
			(result) => {
				untrack(() => {
					orders  = (result.data?.orders ?? []) as Order[];
					loading = false;
				});
			}
		);
	});

	type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

	function paymentBadge(status: string | undefined): { label: string; variant: BadgeVariant } {
		if (status === 'paid')    return { label: 'Ödendi',   variant: 'success' };
		if (status === 'partial') return { label: 'Kısmi',    variant: 'warning' };
		return                           { label: 'Ödenmedi', variant: 'danger'  };
	}

	function statusBadge(status: string): { label: string; variant: BadgeVariant } {
		if (status === 'completed') return { label: 'Tamamlandı', variant: 'success' };
		if (status === 'cancelled') return { label: 'İptal',      variant: 'danger'  };
		return                             { label: 'Aktif',      variant: 'info'    };
	}

	function fmtDate(ts: number): string {
		return new Date(ts).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	function fmt(n: number, currency = 'TRY'): string {
		return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
	}
</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- Header -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
		<SectionHead title="Siparişler" description="Onaylı tekliflerden oluşturulan siparişler" />
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
					{@const sb = statusBadge(order.status)}
					<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate text-sm font-medium text-white">
										{order.customerName ?? 'Müşteri'}
									</p>
									<Badge label={sb.label} variant={sb.variant} />
								</div>
								<p class="mt-0.5 text-xs text-[#555]">
									{order.orderNumber ?? '—'} · {fmtDate(order.createdAt)}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<Badge label={pb.label} variant={pb.variant} />
								<span class="text-sm font-semibold text-white">
									{fmt(order.totalWithVat ?? 0, order.currency)}
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

</div>
