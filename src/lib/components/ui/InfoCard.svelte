<script lang="ts">
	let {
		label = '',
		value = ''
	}: {
		label?: string;
		value?: string;
	} = $props();
</script>

<div class="bg-[var(--hb-list)] rounded-lg p-3 border border-[var(--hb-border)]">
	<p class="text-xs text-[var(--hb-body)] mb-1">{label}</p>
	<p class="text-sm text-white">{value || '—'}</p>
</div>
