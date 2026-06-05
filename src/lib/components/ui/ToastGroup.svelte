<script lang="ts">
	import Toast from './Toast.svelte';

	type ToastItem = {
		id: string;
		title?: string;
		description: string;
		link?: string;
		linkText?: string;
		dismissible?: boolean;
	};

	let {
		toasts = $bindable<ToastItem[]>([]),
		onclose,
		onlinkclick
	}: {
		toasts?: ToastItem[];
		onclose?: (id: string) => void;
		onlinkclick?: (link: string) => void;
	} = $props();

	let closingId = $state<string | null>(null);

	function handleClose(id: string) {
		closingId = id;
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
			closingId = null;
			onclose?.(id);
		}, 100);
	}

	function getStyle(index: number): string {
		const vi = Math.min(index, 2);
		return [
			`transform: scale(${1 - vi * 0.1})`,
			`bottom: ${vi * 8}px`,
			`opacity: ${index === 0 ? 1 : 1 - vi * 0.15}`,
			`z-index: ${10 - index}`,
			`visibility: ${index > 2 ? 'hidden' : 'visible'}`,
			`transform-origin: bottom center`
		].join(';');
	}
</script>

<div class="relative w-full h-[72px]">
	{#each toasts as toast, index (toast.id)}
		<div
			class="absolute left-0 right-0 transition-opacity {closingId === toast.id ? 'opacity-0' : ''}"
			style={getStyle(index)}
		>
			<Toast
				id={toast.id}
				title={toast.title}
				description={toast.description}
				link={toast.link}
				linkText={toast.linkText}
				dismissible={toast.dismissible ?? true}
				onclose={handleClose}
				{onlinkclick}
			/>
		</div>
	{/each}
</div>
