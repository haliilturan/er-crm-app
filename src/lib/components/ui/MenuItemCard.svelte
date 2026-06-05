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
		? 'border-blue-200 bg-blue-50'
		: 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100'}"
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
	{#if icon}
		{@const Icon = icon as import('svelte').Component}
		<div class="mr-3 flex h-12 w-12 shrink-0 items-center justify-center text-gray-500">
			<Icon size={24} />
		</div>
	{/if}
	<div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
		<span class="truncate text-[15px] font-bold leading-tight text-gray-800">{title}</span>
		<span class="truncate text-[15px] leading-tight text-gray-400">{description}</span>
	</div>
</div>
