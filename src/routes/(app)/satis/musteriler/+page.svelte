<script lang="ts">
	import { salesStore } from '$lib/stores/sales.svelte';
	import ClientList, { type Client } from '$lib/components/musteriler/ClientList.svelte';
	import ClientDetail from '$lib/components/musteriler/ClientDetail.svelte';
	import CustomerModal from '$lib/components/musteriler/CustomerModal.svelte';

	let selectedClient = $state<Client | null>(null);
</script>

<svelte:head>
	<title>Clients — Sales</title>
</svelte:head>

<div class="flex h-full overflow-hidden">
	<!-- ═══ Client list panel ════════════════════════════════════════════════════ -->
	<div class="w-80 shrink-0 border-r border-[#2a2a2a] overflow-hidden flex flex-col">
		<ClientList
			selectedId={selectedClient?.id ?? null}
			onSelect={(client) => (selectedClient = client)}
			onNewClient={salesStore.openNew}
		/>
	</div>

	<!-- ═══ Client detail panel ══════════════════════════════════════════════════ -->
	<div class="flex-1 overflow-hidden">
		<ClientDetail client={selectedClient} />
	</div>

	<!-- ═══ Customer form modal (overlay) ════════════════════════════════════════ -->
	{#if salesStore.modalOpen}
		<aside class="w-96 shrink-0 border-l border-[#2a2a2a] overflow-hidden flex flex-col bg-[#111111]">
			<CustomerModal
				customerId={salesStore.modalEntityId}
				onClose={salesStore.closeModal}
			/>
		</aside>
	{/if}
</div>
