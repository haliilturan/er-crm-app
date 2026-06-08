<script lang="ts">
	import { untrack } from 'svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import ListItemCard from '$lib/components/ui/ListItemCard.svelte';
	import { db } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';

	export interface Client {
		id: string;
		name: string;
		phone: string;
		createdAt: string;
		initials: string;
	}

	let {
		onSelect,
		selectedId = null,
		onNewClient
	}: {
		onSelect: (id: string) => void;
		selectedId?: string | null;
		onNewClient?: () => void;
	} = $props();

	type ListTab = 'latest' | 'search' | 'new';
	let activeTab = $state<ListTab>('latest');
	let searchQuery = $state('');

	let clients = $state<Client[]>([]);
	let loading = $state(true);

	function getInitials(name: string): string {
		return name
			.split(/\s+/)
			.map((w) => w[0] ?? '')
			.join('')
			.slice(0, 3)
			.toUpperCase();
	}

	function fmtDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$effect(() => {
		const uid = authStore.userId;
		if (!uid) { loading = false; return; }

		loading = true;
		return db.subscribeQuery(
			{ customers: { $: { order: { serverCreatedAt: 'desc' } } } },
			(res) => {
				untrack(() => {
					clients = (res.data?.customers ?? []).map((c: any) => ({
						id: c.id,
						name: String(c.name ?? ''),
						phone: String(c.phone ?? ''),
						createdAt: fmtDate(c.createdAt ?? Date.now()),
						initials: getInitials(String(c.name ?? '?'))
					}));
					loading = false;
				});
			}
		);
	});

	const filteredClients = $derived.by(() => {
		if (activeTab === 'search' && searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			return clients.filter(
				(c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
			);
		}
		return clients;
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
		<p class="text-sm text-[#888]">{clients.length} müşteri</p>
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

	<!-- List body -->
	<div class="flex-1 overflow-y-auto flex flex-col gap-2 px-4 pb-4" style="scrollbar-width: none;">

		{#if loading}
			{#each [1, 2, 3] as _, i (i)}
				<div class="animate-pulse h-16 rounded-2xl bg-[#1a1a1a] mb-2"></div>
			{/each}

		{:else if clients.length === 0}
			<div class="flex items-center justify-center py-16">
				<p class="text-[#555] text-sm">Henüz müşteri eklenmedi</p>
			</div>

		{:else}
			{#each filteredClients as client (client.id)}
				<ListItemCard
					title={client.name}
					description={client.phone}
					timestamp={client.createdAt}
					avatarText={client.initials}
					variant="avatar"
					active={selectedId === client.id}
					onclick={() => onSelect(client.id)}
				/>
			{/each}

			{#if filteredClients.length === 0 && searchQuery.trim()}
				<div class="flex items-center justify-center py-8">
					<p class="text-sm text-[#555]">Sonuç bulunamadı</p>
				</div>
			{/if}
		{/if}

	</div>
</div>
