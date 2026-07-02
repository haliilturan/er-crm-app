<script lang="ts">
	let {
		value = $bindable(false),
		activeLabel = 'Active',
		passiveLabel = 'Passive'
	}: {
		value?: boolean;
		activeLabel?: string;
		passiveLabel?: string;
	} = $props();
</script>

<div class="inline-flex rounded-full bg-[var(--hb-track)] border border-[var(--hb-border)] p-0.5">
	<button
		type="button"
		onclick={() => (value = true)}
		class="px-3 py-1 rounded-full text-sm transition-colors
			{value ? 'bg-[var(--hb-active)] text-white font-medium' : 'text-[var(--hb-body)] hover:text-white'}"
	>
		{activeLabel}
	</button>
	<button
		type="button"
		onclick={() => (value = false)}
		class="px-3 py-1 rounded-full text-sm transition-colors
			{!value ? 'bg-[var(--hb-active)] text-white font-medium' : 'text-[var(--hb-body)] hover:text-white'}"
	>
		{passiveLabel}
	</button>
</div>
