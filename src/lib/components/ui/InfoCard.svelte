<script lang="ts">
	let {
		label = '',
		value = ''
	}: {
		label?: string;
		value?: string;
	} = $props();
</script>

<div class="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
	<p class="text-xs text-[#888] mb-1">{label}</p>
	<p class="text-sm text-white">{value || '—'}</p>
</div>
