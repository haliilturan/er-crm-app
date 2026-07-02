<script lang="ts">
	type OrderItem = {
		quantity: number;
		returnedQuantity?: number | null;
	};

	let { items }: { items: OrderItem[] } = $props();

	const totalQty = $derived(items.reduce((s, it) => s + it.quantity, 0));
	const totalReturned = $derived(items.reduce((s, it) => s + (it.returnedQuantity ?? 0), 0));
	const isFull = $derived(totalReturned > 0 && totalReturned >= totalQty);
</script>

{#if totalReturned > 0}
	<span
		class="inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold {isFull
			? 'bg-[color-mix(in_srgb,var(--hb-accent)_15%,transparent)] text-[var(--hb-accent)]'
			: 'bg-[#2a1e0a] text-amber-400'}"
	>
		{totalReturned}/{totalQty} İade
	</span>
{/if}
