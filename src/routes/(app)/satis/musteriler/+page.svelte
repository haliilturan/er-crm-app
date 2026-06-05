<script lang="ts">
	import { untrack } from 'svelte';
	import { db } from '$lib/instant';
	import { activeCompany } from '$lib/stores/activeCompany.svelte';
	import { salesStore } from '$lib/stores/sales.svelte';
	import { SearchInput, ListItemCard, Button } from '$lib/components/ui';
	import CustomerDetailCard from '$lib/components/musteriler/CustomerDetailCard.svelte';
	import CustomerModal from '$lib/components/musteriler/CustomerModal.svelte';

	// ─── Types ────────────────────────────────────────────────────────────────
	type Customer = {
		id: string;
		name: string;
		nameSearch: string;
		phone: string;
		email?: string;
		city?: string;
		companyType: string;
		status: string;
		contactName?: string;
		companyId: string;
		createdAt: number;
	};

	// ─── State ────────────────────────────────────────────────────────────────
	let customers = $state<Customer[]>([]);
	let isLoading = $state(true);
	let search = $state('');
	let selectedId = $state<string | null>(null);

	// ─── Normalize ────────────────────────────────────────────────────────────
	function normalize(text: string): string {
		return text
			.toLowerCase()
			.replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
			.replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
	}

	// ─── Filtered list ────────────────────────────────────────────────────────
	let filtered = $derived.by(() => {
		const q = normalize(search.trim());
		if (!q) return customers;
		return customers.filter(
			(c) =>
				(c.nameSearch ?? normalize(c.name)).includes(q) ||
				c.phone.includes(search.trim()) ||
				normalize(c.contactName ?? '').includes(q)
		);
	});

	// ─── InstantDB subscription ───────────────────────────────────────────────
	$effect(() => {
		const companyId = activeCompany.current?.id;
		if (!companyId) return;
		untrack(() => { isLoading = true; });

		return db.subscribeQuery(
			{
				customers: {
					$: { where: { companyId }, order: { serverCreatedAt: 'desc' } }
				}
			},
			(result) => {
				untrack(() => {
					if (result.error) { isLoading = false; return; }
					customers = (result.data?.customers ?? []) as Customer[];
					isLoading = false;
				});
			}
		);
	});

	// ─── Helpers ──────────────────────────────────────────────────────────────
	const statusLabel: Record<string, string> = {
		lead: 'Potansiyel',
		active: 'Aktif',
		inactive: 'Pasif'
	};

	function initials(name: string): string {
		return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
	}
</script>

<svelte:head>
	<title>Müşteriler — Satış</title>
</svelte:head>

<div class="flex h-full overflow-hidden">

	<!-- ═══ Sol panel: liste ════════════════════════════════════════════════════ -->
	<aside class="flex w-[340px] shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white">

		<!-- Başlık -->
		<div class="shrink-0 px-5 pt-5 pb-3">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Müşteriler</p>
					<p class="mt-0.5 text-2xl font-bold text-gray-800">
						{isLoading ? '—' : filtered.length}
					</p>
				</div>
				<Button onclick={salesStore.openNew}>+ Yeni</Button>
			</div>
		</div>

		<!-- Arama -->
		<div class="shrink-0 px-5 pb-3">
			<SearchInput bind:value={search} placeholder="İsim, yetkili, telefon..." />
		</div>

		<!-- Liste -->
		<div
			class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3"
			style="scrollbar-width: none;"
		>
			{#if isLoading}
				{#each [1, 2, 3, 4, 5] as n (n)}
					<div class="flex h-20 animate-pulse items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-5">
						<div class="h-10 w-10 rounded-full bg-gray-200"></div>
						<div class="flex-1 space-y-2">
							<div class="h-3.5 w-32 rounded bg-gray-200"></div>
							<div class="h-3 w-24 rounded bg-gray-100"></div>
						</div>
					</div>
				{/each}

			{:else if !activeCompany.current}
				<p class="py-8 text-center text-sm text-gray-400">Şirket seçilmedi</p>

			{:else if filtered.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center py-8 text-center">
					<p class="text-sm text-gray-400">{search ? 'Sonuç bulunamadı' : 'Henüz müşteri yok'}</p>
					{#if !search}
						<button
							onclick={salesStore.openNew}
							class="mt-2 text-xs font-medium text-blue-600 hover:underline"
						>
							İlk müşteriyi ekle →
						</button>
					{/if}
				</div>

			{:else}
				{#each filtered as customer (customer.id)}
					<ListItemCard
						title={customer.name}
						description={customer.city ?? customer.phone}
						avatarText={initials(customer.name)}
						variant="avatar"
						active={selectedId === customer.id}
						tag={statusLabel[customer.status]}
						onclick={() => (selectedId = customer.id)}
					/>
				{/each}
			{/if}
		</div>
	</aside>

	<!-- ═══ Orta panel: detay ══════════════════════════════════════════════════ -->
	<section class="flex min-w-0 flex-1 flex-col overflow-hidden bg-gray-50">
		{#if selectedId}
			<CustomerDetailCard
				customerId={selectedId}
				onedit={(cid) => salesStore.openEdit(cid)}
			/>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
						<svg class="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
						</svg>
					</div>
					<p class="text-sm font-medium text-gray-500">Bir müşteri seçin</p>
					<p class="mt-0.5 text-xs text-gray-400">Detayları ve notları görüntüleyin</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- ═══ Sağ panel: form (yeni / düzenle) ════════════════════════════════════ -->
	{#if salesStore.modalOpen}
		<aside class="flex w-[380px] shrink-0 overflow-hidden border-l border-gray-200">
			<CustomerModal
				customerId={salesStore.modalEntityId}
				onClose={salesStore.closeModal}
			/>
		</aside>
	{/if}
</div>
