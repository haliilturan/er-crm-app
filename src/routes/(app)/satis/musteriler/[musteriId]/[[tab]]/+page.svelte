<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { salesStore } from '$lib/stores/sales.svelte';
	import CustomerDetailCard from '$lib/components/musteriler/CustomerDetailCard.svelte';

	// Map URL slug → internal tab value
	const SLUG_TO_TAB: Record<string, string> = {
		bilgiler:   'info',
		notlar:     'notes',
		teklifler:  'quotes',
		siparisler: 'orders',
		odemeler:   'payments'
	};

	// Map internal tab value → URL slug (empty string = base URL, no slug)
	const TAB_TO_SLUG: Record<string, string> = {
		info:     '',
		notes:    'notlar',
		quotes:   'teklifler',
		orders:   'siparisler',
		payments: 'odemeler'
	};

	let musteriId  = $derived($page.params.musteriId ?? '');
	let initialTab = $derived(SLUG_TO_TAB[$page.params.tab ?? ''] ?? 'info');

	function handleTabChange(tab: string) {
		const slug = TAB_TO_SLUG[tab] ?? '';
		const target = slug
			? `/satis/musteriler/${musteriId}/${slug}`
			: `/satis/musteriler/${musteriId}`;
		goto(target, { replaceState: true });
	}
</script>

<svelte:head>
	<title>Müşteri Detay — Satış</title>
</svelte:head>

<CustomerDetailCard
	customerId={musteriId}
	{initialTab}
	onTabChange={handleTabChange}
	onedit={salesStore.openEdit}
/>
