<script lang="ts">
	import Avatar from './Avatar.svelte';

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
	class="flex items-center px-5 h-20 w-full rounded-xl cursor-pointer transition-colors border
		{active
			? 'bg-blue-50 border-blue-200'
			: 'bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200'}"
	role="button"
	tabindex="0"
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
	{#if showAvatar}
		<div class="mr-3 shrink-0">
			<Avatar
				image={avatar}
				fallbackText={avatarText || title.slice(0, 3)}
			/>
		</div>
	{/if}

	<div class="flex flex-col justify-center flex-1 min-w-0 gap-0.5">
		<div class="flex items-center justify-between gap-2.5">
			<span class="text-[15px] font-bold text-gray-800 leading-tight truncate">{title}</span>
			<div class="flex items-center gap-2 shrink-0">
				{#if tag}
					<span
						class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold
							bg-blue-100 text-blue-700"
					>
						{tag}
					</span>
				{/if}
				{#if timestamp}
					<span class="text-[13px] text-gray-400 whitespace-nowrap">{timestamp}</span>
				{/if}
			</div>
		</div>
		<span class="text-[15px] text-gray-400 leading-tight truncate">{description}</span>
	</div>
</div>
