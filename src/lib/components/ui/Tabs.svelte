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

<div class="inline-flex bg-gray-100 rounded-full p-1">
	{#each tabs as tab (tab.value)}
		<button
			type="button"
			{disabled}
			onclick={() => select(tab)}
			title={variant === 'icon' ? tab.label : undefined}
			class="flex items-center justify-center rounded-full transition-all font-bold text-[15px]
				disabled:opacity-50 disabled:cursor-not-allowed
				{variant === 'icon' ? 'w-[38px] h-[38px]' : 'px-4 h-[38px]'}
				{value === tab.value
					? 'bg-blue-600 text-white shadow-sm'
					: 'bg-transparent text-gray-500 hover:text-gray-700'}"
		>
			{#if variant === 'icon' && tab.icon}
				{@const TabIcon = tab.icon}
				<TabIcon size={20} />
			{:else}
				{tab.label}
			{/if}
		</button>
	{/each}
</div>
