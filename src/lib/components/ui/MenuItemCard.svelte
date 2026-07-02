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
	class="flex h-20 w-full cursor-pointer items-center rounded-lg border px-5 transition-colors
		{active
		? 'border-[var(--hb-highlight)] bg-[var(--hb-active)]'
		: 'border-[var(--hb-border)] bg-[var(--hb-list)] hover:border-[var(--hb-highlight)] hover:bg-[var(--hb-list-hover)]'}"
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
	{#if icon}
		{@const Icon = icon as import('svelte').Component}
		<div class="mr-3 flex h-12 w-12 shrink-0 items-center justify-center text-[var(--hb-body)]">
			<Icon size={24} />
		</div>
	{/if}
	<div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
		<span class="truncate text-[15px] font-bold leading-tight text-white">{title}</span>
		<span class="truncate text-[15px] leading-tight text-[var(--hb-body)]">{description}</span>
	</div>
</div>
