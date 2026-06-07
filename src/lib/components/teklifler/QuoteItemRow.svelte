<script lang="ts">
	import type { LineItem } from './QuoteForm.svelte';

	type GroupedProduct = {
		brandName: string;
		products: Array<{
			id: string;
			name: string;
			sku: string;
			basePrice: number;
			vatRate: number;
			unit: string;
		}>;
	};

	let {
		item = $bindable(),
		groups,
		onRemove
	}: {
		item: LineItem;
		groups: GroupedProduct[];
		onRemove: () => void;
	} = $props();

	const VAT_RATES = [0, 1, 10, 20];
	const UNITS = ['Adet', 'Kg', 'Metre', 'M²', 'M³', 'Litre', 'Paket', 'Takım', 'Set'];

	let unitPrice      = $derived(item.listPrice * (1 - item.discountRate / 100));
	let lineTotal      = $derived(unitPrice * item.quantity);
	let vatAmount      = $derived(lineTotal * item.vatRate / 100);
	let lineTotalVat   = $derived(lineTotal + vatAmount);

	function fmt(n: number): string {
		return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function onProductChange(e: Event) {
		const productId = (e.target as HTMLSelectElement).value;
		if (!productId) {
			item.productId   = '';
			item.productName = '';
			item.productSku  = '';
			item.brandName   = '';
			return;
		}
		for (const group of groups) {
			const p = group.products.find((p) => p.id === productId);
			if (p) {
				item.productId   = p.id;
				item.productName = p.name;
				item.productSku  = p.sku;
				item.brandName   = group.brandName;
				item.listPrice   = p.basePrice ?? 0;
				item.vatRate     = p.vatRate ?? 20;
				item.unit        = p.unit ?? 'Adet';
				break;
			}
		}
	}
</script>

<div class="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
	<!-- Row 1: Product + Remove -->
	<div class="mb-3 flex items-start gap-2">
		<div class="flex-1">
			<select
				value={item.productId}
				onchange={onProductChange}
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			>
				<option value="">— Ürün seçin veya serbest girin —</option>
				{#each groups as group (group.brandName)}
					<optgroup label={group.brandName}>
						{#each group.products as p (p.id)}
							<option value={p.id}>{p.name} ({p.sku})</option>
						{/each}
					</optgroup>
				{/each}
			</select>
			{#if !item.productId}
				<input
					type="text"
					bind:value={item.productName}
					placeholder="Ürün adı..."
					class="mt-1.5 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
				/>
			{/if}
		</div>
		<button
			type="button"
			onclick={onRemove}
			aria-label="Satırı sil"
			class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#555] transition-colors hover:bg-[#222] hover:text-[#ff4444]"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Row 2: Quantity, Unit, List price, Discount -->
	<div class="mb-3 grid grid-cols-4 gap-2">
		<div>
			<label for="{item.tempId}-qty" class="mb-1 block text-[11px] text-[#555]">Miktar</label>
			<input
				id="{item.tempId}-qty"
				type="number"
				bind:value={item.quantity}
				min="0.01"
				step="0.01"
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			/>
		</div>
		<div>
			<label for="{item.tempId}-unit" class="mb-1 block text-[11px] text-[#555]">Birim</label>
			<select
				id="{item.tempId}-unit"
				bind:value={item.unit}
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			>
				{#each UNITS as u (u)}
					<option value={u}>{u}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="{item.tempId}-price" class="mb-1 block text-[11px] text-[#555]">Liste Fiyatı</label>
			<input
				id="{item.tempId}-price"
				type="number"
				bind:value={item.listPrice}
				min="0"
				step="0.01"
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			/>
		</div>
		<div>
			<label for="{item.tempId}-disc" class="mb-1 block text-[11px] text-[#555]">İskonto %</label>
			<input
				id="{item.tempId}-disc"
				type="number"
				bind:value={item.discountRate}
				min="0"
				max="100"
				step="0.1"
				class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white focus:border-[#555] focus:outline-none"
			/>
		</div>
	</div>

	<!-- Row 3: VAT + computed totals -->
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<span class="text-[11px] text-[#555]">KDV:</span>
			{#each VAT_RATES as rate (rate)}
				<label class="flex cursor-pointer items-center gap-1">
					<input
						type="radio"
						bind:group={item.vatRate}
						value={rate}
						class="accent-white"
					/>
					<span class="text-xs text-[#888]">%{rate}</span>
				</label>
			{/each}
		</div>

		<div class="ml-auto flex items-center gap-4 text-sm">
			<div class="text-right">
				<p class="text-[11px] text-[#555]">Birim Fiyat</p>
				<p class="font-medium text-white">{fmt(unitPrice)}</p>
			</div>
			<div class="text-right">
				<p class="text-[11px] text-[#555]">KDV'siz</p>
				<p class="font-medium text-white">{fmt(lineTotal)}</p>
			</div>
			<div class="text-right">
				<p class="text-[11px] text-[#555]">KDV'li</p>
				<p class="font-bold text-white">{fmt(lineTotalVat)}</p>
			</div>
		</div>
	</div>

	<!-- Row 4: Notes (optional) -->
	<div class="mt-3">
		<input
			type="text"
			bind:value={item.notes}
			placeholder="Satır notu (opsiyonel)..."
			class="w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-xs text-white placeholder-[#555] focus:border-[#555] focus:outline-none"
		/>
	</div>
</div>
