<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto as navigate } from '$app/navigation';

	let {
		title = '',
		description = '',
		goto = '',
		children
	}: {
		title?: string;
		description?: string;
		goto?: string;
		children?: Snippet;
	} = $props();

	async function handleClick() {
		if (goto) await navigate(goto);
	}
</script>

{#if goto}
	<button
		type="button"
		onclick={handleClick}
		class="flex flex-col gap-1 text-left w-full focus:outline-none hover:opacity-80 transition-opacity"
	>
		<h2 class="text-2xl font-bold text-white leading-none">{title}</h2>
		{#if children}
			<p class="text-sm text-[#888] leading-none">{@render children()}</p>
		{:else if description}
			<p class="text-sm text-[#888] leading-none">{description}</p>
		{/if}
	</button>
{:else}
	<div class="flex flex-col gap-1">
		<h2 class="text-2xl font-bold text-white leading-none">{title}</h2>
		{#if children}
			<p class="text-sm text-[#888] leading-none">{@render children()}</p>
		{:else if description}
			<p class="text-sm text-[#888] leading-none">{description}</p>
		{/if}
	</div>
{/if}
