<script lang="ts">
	import type { Component } from 'svelte';

	type Tab = {
		value: string;
		label: string;
		icon?: Component<{ size?: number }>;
	};

	let {
		tabs = [],
		value = $bindable(''),
		disabled = false,
		variant = 'default',
		onchange
	}: {
		tabs?: Tab[];
		value?: string;
		disabled?: boolean;
		variant?: 'default' | 'icon';
		onchange?: (tab: Tab) => void;
	} = $props();

	function select(tab: Tab) {
		if (!disabled) {
			value = tab.value;
			onchange?.(tab);
		}
	}
</script>

<div class="inline-flex gap-1">
	{#each tabs as tab (tab.value)}
		<button
			type="button"
			{disabled}
			onclick={() => select(tab)}
			title={variant === 'icon' ? tab.label : undefined}
			class="flex items-center justify-center rounded-full transition-all text-sm
				disabled:opacity-50 disabled:cursor-not-allowed
				{variant === 'icon' ? 'w-9 h-9' : 'px-4 py-1'}
				{value === tab.value
					? 'bg-white text-black font-medium'
					: 'text-[#888] hover:text-white'}"
		>
			{#if variant === 'icon' && tab.icon}
				{@const TabIcon = tab.icon}
				<TabIcon size={18} />
			{:else}
				{tab.label}
			{/if}
		</button>
	{/each}
</div>
