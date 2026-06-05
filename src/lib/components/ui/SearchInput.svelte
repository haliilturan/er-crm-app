<script lang="ts">
	let {
		label = 'Ara',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		name = '',
		id = `search-${Math.random().toString(36).slice(2, 9)}`,
		onsearch,
		onclear
	}: {
		label?: string;
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

<div
	class="flex items-center rounded-lg px-5 h-[72px] w-full border transition-colors
		bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-blue-400"
>
	<div class="flex flex-col justify-center flex-1 min-w-0 gap-1.5">
		<label
			for={id}
			class="text-[11px] font-bold leading-none cursor-pointer transition-colors
				{filled ? 'text-gray-300' : 'text-gray-500'}"
		>
			{label}
		</label>
		<input
			bind:this={inputEl}
			{id}
			type="text"
			{name}
			{placeholder}
			{disabled}
			bind:value
			onkeydown={(e) => e.key === 'Enter' && onsearch?.(value)}
			class="bg-transparent border-none outline-none text-[15px] text-gray-800
				placeholder-gray-300 w-full leading-none
				disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	</div>

	{#if filled}
		<button
			type="button"
			onclick={handleClear}
			aria-label="Temizle"
			class="flex items-center justify-center shrink-0 ml-3 p-1.5 rounded
				text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	{:else}
		<button
			type="button"
			onclick={() => inputEl?.focus()}
			aria-label="Odaklan"
			class="flex items-center justify-center shrink-0 ml-3 p-1.5 rounded
				text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<path d="M21 21l-4.35-4.35" />
			</svg>
		</button>
	{/if}
</div>
