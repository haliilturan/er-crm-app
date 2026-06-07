<script lang="ts">
	let {
		title = '',
		description = '',
		icon,
		active = false,
		onclick
	}: {
		title?: string;
		description?: string;
		icon?: unknown;
		active?: boolean;
		onclick?: () => void;
	} = $props();
</script>

<div
	class="flex h-20 w-full cursor-pointer items-center rounded-xl border px-5 transition-colors
		{active
		? 'border-white bg-[#222]'
		: 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#444] hover:bg-[#222]'}"
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
	{#if icon}
		{@const Icon = icon as import('svelte').Component}
		<div class="mr-3 flex h-12 w-12 shrink-0 items-center justify-center text-[#888]">
			<Icon size={24} />
		</div>
	{/if}
	<div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
		<span class="truncate text-[15px] font-bold leading-tight text-white">{title}</span>
		<span class="truncate text-[15px] leading-tight text-[#888]">{description}</span>
	</div>
</div>
