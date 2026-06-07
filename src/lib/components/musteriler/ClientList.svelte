<script lang="ts">
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import ListItemCard from '$lib/components/ui/ListItemCard.svelte';

	export interface Client {
		id: string;
		name: string;
		country: string;
		phone: string;
		industry: string;
		relatedPerson: string;
		deliveryAddress: string;
		billingAddress: string;
		email: string;
		createdAt: string;
		initials: string;
	}

	let {
		onSelect,
		selectedId = null,
		onNewClient
	}: {
		onSelect: (client: Client) => void;
		selectedId?: string | null;
		onNewClient?: () => void;
	} = $props();

	type ListTab = 'latest' | 'search' | 'new';
	let activeTab = $state<ListTab>('latest');
	let searchQuery = $state('');

	const mockClients: Client[] = [
		{
			id: '1',
			name: 'TUR International',
			country: 'Turkey',
			phone: '+90 532 123 4567',
			industry: 'Technology',
			relatedPerson: 'Ahmet Yılmaz',
			deliveryAddress: 'Maslak Mah. AOS 55. Sk. No:2 İstanbul',
			billingAddress: 'Maslak Mah. AOS 55. Sk. No:2 İstanbul',
			email: 'info@tur.com',
			createdAt: 'Dec 1, 2024',
			initials: 'TUR'
		},
		{
			id: '2',
			name: 'Acme Corporation',
			country: 'USA',
			phone: '+1 555 987 6543',
			industry: 'Manufacturing',
			relatedPerson: 'John Smith',
			deliveryAddress: '123 Business Ave, New York, NY',
			billingAddress: '123 Business Ave, New York, NY',
			email: 'contact@acme.com',
			createdAt: 'Dec 2, 2024',
			initials: 'ACM'
		},
		{
			id: '3',
			name: 'Global Trade GmbH',
			country: 'Germany',
			phone: '+49 89 1234 5678',
			industry: 'Logistics',
			relatedPerson: 'Hans Müller',
			deliveryAddress: 'Hauptstraße 42, 80331 München',
			billingAddress: 'Hauptstraße 42, 80331 München',
			email: 'info@globaltrade.de',
			createdAt: 'Dec 3, 2024',
			initials: 'GTG'
		},
		{
			id: '4',
			name: 'Pacific Solutions',
			country: 'Japan',
			phone: '+81 3 1234 5678',
			industry: 'Electronics',
			relatedPerson: 'Kenji Tanaka',
			deliveryAddress: '1-1 Marunouchi, Chiyoda-ku, Tokyo',
			billingAddress: '1-1 Marunouchi, Chiyoda-ku, Tokyo',
			email: 'info@pacific.jp',
			createdAt: 'Dec 4, 2024',
			initials: 'PSO'
		},
		{
			id: '5',
			name: 'Nordic Imports AB',
			country: 'Sweden',
			phone: '+46 8 123 456',
			industry: 'Retail',
			relatedPerson: 'Erik Lindqvist',
			deliveryAddress: 'Kungsgatan 10, 111 43 Stockholm',
			billingAddress: 'Kungsgatan 10, 111 43 Stockholm',
			email: 'contact@nordic.se',
			createdAt: 'Dec 5, 2024',
			initials: 'NOR'
		}
	];

	const filteredClients = $derived.by(() => {
		if (activeTab === 'search' && searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			return mockClients.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.phone.includes(q) ||
					c.country.toLowerCase().includes(q) ||
					c.relatedPerson.toLowerCase().includes(q)
			);
		}
		return mockClients;
	});

	const listTabs: { key: ListTab; label: string }[] = [
		{ key: 'latest', label: 'Latest' },
		{ key: 'search', label: 'Search' },
		{ key: 'new', label: 'New' }
	];
</script>

<div class="flex flex-col h-full overflow-hidden">
	<!-- Header -->
	<div class="shrink-0 px-4 pt-4 pb-2">
		<h2 class="text-2xl font-bold text-white">Clients</h2>
		<p class="text-sm text-[#888]">30 New clients today</p>
	</div>

	<!-- Tabs -->
	<div class="shrink-0 flex items-center gap-1 px-4 pb-3">
		{#each listTabs as tab (tab.key)}
			<button
				type="button"
				onclick={() => {
					activeTab = tab.key;
					if (tab.key === 'new') onNewClient?.();
				}}
				class="px-4 py-1 rounded-full text-sm transition-colors
					{activeTab === tab.key ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Search -->
	<div class="shrink-0 px-4 pb-3">
		<SearchInput bind:value={searchQuery} placeholder="Filter in clients..." />
	</div>

	<!-- Client list -->
	<div class="flex-1 overflow-y-auto flex flex-col gap-2 px-4 pb-4" style="scrollbar-width: none;">
		{#each filteredClients as client (client.id)}
			<ListItemCard
				title={client.name}
				description={client.phone}
				timestamp={client.createdAt}
				avatarText={client.initials}
				variant="avatar"
				active={selectedId === client.id}
				onclick={() => onSelect(client)}
			/>
		{/each}

		{#if filteredClients.length === 0}
			<div class="flex flex-1 items-center justify-center py-8">
				<p class="text-sm text-[#555]">Sonuç bulunamadı</p>
			</div>
		{/if}
	</div>
</div>
