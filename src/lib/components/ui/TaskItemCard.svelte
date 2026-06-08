<script lang="ts">
	import { db, tx } from '$lib/instant';

	let {
		taskId,
		title,
		description = '',
		date = '',
		status = 'pending',
		relatedEntityType = '',
		relatedEntityName = '',
		quoteId = ''
	}: {
		taskId: string;
		title: string;
		description?: string;
		date?: string;
		status?: 'pending' | 'overdue' | 'done' | 'dismissed';
		relatedEntityType?: string;
		relatedEntityName?: string;
		quoteId?: string;
	} = $props();

	let expanded = $state(false);
	let completing = $state(false);

	const r = 9;
	const circumference = 2 * Math.PI * r;

	const progress = $derived(
		status === 'done' ? 1 : status === 'overdue' ? 0.75 : status === 'dismissed' ? 0 : 0.35
	);
	const strokeDashoffset = $derived(circumference * (1 - progress));

	const strokeColor = $derived(
		status === 'done'      ? '#22c55e' :
		status === 'overdue'   ? '#f97316' :
		status === 'dismissed' ? '#555'    : '#ef4444'
	);

	const barColor = $derived(
		status === 'done'      ? 'bg-green-500'  :
		status === 'overdue'   ? 'bg-orange-500' :
		status === 'dismissed' ? 'bg-[#555]'     : 'bg-red-500'
	);

	const cardBg = $derived(
		status === 'done'
			? 'bg-green-950/50 border border-green-900/40 hover:bg-green-950/70'
			: status === 'dismissed'
				? 'bg-[#1a1a1a] opacity-50 hover:bg-[#222]'
				: 'bg-[#1a1a1a] hover:bg-[#222]'
	);

	const displayTitle = $derived(title?.trim() || '(Başlıksız)');

	async function complete() {
		completing = true;
		try {
			await db.transact([tx.tasks[taskId].update({ status: 'done' })]);
			expanded = false;
		} finally {
			completing = false;
		}
	}
</script>

<div
	class="relative flex gap-3 pl-4 pr-3 py-3 rounded-2xl cursor-pointer transition-colors {cardBg}"
	role="button"
	tabindex="0"
	onclick={() => (expanded = !expanded)}
	onkeydown={(e) => e.key === 'Enter' && (expanded = !expanded)}
>
	<!-- Left status bar -->
	<span class="absolute left-0 inset-y-0 w-[3px] rounded-l-2xl {barColor}"></span>

	<!-- Circular SVG indicator -->
	<div class="shrink-0 flex items-start pt-0.5">
		{#if status === 'done'}
			<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r={r} stroke="#22c55e" stroke-width="2" />
				<path d="M8 12.5l2.5 2.5 5-5" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{:else}
			<svg class="w-6 h-6 -rotate-90" viewBox="0 0 24 24" fill="none">
				<circle cx="12" cy="12" r={r} stroke="#2a2a2a" stroke-width="2" />
				<circle
					cx="12"
					cy="12"
					r={r}
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
		<!-- Collapsed header row -->
		<div class="flex items-start justify-between gap-2">
			<p class="text-sm font-medium leading-tight
				{status === 'done' ? 'line-through text-green-400/80' : 'text-white'}
				{expanded ? 'font-bold' : ''}">{displayTitle}</p>
			<span class="text-xs text-[#555] shrink-0 whitespace-nowrap">{date}</span>
		</div>

		{#if description}
			<p class="text-xs text-[#888] mt-0.5 leading-tight {expanded ? '' : 'truncate'}">{description}</p>
		{/if}

		{#if quoteId}
			<span class="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-800/40">
				Teklif
			</span>
		{/if}

		<!-- Expanded extras -->
		{#if expanded}
			{#if relatedEntityType === 'customer' && relatedEntityName}
				<p class="text-xs text-[#555] mt-1.5">
					İlgili Müşteri: <span class="text-[#888]">{relatedEntityName}</span>
				</p>
			{/if}

			{#if status !== 'done' && status !== 'dismissed'}
				<div
					class="flex gap-2 mt-2.5"
					role="presentation"
					onclick={(e) => e.stopPropagation()}
				>
					<button
						type="button"
						onclick={complete}
						disabled={completing}
						class="px-3 py-1 rounded-full bg-white text-black text-xs font-medium
							hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
					>
						{completing ? '...' : 'Complete'}
					</button>
					<button
						type="button"
						onclick={() => (expanded = false)}
						class="px-3 py-1 rounded-full bg-[#222] text-[#888] text-xs
							hover:text-white transition-colors border border-[#2a2a2a]"
					>
						Close
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
