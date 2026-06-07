<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		disabled = false,
		name = '',
		id = `search-${Math.random().toString(36).slice(2, 9)}`,
		onsearch,
		onclear
	}: {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		name?: string;
		id?: string;
		onsearch?: (v: string) => void;
		onclear?: () => void;
	} = $props();

	let inputEl = $state<HTMLInputElement | null>(null);
	let filled = $derived(value.length > 0);

	function handleClear() {
		value = '';
		onclear?.();
		inputEl?.focus();
	}
</script>

<div class="relative w-full">
	<input
		bind:this={inputEl}
		{id}
		type="text"
		{name}
		{placeholder}
		{disabled}
		bind:value
		onkeydown={(e) => e.key === 'Enter' && onsearch?.(value)}
		class="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-3 pr-9 py-2
			text-white text-sm placeholder-[#555] outline-none transition-colors
			focus:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed"
	/>
	<button
		type="button"
		onclick={filled ? handleClear : () => inputEl?.focus()}
		aria-label={filled ? 'Temizle' : 'Ara'}
		class="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors"
	>
		{#if filled}
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
			</svg>
		{:else}
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<path d="M21 21l-4.35-4.35" stroke-linecap="round" />
			</svg>
		{/if}
	</button>
</div>
