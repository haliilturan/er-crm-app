<script lang="ts">
	let {
		title = '',
		description = '',
		timestamp = '',
		avatar,
		avatarText = '',
		variant = 'default',
		tag,
		active = false,
		onclick
	}: {
		title?: string;
		description?: string;
		timestamp?: string;
		avatar?: string;
		avatarText?: string;
		variant?: 'default' | 'avatar' | 'rounded';
		tag?: string;
		active?: boolean;
		onclick?: () => void;
	} = $props();

	let showAvatar = $derived(variant === 'avatar' || variant === 'rounded');
</script>

<div
	class="flex items-center px-4 py-3 w-full rounded-2xl cursor-pointer transition-colors
		{active ? 'bg-[#222]' : 'bg-[#1a1a1a] hover:bg-[#222]'}"
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
	{#if showAvatar}
		<div class="mr-3 shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#333] text-xs font-medium text-white">
			{#if avatar}
				<img src={avatar} alt={title} class="h-full w-full rounded-full object-cover" />
			{:else}
				{avatarText || title.slice(0, 3).toUpperCase()}
			{/if}
		</div>
	{/if}

	<div class="flex flex-col justify-center flex-1 min-w-0 gap-0.5">
		<div class="flex items-center justify-between gap-2">
			<span class="text-sm font-medium text-white leading-tight truncate">{title}</span>
			<div class="flex items-center gap-2 shrink-0">
				{#if tag}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#222] text-[#888]">
						{tag}
					</span>
				{/if}
				{#if timestamp}
					<span class="text-xs text-[#555] whitespace-nowrap">{timestamp}</span>
				{/if}
			</div>
		</div>
		{#if description}
			<span class="text-xs text-[#888] leading-tight truncate">{description}</span>
		{/if}
	</div>
</div>
