<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { salesStore } from '$lib/stores/sales.svelte';
	import ClientList from '$lib/components/musteriler/ClientList.svelte';
	import CustomerModal from '$lib/components/musteriler/CustomerModal.svelte';

	let { children }: { children: Snippet } = $props();

	let selectedClientId = $derived($page.params.musteriId ?? null);

	function handleSelect(id: string) {
		goto(`/satis/musteriler/${id}`);
	}
</script>

<div class="flex h-full overflow-hidden">
	<!-- ═══ Client list panel ═══════════════════════════════════════════════════ -->
	<div class="w-80 shrink-0 border-r border-[#2a2a2a] overflow-hidden flex flex-col">
		<ClientList
			selectedId={selectedClientId}
			onSelect={handleSelect}
			onNewClient={salesStore.openNew}
		/>
	</div>

	<!-- ═══ Client detail panel ═════════════════════════════════════════════════ -->
	<div class="flex-1 overflow-hidden">
		{@render children()}
	</div>

	<!-- ═══ Customer form modal (overlay) ═══════════════════════════════════════ -->
	{#if salesStore.modalOpen}
		<aside
			transition:fly={{ x: 384, duration: 280 }}
			class="w-110 shrink-0 border-l border-[#2a2a2a] overflow-hidden flex flex-col bg-[#111111]"
		>
			<CustomerModal
				customerId={salesStore.modalEntityId}
				onClose={salesStore.closeModal}
			/>
		</aside>
	{/if}
</div>
