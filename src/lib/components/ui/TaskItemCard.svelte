<script lang="ts">
	let {
		username = '',
		description = '',
		date = '',
		status = 'pending' as 'pending' | 'overdue' | 'completed',
		oncomplete
	}: {
		username?: string;
		description?: string;
		date?: string;
		status?: 'pending' | 'overdue' | 'completed';
		oncomplete?: () => void;
	} = $props();

	let expanded = $state(false);

	const circumference = 2 * Math.PI * 10;
	const progress = $derived(status === 'completed' ? 1 : status === 'overdue' ? 0.75 : 0.35);
	const strokeDashoffset = $derived(circumference * (1 - progress));
	const strokeColor = $derived(
		status === 'completed' ? '#22c55e' : status === 'overdue' ? '#ff4444' : '#555'
	);
</script>

<div
	class="flex gap-3 px-3 py-3 rounded-2xl cursor-pointer transition-colors
		bg-[#1a1a1a] hover:bg-[#222]
		{status === 'completed' ? 'opacity-60' : ''}"
	role="button"
	tabindex="0"
	onclick={() => (expanded = !expanded)}
	onkeydown={(e) => e.key === 'Enter' && (expanded = !expanded)}
>
	<!-- Circular progress indicator -->
	<div class="shrink-0 flex items-start pt-0.5">
		{#if status === 'completed'}
			<div class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
				<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 13l4 4L19 7" />
				</svg>
			</div>
		{:else}
			<svg class="w-6 h-6 -rotate-90" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r="10" stroke="#2a2a2a" stroke-width="2" />
				<circle
					cx="12"
					cy="12"
					r="10"
					stroke={strokeColor}
					stroke-width="2"
					stroke-dasharray={circumference}
					stroke-dashoffset={strokeDashoffset}
					stroke-linecap="round"
				/>
			</svg>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex-1 min-w-0">
		<div class="flex items-start justify-between gap-2">
			<p class="text-sm font-medium text-white leading-tight">{username}</p>
			<span class="text-xs text-[#555] shrink-0 whitespace-nowrap">{date}</span>
		</div>
		<p class="text-xs text-[#888] mt-0.5 leading-tight">{description}</p>

		{#if expanded && status !== 'completed'}
			<div class="flex gap-2 mt-2" onclick={(e) => e.stopPropagation()} role="presentation">
				<button
					type="button"
					onclick={oncomplete}
					class="px-3 py-1 rounded-full bg-white text-black text-xs font-medium hover:bg-[#e0e0e0] transition-colors"
				>
					Complete
				</button>
				<button
					type="button"
					onclick={() => (expanded = false)}
					class="px-3 py-1 rounded-full bg-[#222] text-[#888] text-xs hover:text-white transition-colors border border-[#2a2a2a]"
				>
					Close
				</button>
			</div>
		{/if}
	</div>
</div>
