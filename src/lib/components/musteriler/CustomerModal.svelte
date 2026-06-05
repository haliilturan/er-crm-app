<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { db, id, tx } from '$lib/instant';
	import { activeCompany } from '$lib/stores/activeCompany.svelte';
	import { SectionHead, TextInput, TextArea, Select, Button } from '$lib/components/ui';

	// ─── Props ────────────────────────────────────────────────────────────────
	let {
		customerId = null,
		onClose
	}: {
		customerId?: string | null;
		onClose: () => void;
	} = $props();

	// ─── Types ────────────────────────────────────────────────────────────────
	type FormData = {
		name: string;
		contactName: string;
		contactTitle: string;
		phone: string;
		email: string;
		country: string;
		city: string;
		address: string;
		taxNumber: string;
		companyType: string;
		status: string;
		source: string;
	};

	// ─── Options ──────────────────────────────────────────────────────────────
	const TYPE_OPTIONS = [
		{ value: 'corporate',  label: 'Kurumsal'  },
		{ value: 'individual', label: 'Bireysel'  }
	];

	const STATUS_OPTIONS = [
		{ value: 'lead',     label: 'Potansiyel' },
		{ value: 'active',   label: 'Aktif'      },
		{ value: 'inactive', label: 'Pasif'      }
	];

	const SOURCE_OPTIONS = [
		{ value: 'referral', label: 'Referans'       },
		{ value: 'web',      label: 'Web'             },
		{ value: 'cold',     label: 'Soğuk İletişim' },
		{ value: 'other',    label: 'Diğer'           }
	];

	const EMPTY_FORM: FormData = {
		name: '', contactName: '', contactTitle: '', phone: '',
		email: '', country: '', city: '', address: '', taxNumber: '',
		companyType: 'corporate', status: 'lead', source: ''
	};

	// ─── State ────────────────────────────────────────────────────────────────
	let isNew      = $derived(!customerId);
	let userId     = $state<string | null>(null);
	let loading    = $state(false);
	let formReady  = $state(false);
	let form       = $state<FormData>({ ...EMPTY_FORM });
	let attempted  = $state(false);
	let saving     = $state(false);
	let saveError  = $state('');
	let saveSuccess = $state(false);
	let successTimer: ReturnType<typeof setTimeout> | undefined;

	// ─── Derived ──────────────────────────────────────────────────────────────
	let formValid = $derived(form.name.trim().length > 0 && form.phone.trim().length > 0);
	let headerDesc = $derived([form.city, form.phone].filter(Boolean).join(' · '));

	// ─── Helpers ──────────────────────────────────────────────────────────────
	function normalize(s: string): string {
		return s.toLowerCase()
			.replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
			.replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
	}

	// ─── Cleanup ──────────────────────────────────────────────────────────────
	onDestroy(() => clearTimeout(successTimer));

	// ─── Auth ─────────────────────────────────────────────────────────────────
	onMount(() => {
		if (!customerId) {
			loading = false;
			formReady = true;
		}
		return db.subscribeAuth((s) => { userId = s.user?.id ?? null; });
	});

	// ─── Load customer for edit ───────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) {
			untrack(() => {
				form = { ...EMPTY_FORM };
				formReady = true;
				loading = false;
			});
			return;
		}

		untrack(() => {
			formReady = false;
			loading = true;
		});

		return db.subscribeQuery(
			{ customers: { $: { where: { id: cId } } } },
			(result) => {
				const c = ((result.data?.customers ?? []) as unknown[])[0] as Record<string, unknown> | undefined;
				if (!c) return;
				untrack(() => {
					if (!formReady) {
						form = {
							name:         String(c.name         ?? ''),
							contactName:  String(c.contactName  ?? ''),
							contactTitle: String(c.contactTitle ?? ''),
							phone:        String(c.phone        ?? ''),
							email:        String(c.email        ?? ''),
							country:      String(c.country      ?? ''),
							city:         String(c.city         ?? ''),
							address:      String(c.address      ?? ''),
							taxNumber:    String(c.taxNumber    ?? ''),
							companyType:  String(c.companyType  ?? 'corporate'),
							status:       String(c.status       ?? 'lead'),
							source:       String(c.source       ?? '')
						};
						formReady = true;
						loading   = false;
					}
				});
			}
		);
	});

	// ─── Save ─────────────────────────────────────────────────────────────────
	async function saveCustomer(e: SubmitEvent) {
		e.preventDefault();
		attempted = true;
		if (!formValid) return;
		if (!activeCompany.current) { saveError = 'Aktif şirket seçilmedi.'; return; }
		if (!userId) { saveError = 'Oturum bilgisi yüklenemedi.'; return; }

		saving    = true;
		saveError = '';
		saveSuccess = false;

		try {
			const body = {
				name:        form.name.trim(),
				nameSearch:  normalize(form.name.trim()),
				phone:       form.phone.trim(),
				companyType: form.companyType,
				status:      form.status,
				...(form.contactName.trim()  && { contactName:  form.contactName.trim()  }),
				...(form.contactTitle.trim() && { contactTitle: form.contactTitle.trim() }),
				...(form.email.trim()        && { email:        form.email.trim()        }),
				...(form.country.trim()      && { country:      form.country.trim()      }),
				...(form.city.trim()         && { city:         form.city.trim()         }),
				...(form.address.trim()      && { address:      form.address.trim()      }),
				...(form.taxNumber.trim()    && { taxNumber:    form.taxNumber.trim()    }),
				...(form.source              && { source:       form.source              })
			};

			if (isNew) {
				const newId = id();
				await db.transact([
					tx.customers[newId].update({
						...body,
						companyId:  activeCompany.current.id,
						assignedTo: userId,
						createdBy:  userId,
						createdAt:  Date.now()
					})
				]);
				onClose();
			} else {
				await db.transact([
					tx.customers[customerId!].update({
						...body,
						updatedBy: userId,
						updatedAt: Date.now()
					})
				]);
				saveSuccess = true;
				clearTimeout(successTimer);
				successTimer = setTimeout(() => { saveSuccess = false; }, 2500);
			}
		} catch {
			saveError = 'Kaydedilemedi. Lütfen tekrar deneyin.';
		} finally {
			saving = false;
		}
	}
</script>

<!-- ─── Panel: fills its container ──────────────────────────────────────────── -->
<div class="flex h-full flex-col overflow-hidden bg-white">

	<!-- ── Header ───────────────────────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-gray-100 px-6 py-5">
		<div class="flex items-start justify-between gap-3">
			<SectionHead
				title={form.name || (isNew ? 'Yeni Müşteri' : 'Müşteri Düzenle')}
				description={headerDesc}
			/>
			<button
				type="button"
				onclick={onClose}
				aria-label="Kapat"
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400
					transition-colors hover:bg-gray-100 hover:text-gray-600"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- ── Body ─────────────────────────────────────────────────────────────── -->
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="h-7 w-7 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
		</div>

	{:else}
		<form onsubmit={saveCustomer} novalidate class="flex min-h-0 flex-1 flex-col">

			<!-- Scrollable fields -->
			<div
				class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
				style="scrollbar-width: none;"
			>
				<!-- Müşteri Adı -->
				<div>
					<TextInput
						label="Müşteri Adı *"
						bind:value={form.name}
						placeholder="Örn: Yıldız Tekstil A.Ş."
						required
					/>
					{#if attempted && !form.name.trim()}
						<p class="mt-1.5 px-1 text-xs text-red-500">Bu alan zorunludur.</p>
					{/if}
				</div>

				<!-- Müşteri Tipi -->
				<Select
					label="Müşteri Tipi"
					bind:value={form.companyType}
					options={TYPE_OPTIONS}
					searchable={false}
				/>

				<!-- Durum -->
				<Select
					label="Durum"
					bind:value={form.status}
					options={STATUS_OPTIONS}
					searchable={false}
				/>

				<!-- Yetkili -->
				<TextInput
					label="Yetkili Adı"
					bind:value={form.contactName}
					placeholder="Yetkili kişi"
				/>

				<TextInput
					label="Ünvan"
					bind:value={form.contactTitle}
					placeholder="Örn: Satın Alma Müdürü"
				/>

				<!-- Telefon -->
				<div>
					<TextInput
						label="Telefon *"
						bind:value={form.phone}
						type="tel"
						placeholder="+90 555 000 00 00"
						required
					/>
					{#if attempted && !form.phone.trim()}
						<p class="mt-1.5 px-1 text-xs text-red-500">Bu alan zorunludur.</p>
					{/if}
				</div>

				<!-- E-posta -->
				<TextInput
					label="E-posta"
					bind:value={form.email}
					type="email"
					placeholder="ornek@firma.com"
				/>

				<!-- Ülke -->
				<TextInput
					label="Ülke"
					bind:value={form.country}
					placeholder="Türkiye"
				/>

				<!-- Şehir -->
				<TextInput
					label="Şehir"
					bind:value={form.city}
					placeholder="İstanbul"
				/>

				<!-- Adres -->
				<TextArea
					label="Adres"
					bind:value={form.address}
					placeholder="Sokak, mahalle, ilçe..."
					rows={3}
				/>

				<!-- Vergi No -->
				<TextInput
					label="Vergi No"
					bind:value={form.taxNumber}
					placeholder="1234567890"
				/>

				<!-- Kaynak -->
				<Select
					label="Kaynak"
					bind:value={form.source}
					options={SOURCE_OPTIONS}
					placeholder="Seçin"
					searchable={false}
				/>

				<!-- Save error -->
				{#if saveError}
					<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>
				{/if}
			</div>

			<!-- Footer -->
			<div class="shrink-0 flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
				<Button variant="ghost" type="button" onclick={onClose}>İptal</Button>
				<Button
					type="submit"
					disabled={saving}
				>
					{#if saving}
						Kaydediliyor...
					{:else if saveSuccess}
						✓ Kaydedildi
					{:else}
						{isNew ? 'Müşteri Oluştur' : 'Kaydet'}
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
