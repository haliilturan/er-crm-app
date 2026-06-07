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

<div class="inline-flex rounded-full bg-[#1a1a1a] border border-[#2a2a2a] p-0.5">
	<button
		type="button"
		onclick={() => (value = true)}
		class="px-3 py-1 rounded-full text-sm transition-colors
			{value ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
	>
		{activeLabel}
	</button>
	<button
		type="button"
		onclick={() => (value = false)}
		class="px-3 py-1 rounded-full text-sm transition-colors
			{!value ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
	>
		{passiveLabel}
	</button>
</div>
