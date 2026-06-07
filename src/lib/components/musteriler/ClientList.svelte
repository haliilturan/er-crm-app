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
	let queryError = $state('');

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
		const cid = authStore.activeCompanyId;
		if (!cid) return;
		loading = true;
		return db.subscribeQuery(
			{ customers: { $: { where: { companyId: cid }, order: { createdAt: 'desc' } } } },
			(res) => {
				untrack(() => {
					if (res.error) {
						queryError = 'Veri yüklenemedi';
						loading = false;
						return;
					}
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
			{#each [1, 2, 3] as _}
				<div class="h-14 bg-[#222] animate-pulse rounded-2xl"></div>
			{/each}

		{:else if queryError}
			<div class="flex flex-1 items-center justify-center py-8">
				<p class="text-sm text-red-400">{queryError}</p>
			</div>

		{:else if clients.length === 0}
			<div class="flex flex-col items-center gap-3 py-10 text-[#555]">
				<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 00-3-3.87" />
					<path d="M16 3.13a4 4 0 010 7.75" />
				</svg>
				<p class="text-sm">Henüz müşteri eklenmedi</p>
				<button
					type="button"
					onclick={onNewClient}
					class="text-xs text-white bg-[#222] border border-[#333] px-4 py-2 rounded-full hover:bg-[#2a2a2a] transition-colors"
				>
					Yeni Müşteri Ekle
				</button>
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
				<div class="flex flex-1 items-center justify-center py-8">
					<p class="text-sm text-[#555]">Sonuç bulunamadı</p>
				</div>
			{/if}
		{/if}

	</div>
</div>
