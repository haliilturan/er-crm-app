<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = false,
		title = '',
		width = '640px',
		onclose,
		children
	}: {
		open?: boolean;
		title?: string;
		width?: string;
		onclose?: () => void;
		children?: Snippet;
	} = $props();

	function close() {
		onclose?.();
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/70"
			role="button"
			tabindex="-1"
			onclick={close}
			onkeydown={(e) => e.key === 'Enter' && close()}
			aria-label="Kapat"
		></div>

		<!-- Content -->
		<div
			role="dialog"
			aria-modal="true"
			aria-label={title || 'Modal'}
			class="relative flex flex-col bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
			style="width: min({width}, calc(100vw - 2rem));"
		>
			{@render children?.()}
		</div>
	</div>
{/if}
