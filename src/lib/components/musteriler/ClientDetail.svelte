<script lang="ts">
	import type { Client } from './ClientList.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import InfoCard from '$lib/components/ui/InfoCard.svelte';

	let { client }: { client: Client | null } = $props();

	type DetailTab = 'notes' | 'offers' | 'orders' | 'payments' | 'contact';
	let activeTab = $state<DetailTab>('notes');
	let noteSearch = $state('');
	let offerSearch = $state('');
	let newNote = $state('');

	interface Note {
		id: string;
		content: string;
		author: string;
		date: string;
	}

	interface Offer {
		id: string;
		name: string;
		totalPrice: string;
		status: 'waiting' | 'order' | 'failed';
		date: string;
	}

	interface Order {
		id: string;
		name: string;
		totalPrice: string;
		status: 'inProcess' | 'delivered' | 'cancelled';
		date: string;
	}

	interface Payment {
		id: string;
		name: string;
		amount: string;
		type: 'bankTransfer' | 'cash';
		date: string;
	}

	const mockNotes: Note[] = [
		{ id: '1', content: 'Initial meeting went well. Client interested in bulk order.', author: 'Sarah J.', date: 'Dec 1' },
		{ id: '2', content: 'Follow-up call scheduled for next week.', author: 'Mark C.', date: 'Dec 3' },
		{ id: '3', content: 'Client requested detailed proposal with payment terms.', author: 'Sarah J.', date: 'Dec 5' }
	];

	const mockOffers: Offer[] = [
		{ id: '1', name: 'Offer #1042 — Q4 Bulk', totalPrice: '$24,500', status: 'waiting', date: 'Dec 1' },
		{ id: '2', name: 'Offer #1038 — Standard', totalPrice: '$8,200', status: 'order', date: 'Nov 28' },
		{ id: '3', name: 'Offer #1031 — Custom', totalPrice: '$3,400', status: 'failed', date: 'Nov 20' }
	];

	const mockOrders: Order[] = [
		{ id: '1', name: 'Order #842 — Q4 Bulk', totalPrice: '$24,500', status: 'inProcess', date: 'Dec 2' },
		{ id: '2', name: 'Order #810 — Standard', totalPrice: '$8,200', status: 'delivered', date: 'Nov 29' }
	];

	const mockPayments: Payment[] = [
		{ id: '1', name: 'Invoice #842', amount: '$12,000', type: 'bankTransfer', date: 'Dec 3' },
		{ id: '2', name: 'Invoice #810', amount: '$8,200', type: 'bankTransfer', date: 'Nov 30' },
		{ id: '3', name: 'Advance #791', amount: '$5,000', type: 'cash', date: 'Nov 15' }
	];

	const totalSales = '$57,100';
	const totalPayments = '$25,200';
	const balance = '$31,900';

	const filteredNotes = $derived(
		noteSearch.trim()
			? mockNotes.filter((n) => n.content.toLowerCase().includes(noteSearch.toLowerCase()))
			: mockNotes
	);

	const filteredOffers = $derived(
		offerSearch.trim()
			? mockOffers.filter((o) => o.name.toLowerCase().includes(offerSearch.toLowerCase()))
			: mockOffers
	);

	const detailTabs: { key: DetailTab; label: string }[] = [
		{ key: 'notes', label: 'Notes' },
		{ key: 'offers', label: 'Offers' },
		{ key: 'orders', label: 'Orders' },
		{ key: 'payments', label: 'Payments' },
		{ key: 'contact', label: 'Contact' }
	];

	const offerStatusLabel: Record<string, string> = {
		waiting: 'Waiting',
		order: 'Order',
		failed: 'Failed'
	};

	const orderStatusLabel: Record<string, string> = {
		inProcess: 'In Process',
		delivered: 'Delivered',
		cancelled: 'Cancelled'
	};

	const paymentTypeLabel: Record<string, string> = {
		bankTransfer: 'Bank Transfer',
		cash: 'Cash'
	};
</script>

{#if !client}
	<div class="flex h-full items-center justify-center">
		<div class="text-center">
			<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]">
				<svg class="h-5 w-5 text-[#555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
				</svg>
			</div>
			<p class="text-sm font-medium text-[#888]">Select a client</p>
			<p class="mt-0.5 text-xs text-[#555]">View details and notes</p>
		</div>
	</div>
{:else}
	<div class="flex flex-col h-full overflow-hidden">
		<!-- Client header -->
		<div class="shrink-0 px-6 pt-5 pb-4 border-b border-[#2a2a2a]">
			<div class="flex items-center gap-4">
				<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#222] border border-[#2a2a2a] text-base font-bold text-white">
					{client.initials}
				</div>
				<div>
					<h2 class="text-2xl font-bold text-white">{client.name}</h2>
					<div class="flex items-center gap-3 mt-0.5">
						<span class="text-sm text-[#888]">{client.country}</span>
						<span class="text-[#2a2a2a]">·</span>
						<span class="text-sm text-[#888]">{client.phone}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Detail tabs -->
		<div class="shrink-0 flex items-center gap-1 px-6 py-3 border-b border-[#2a2a2a]">
			{#each detailTabs as tab (tab.key)}
				<button
					type="button"
					onclick={() => (activeTab = tab.key)}
					class="px-4 py-1 rounded-full text-sm transition-colors
						{activeTab === tab.key ? 'bg-white text-black font-medium' : 'text-[#888] hover:text-white'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Tab content -->
		<div class="flex-1 overflow-y-auto px-6 py-4" style="scrollbar-width: none;">

			<!-- ═══ NOTES ══════════════════════════════════════════════════════════ -->
			{#if activeTab === 'notes'}
				<div class="mb-3">
					<SearchInput bind:value={noteSearch} placeholder="Filter in notes..." />
				</div>
				<div class="flex flex-col gap-2">
					{#each filteredNotes as note (note.id)}
						<div class="bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a]">
							<p class="text-sm text-white leading-relaxed">{note.content}</p>
							<div class="flex items-center justify-between mt-2">
								<span class="text-xs text-[#555]">{note.author}</span>
								<span class="text-xs text-[#555]">{note.date}</span>
							</div>
						</div>
					{/each}
				</div>

				<!-- Add note -->
				<div class="mt-4 flex gap-2">
					<input
						type="text"
						bind:value={newNote}
						placeholder="Add notes..."
						class="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2
							text-sm text-white placeholder-[#555] outline-none focus:border-[#444] transition-colors"
					/>
					<button
						type="button"
						onclick={() => { if (newNote.trim()) newNote = ''; }}
						class="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
					>
						Send
					</button>
				</div>

			<!-- ═══ OFFERS ══════════════════════════════════════════════════════════ -->
			{:else if activeTab === 'offers'}
				<div class="mb-3">
					<SearchInput bind:value={offerSearch} placeholder="Filter in offers..." />
				</div>
				<div class="flex flex-col gap-2">
					{#each filteredOffers as offer (offer.id)}
						<div class="bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a] flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="text-sm font-medium text-white truncate">{offer.name}</p>
								<p class="text-xs text-[#888] mt-0.5">{offer.totalPrice}</p>
							</div>
							<span class="shrink-0 px-3 py-1 rounded-full text-xs bg-[#222] text-[#888] border border-[#2a2a2a]
								{offer.status === 'order' ? 'text-white' : offer.status === 'failed' ? 'text-[#ff4444]' : ''}">
								{offerStatusLabel[offer.status]}
							</span>
						</div>
					{/each}
				</div>
				<button
					type="button"
					class="mt-3 w-full py-3 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#888] hover:text-white hover:bg-[#222] transition-colors"
				>
					+ Add New
				</button>

			<!-- ═══ ORDERS ══════════════════════════════════════════════════════════ -->
			{:else if activeTab === 'orders'}
				<div class="flex flex-col gap-2">
					{#each mockOrders as order (order.id)}
						<div class="bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a] flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="text-sm font-medium text-white truncate">{order.name}</p>
								<p class="text-xs text-[#888] mt-0.5">{order.totalPrice}</p>
							</div>
							<span class="shrink-0 px-3 py-1 rounded-full text-xs border border-[#2a2a2a]
								{order.status === 'delivered' ? 'bg-[#1a2a1a] text-green-400' : order.status === 'cancelled' ? 'bg-[#2a1a1a] text-[#ff4444]' : 'bg-[#222] text-[#888]'}">
								{orderStatusLabel[order.status]}
							</span>
						</div>
					{/each}
				</div>

			<!-- ═══ PAYMENTS ═══════════════════════════════════════════════════════ -->
			{:else if activeTab === 'payments'}
				<!-- Summary card -->
				<div class="bg-[#1a1a1a] rounded-2xl px-4 py-4 border border-[#2a2a2a] mb-4 flex items-center justify-between gap-4">
					<div>
						<p class="text-xs text-[#555] mb-1">Sales</p>
						<p class="text-base font-bold text-white">{totalSales}</p>
					</div>
					<div>
						<p class="text-xs text-[#555] mb-1">Total Payments</p>
						<p class="text-base font-bold text-white">{totalPayments}</p>
					</div>
					<div>
						<p class="text-xs text-[#555] mb-1">Balance</p>
						<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#2a1a1a] text-[#ff4444] font-medium">
							{balance}
						</span>
					</div>
				</div>

				<!-- Payment list -->
				<div class="flex flex-col gap-2">
					{#each mockPayments as payment (payment.id)}
						<div class="bg-[#1a1a1a] rounded-2xl px-4 py-3 border border-[#2a2a2a] flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="text-sm font-medium text-white truncate">{payment.name}</p>
								<p class="text-xs text-[#888] mt-0.5">{payment.date}</p>
							</div>
							<div class="shrink-0 flex items-center gap-2">
								<span class="text-sm font-medium text-white">{payment.amount}</span>
								<span class="px-2 py-0.5 rounded-full text-xs bg-[#222] text-[#888] border border-[#2a2a2a]">
									{paymentTypeLabel[payment.type]}
								</span>
							</div>
						</div>
					{/each}
				</div>

			<!-- ═══ CONTACT ═════════════════════════════════════════════════════════ -->
			{:else if activeTab === 'contact'}
				<div class="flex flex-col gap-2">
					<InfoCard label="Industry" value={client.industry} />
					<InfoCard label="Related Person" value={client.relatedPerson} />
					<InfoCard label="Delivery Address" value={client.deliveryAddress} />
					<InfoCard label="Billing Address" value={client.billingAddress} />
					<InfoCard label="E-mail" value={client.email} />
				</div>

				<button
					type="button"
					class="mt-4 w-full py-3 rounded-2xl bg-white text-black text-sm font-medium hover:bg-[#e0e0e0] transition-colors"
				>
					Edit
				</button>
			{/if}
		</div>
	</div>
{/if}
