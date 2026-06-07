<script lang="ts">
	import { goto } from '$app/navigation';
	import { activeCompany } from '$lib/stores/activeCompany.svelte';
	import { SectionHead, MenuItemCard } from '$lib/components/ui';
	import {
		ShoppingBag,
		Settings2,
		Package,
		ShoppingCart,
		Truck,
		DollarSign,
		FolderOpen,
		Shield
	} from 'lucide-svelte';

	const MODULES = [
		{ id: 'satis', title: 'Satış', description: 'Müşteri İlişkileri', href: '/satis/musteriler', icon: ShoppingBag },
		{ id: 'uretim', title: 'Üretim', description: 'Üretim Operasyonları', href: '/uretim/siparisler', icon: Settings2 },
		{ id: 'depo', title: 'Depo', description: 'Stok ve Malzeme Yönetimi', href: '/depo/stok', icon: Package },
		{ id: 'satin-alma', title: 'Satın Alma', description: 'Tedarik Süreçleri', href: '/satin-alma/talepler', icon: ShoppingCart },
		{ id: 'sevkiyat', title: 'Sevkiyat', description: 'Kargo ve Nakliye Yönetimi', href: '/sevkiyat', icon: Truck },
		{ id: 'finans', title: 'Finans', description: 'Finans Operasyonları', href: '/finans', icon: DollarSign },
		{ id: 'projeler', title: 'Projeler', description: 'Proje ve Toplantı Yönetimi', href: '/projeler', icon: FolderOpen },
		{ id: 'yonetim', title: 'Yönetim', description: 'Sistem Ayarları', href: '/yonetim', icon: Shield }
	];

	function initial(name: string): string {
		return name.trim()[0]?.toUpperCase() ?? '?';
	}
</script>

<svelte:head>
	<title>Kontrol Merkezi — ERP-CRM</title>
</svelte:head>

<div class="flex h-full overflow-hidden gap-3 p-4">

	<!-- ═══ page-aside ══════════════════════════════════════════════════════════ -->
	<section class="flex w-[340px] shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
		<div class="shrink-0">
			<SectionHead title="Kontrol Merkezi" description="Temel Fonksiyonel Birimler" />
		</div>
		<div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" style="scrollbar-width: none;">
			{#each MODULES as mod (mod.id)}
				<MenuItemCard
					title={mod.title}
					description={mod.description}
					icon={mod.icon}
					onclick={() => void goto(mod.href)}
				/>
			{/each}
		</div>
	</section>

	<!-- ═══ page-main ═══════════════════════════════════════════════════════════ -->
	<section class="flex min-w-0 flex-1 items-center justify-center">
		{#if activeCompany.current}
			<div class="flex flex-col items-center gap-4 text-center">
				<div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#222] border border-[#2a2a2a] text-3xl font-bold text-white">
					{initial(activeCompany.current.name)}
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{activeCompany.current.name}</p>
					<p class="mt-1 text-sm text-[#888]">Soldan bir modül seçerek başlayın</p>
				</div>
			</div>
		{:else}
			<p class="text-sm text-[#888]">Soldan bir modül seçin</p>
		{/if}
	</section>
</div>
