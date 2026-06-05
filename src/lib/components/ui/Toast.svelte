<script lang="ts">
	let {
		id = `toast-${Math.random().toString(36).slice(2, 9)}`,
		title = '',
		description = '',
		dismissible = true,
		link,
		linkText = 'Daha fazla',
		onclose,
		onlinkclick
	}: {
		id?: string;
		title?: string;
		description?: string;
		dismissible?: boolean;
		link?: string;
		linkText?: string;
		onclose?: (id: string) => void;
		onlinkclick?: (link: string) => void;
	} = $props();
</script>

<div class="flex items-center bg-white border border-gray-200 rounded-lg px-5 py-4 shadow-md w-full">
	<div class="flex flex-col flex-1 min-w-0 gap-1">
		{#if title}
			<span class="text-[12px] font-bold text-gray-400 leading-none">{title}</span>
		{/if}
		<div class="flex items-center gap-2 text-[15px] text-gray-700 leading-none flex-wrap">
			<span>{description}</span>
			{#if link}
				<button
					type="button"
					onclick={() => onlinkclick?.(link!)}
					class="font-semibold underline hover:text-gray-900 transition-colors"
				>
					{linkText}
				</button>
			{/if}
		</div>
	</div>
	{#if dismissible}
		<button
			type="button"
			onclick={() => onclose?.(id)}
			aria-label="Kapat"
			class="flex items-center justify-center shrink-0 ml-4
				text-gray-400 hover:text-gray-700 transition-colors"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>
