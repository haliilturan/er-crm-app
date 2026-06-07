<script lang="ts">
	import { fly } from 'svelte/transition';
	import { salesStore } from '$lib/stores/sales.svelte';
	import ClientList from '$lib/components/musteriler/ClientList.svelte';
	import CustomerDetailCard from '$lib/components/musteriler/CustomerDetailCard.svelte';
	import CustomerModal from '$lib/components/musteriler/CustomerModal.svelte';

	let selectedClientId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Clients — Sales</title>
</svelte:head>

<div class="flex h-full overflow-hidden">
	<!-- ═══ Client list panel ════════════════════════════════════════════════════ -->
	<div class="w-80 shrink-0 border-r border-[#2a2a2a] overflow-hidden flex flex-col">
		<ClientList
			selectedId={selectedClientId}
			onSelect={(id) => (selectedClientId = id)}
			onNewClient={salesStore.openNew}
		/>
	</div>

	<!-- ═══ Client detail panel ══════════════════════════════════════════════════ -->
	<div class="flex-1 overflow-hidden">
		{#if selectedClientId}
			<CustomerDetailCard
				customerId={selectedClientId}
				onedit={salesStore.openEdit}
			/>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="flex flex-col items-center gap-2 text-[#555]">
					<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 00-3-3.87" />
						<path d="M16 3.13a4 4 0 010 7.75" />
					</svg>
					<p class="text-sm">Müşteri seçin</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- ═══ Customer form modal (overlay) ════════════════════════════════════════ -->
	{#if salesStore.modalOpen}
		<aside
			transition:fly={{ x: 384, duration: 280 }}
			class="w-[440px] shrink-0 border-l border-[#2a2a2a] overflow-hidden flex flex-col bg-[#111111]"
		>
			<CustomerModal
				customerId={salesStore.modalEntityId}
				onClose={salesStore.closeModal}
			/>
		</aside>
	{/if}
</div>
