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
		updatedAt: string;
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

	type RawCustomer = {
		id: string;
		name?: string;
		contactName?: string;
		email?: string;
		phone?: string;
		taxNumber?: string;
		updatedBy?: string;
		updatedAt?: number;
		createdAt?: number;
	};

	// ── State ────────────────────────────────────────────────────────────────
	let activeMode     = $state<'latest' | 'search'>('latest');
	let searchQuery    = $state('');
	let debouncedQuery = $state(''); // only used by Mode 2
	let rawCustomers   = $state<RawCustomer[]>([]);
	let loading        = $state(true);

	// ── Helpers ──────────────────────────────────────────────────────────────
	function getInitials(name: string): string {
		return name
			.split(/\s+/)
			.map((w) => w[0] ?? '')
			.join('')
			.slice(0, 3)
			.toUpperCase();
	}

	function fmtDate(ts: number | undefined): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('tr-TR', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function toCards(list: RawCustomer[]) {
		return list.map((c) => ({
			id:        c.id,
			name:      String(c.name  ?? ''),
			phone:     String(c.phone ?? ''),
			updatedAt: fmtDate(c.updatedAt ?? c.createdAt),
			initials:  getInitials(String(c.name ?? '?'))
		}));
	}

	function switchMode(mode: 'latest' | 'search') {
		activeMode  = mode;
		searchQuery = '';
		untrack(() => { debouncedQuery = ''; });
	}

	// ── Debounce (Mode 2 only) ────────────────────────────────────────────────
	// Mode 1 search is instant client-side, so no debounce needed there.
	$effect(() => {
		const q    = searchQuery;
		const mode = activeMode;
		if (mode !== 'search' || q.length < 3) {
			untrack(() => { debouncedQuery = ''; });
			return;
		}
		const timer = setTimeout(() => {
			untrack(() => { debouncedQuery = q; });
		}, 400);
		return () => clearTimeout(timer);
	});

	// ── Subscription ─────────────────────────────────────────────────────────
	// Single subscription over all company customers.
	// companyId is indexed so this query is efficient.
	// updatedBy / updatedAt are not indexed → all sorting/filtering in JS.
	$effect(() => {
		const cId = authStore.activeCompanyId;
		if (!cId) { loading = false; return; }

		loading = true;
		return db.subscribeQuery(
			{ customers: { $: { where: { companyId: cId } } } },
			(res) => {
				untrack(() => {
					if (res.isLoading) return;
					rawCustomers = (res.data?.customers ?? []) as RawCustomer[];
					loading = false;
				});
			}
		);
	});

	// ── Mode 1: latest 100 ────────────────────────────────────────────────────
	// Prefer the current user's own updates; fall back to whole-company list.
	const latest100 = $derived.by((): RawCustomer[] => {
		const uid  = authStore.userId ?? '';
		const byMe = rawCustomers
			.filter((c) => c.updatedBy === uid || c.createdBy === uid)
			.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
			.slice(0, 100);

		if (byMe.length > 0) return byMe;

		return [...rawCustomers]
			.sort((a, b) =>
				(b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
			)
			.slice(0, 100);
	});

	// Mode 1 display list — always shows the 100 unless a 3-char search is active.
	// 1-2 chars: still show the 100 (hint appears below input, list stays visible).
	const mode1List = $derived.by((): RawCustomer[] => {
		const q = searchQuery.toLowerCase().trim();
		if (q.length >= 3) {
			return latest100.filter((c) =>
				(c.name        ?? '').toLowerCase().includes(q) ||
				(c.contactName ?? '').toLowerCase().includes(q) ||
				(c.email       ?? '').toLowerCase().includes(q) ||
				(c.phone       ?? '').includes(q) ||
				(c.taxNumber   ?? '').includes(q)
			);
		}
		return latest100; // 0-2 chars: full list
	});

	// ── Mode 2: full DB search ────────────────────────────────────────────────
	// Nothing shown until debouncedQuery has 3+ chars.
	const mode2List = $derived.by((): RawCustomer[] => {
		const q = debouncedQuery.toLowerCase().trim();
		if (q.length < 3) return [];
		return rawCustomers
			.filter((c) =>
				(c.name        ?? '').toLowerCase().includes(q) ||
				(c.contactName ?? '').toLowerCase().includes(q) ||
				(c.email       ?? '').toLowerCase().includes(q) ||
				(c.phone       ?? '').includes(q) ||
				(c.taxNumber   ?? '').includes(q)
			)
			.slice(0, 200);
	});

	// ── Display ───────────────────────────────────────────────────────────────
	const displayClients = $derived(
		toCards(activeMode === 'latest' ? mode1List : mode2List)
	);

	// Debounce is in-flight when user has typed 3+ chars but timer hasn't fired.
	const isDebouncing = $derived(
		activeMode === 'search' &&
		searchQuery.length >= 3 &&
		debouncedQuery !== searchQuery
	);

	const showMinCharsHint = $derived(
		searchQuery.length > 0 && searchQuery.length < 3
	);

	// "Aramak için en az 3 karakter girin" — Mode 2 idle state (empty input).
	const showSearchIdleHint = $derived(
		activeMode === 'search' && searchQuery.length === 0
	);

	// "Sonuç bulunamadı" — search was active but returned nothing.
	const showNoResults = $derived(
		!loading &&
		!isDebouncing &&
		displayClients.length === 0 &&
		(
			(activeMode === 'latest' && searchQuery.length >= 3) ||
			(activeMode === 'search' && debouncedQuery.length >= 3)
		)
	);

	const placeholder = $derived(
		activeMode === 'latest'
			? "Son 100'de ara..."
			: 'Tüm müşterilerde ara... (en az 3 karakter)'
	);
</script>

<div class="flex h-full flex-col overflow-hidden">

	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between px-4 pb-3 pt-4">
		<div>
			<h2 class="text-2xl font-bold text-white">Müşteriler</h2>
			<p class="mt-0.5 text-xs text-[#555]">
				{#if activeMode === 'latest'}
					{latest100.length} müşteri
				{:else if debouncedQuery.length >= 3}
					{displayClients.length} sonuç
				{:else}
					{rawCustomers.length} toplam
				{/if}
			</p>
		</div>
		{#if onNewClient}
			<button
				type="button"
				onclick={onNewClient}
				class="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#e0e0e0]"
			>
				<svg
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				Yeni
			</button>
		{/if}
	</div>

	<!-- Mode toggle -->
	<div class="shrink-0 px-4 pb-3">
		<div class="flex gap-1 rounded-xl bg-[#1a1a1a] p-1">
			<button
				type="button"
				onclick={() => switchMode('latest')}
				class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors {activeMode === 'latest'
					? 'bg-white text-black'
					: 'text-[#777] hover:text-white'}"
			>
				Son Güncellenen
			</button>
			<button
				type="button"
				onclick={() => switchMode('search')}
				class="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors {activeMode === 'search'
					? 'bg-white text-black'
					: 'text-[#777] hover:text-white'}"
			>
				Tüm Müşteriler
			</button>
		</div>
	</div>

	<!-- Search input -->
	<div class="shrink-0 px-4 pb-3">
		<SearchInput bind:value={searchQuery} placeholder={placeholder} />
		{#if showMinCharsHint}
			<p class="mt-1.5 px-1 text-xs text-[#555]">En az 3 karakter girin</p>
		{/if}
	</div>

	<!-- List area -->
	<div
		class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4"
		style="scrollbar-width: none;"
	>
		{#if loading && activeMode === 'latest'}
			<!-- Initial load skeleton (only blocks Mode 1; Mode 2 starts empty anyway) -->
			{#each [1, 2, 3] as _, i (i)}
				<div class="animate-pulse h-16 rounded-2xl bg-[#1a1a1a]"></div>
			{/each}

		{:else if showSearchIdleHint}
			<div class="flex items-center justify-center py-20">
				<p class="text-center text-sm leading-relaxed text-[#555]">
					Aramak için en az<br />3 karakter girin
				</p>
			</div>

		{:else if isDebouncing}
			<!-- Debounce in-flight: show skeleton so it doesn't feel frozen -->
			{#each [1, 2, 3] as _, i (i)}
				<div class="animate-pulse h-16 rounded-2xl bg-[#1a1a1a]"></div>
			{/each}

		{:else if activeMode === 'latest' && rawCustomers.length === 0 && !loading}
			<div class="flex items-center justify-center py-20">
				<p class="text-sm text-[#555]">Henüz müşteri eklenmedi</p>
			</div>

		{:else if showNoResults}
			<div class="flex items-center justify-center py-20">
				<p class="text-sm text-[#555]">Sonuç bulunamadı</p>
			</div>

		{:else}
			{#each displayClients as client (client.id)}
				<ListItemCard
					title={client.name}
					description={client.phone}
					timestamp={client.updatedAt}
					avatarText={client.initials}
					variant="avatar"
					active={selectedId === client.id}
					onclick={() => onSelect(client.id)}
				/>
			{/each}
		{/if}
	</div>
</div>
