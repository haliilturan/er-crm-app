<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		nav,
		list,
		detail,
		cockpit
	}: {
		nav?: Snippet;
		list?: Snippet;
		detail?: Snippet;
		cockpit?: Snippet;
	} = $props();
</script>

<div class="flex h-screen overflow-hidden bg-[#0a0a0a]">
	<!-- Left nav -->
	{#if nav}
		<div class="w-16 shrink-0 flex flex-col items-center py-4 gap-2">
			{@render nav()}
		</div>
	{/if}

	<!-- List panel -->
	{#if list}
		<div class="w-80 shrink-0 bg-[#111111] rounded-2xl m-2 flex flex-col overflow-hidden">
			{@render list()}
		</div>
	{/if}

	<!-- Detail area -->
	{#if detail}
		<div class="flex-1 bg-[#111111] rounded-2xl m-2 flex flex-col overflow-hidden min-w-0">
			{@render detail()}
		</div>
	{/if}

	<!-- Cockpit panel -->
	{#if cockpit}
		<div class="w-80 shrink-0 bg-[#111111] rounded-2xl m-2 flex flex-col overflow-hidden">
			{@render cockpit()}
		</div>
	{/if}
</div>
