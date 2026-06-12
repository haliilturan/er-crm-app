<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { allCountries, getStatesByCountry, getCitiesByState } from '$lib/data/geoHelpers';
	import { db, id, tx } from '$lib/instant';
	import { authStore } from '$lib/stores/auth.svelte';
	import { SectionHead, TextInput, TextArea, Select } from '$lib/components/ui';

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
		companyType: string;
		source: string;
		address: string;
		state: string;
		city: string;
		deliveryAddress: string;
		phone: string;
		phoneLandline: string;
		email: string;
		website: string;
		taxNumber: string;
		contactTitle: string;
	};

	// ─── Static Options ───────────────────────────────────────────────────────
	const TYPE_OPTIONS = [
		{ value: 'Lead',          label: 'Lead'          },
		{ value: 'Contact',       label: 'Contact'       },
		{ value: 'Client',        label: 'Client'        },
		{ value: 'Son Kullanıcı', label: 'Son Kullanıcı' },
		{ value: 'Aracı',         label: 'Aracı'         },
		{ value: 'Tüccar',        label: 'Tüccar'        },
		{ value: 'Soğuk İletişim', label: 'Soğuk İletişim' }
	];

	const SECTOR_OPTIONS = [
		'Halı Yıkama', 'Üretici', 'Makinacı', 'Ağaç Sanayi', 'Ambalaj Sanayi',
		'Arıtma Tesisleri', 'Cam Yıkama', 'Dizayn-Dekor-Tasarım', 'Elektrik Elektronik',
		'Fırça Üreticisi', 'Geri Dönüşüm', 'Gıda Makinaları', 'Giriş Ve Kapılar',
		'Güneş Enerjisi Panel Temizliği', 'Halı Yıkama Makine Üreticisi', 'Hayvancılık',
		'Hırdavat', 'Konveyör Bant', 'Kozmetik', 'Maden-Mermercilik-Seramik',
		'Makina Sanayi', 'Matbaa', 'Meşrubat Sanayi', 'Metal Sanayi', 'Mobilya Ahşap İşleri',
		'Otomotiv', 'Polisaj', 'Tekstil', 'Temizlik', 'Tütün İşleme', 'Kimyasal Üretimi',
		'Kişisel Bakım', 'Tarım Ve Ziraat', 'Unlama Makina', 'Ambalaj Etiketleme',
		'Kurutulmuş Gıda', 'Mühendislik Danışmanlık', 'Oyun Makinaları', 'Kümes Hayvancılık',
		'Hidrolik Tamir Servisi', 'Çim Makina Üreticisi', 'Çelik Konstrüksiyon',
		'Boya Üretimi', 'Talaşlı İmalat', 'Su Ürünleri Yetiştiriciliği', 'CNC Torna',
		'Asansör Parça', 'Deri İşleme', 'İklimlendirme', 'Sucuk İmalatı', 'Tesisat Isıtma',
		'Yem Karma', 'Ağaç İşleme', 'Robotik Otomasyon', 'Sera Makina', 'Ambalaj Dolum',
		'İnşaat Yapı', 'Motorlu Taşıt', 'Beyaz Eşya', 'Kauçuk ve Plastik', 'Süt Ürünleri',
		'Bisküvi Üretimi', 'Baharat', 'Yol Süpürme', 'Akü Üretimi', 'Lastik Üretimi',
		'Yedek Parça', 'Son Kullanıcı', 'B2B', 'Otel', 'Medikal', 'Eğitim Kurumu',
		'Çamaşırhane', 'Lazer Kesim', 'Savunma Ve Havacılık', 'Lojistik', 'Diğer'
	];

	// Country options — computed once from local JSON
	const countryOptions = allCountries.map((c) => ({
		value: c.iso2,
		label: `${c.emoji} ${c.name}`
	}));

	// ─── State ────────────────────────────────────────────────────────────────
	let isNew = $derived(!customerId);
	let loading = $state(false);
	let formReady = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let attempted = $state(false);
	let selectedCountryIso2 = $state('TR');
	let selectedStateId = $state('');
	let cityOptions = $state<Array<{ value: string; label: string }>>([]);

	const EMPTY_FORM: FormData = {
		name: '', contactName: '',
		companyType: 'Lead', source: '',
		address: '', state: '', city: '', deliveryAddress: '',
		phone: '', phoneLandline: '', email: '',
		website: '', taxNumber: '', contactTitle: ''
	};

	let form = $state<FormData>({ ...EMPTY_FORM });

	// ─── Derived ──────────────────────────────────────────────────────────────
	let countryName = $derived(
		allCountries.find((c) => c.iso2 === selectedCountryIso2)?.name ?? ''
	);

	let stateOptions = $derived(
		getStatesByCountry(selectedCountryIso2).map((s) => ({
			value: String(s.id),
			label: s.name
		}))
	);

	let stateLabel = $derived(selectedCountryIso2 === 'TR' ? 'İl' : 'Eyalet / Bölge');

	let formValid = $derived(
		form.name.trim().length > 0 &&
		form.contactName.trim().length > 0 &&
		form.phone.trim().length > 0
	);

	// ─── Lazy-load cities when state changes ──────────────────────────────────
	$effect(() => {
		const sid = Number(selectedStateId);
		const iso2 = selectedCountryIso2;
		if (!sid) {
			cityOptions = [];
			return;
		}
		getCitiesByState(iso2, sid).then((cities) => {
			cityOptions = cities.slice(0, 200).map((c) => ({ value: c.name, label: c.name }));
		});
	});

	// ─── Helpers ──────────────────────────────────────────────────────────────
	function normalize(s: string): string {
		return s
			.toLowerCase()
			.replace(/ğ/g, 'g')
			.replace(/ü/g, 'u')
			.replace(/ş/g, 's')
			.replace(/ı/g, 'i')
			.replace(/ö/g, 'o')
			.replace(/ç/g, 'c');
	}

	// ─── Init ─────────────────────────────────────────────────────────────────
	onMount(() => {
		if (!customerId) {
			loading = false;
			formReady = true;
		}
	});

	// ─── Load customer for edit ───────────────────────────────────────────────
	$effect(() => {
		const cId = customerId;
		if (!cId) {
			untrack(() => {
				form = { ...EMPTY_FORM };
				selectedCountryIso2 = 'TR';
				selectedStateId = '';
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
				const c = ((result.data?.customers ?? []) as unknown[])[0] as
					| Record<string, unknown>
					| undefined;
				if (!c) return;
				untrack(() => {
					if (!formReady) {
						form = {
							name:            String(c.name            ?? ''),
							contactName:     String(c.contactName     ?? ''),
							companyType:     String(c.companyType     ?? 'Lead'),
							source:          String(c.source          ?? ''),
							address:         String(c.address         ?? ''),
							state:           String(c.state           ?? ''),
							city:            String(c.city            ?? ''),
							deliveryAddress: String(c.deliveryAddress ?? ''),
							phone:           String(c.phone           ?? ''),
							phoneLandline:   String(c.phoneLandline   ?? ''),
							email:           String(c.email           ?? ''),
							website:         String(c.website         ?? ''),
							taxNumber:       String(c.taxNumber       ?? ''),
							contactTitle:    String(c.contactTitle    ?? '')
						};
						// Restore country selection
						const storedCountry = String(c.country ?? '');
						const foundCountry = allCountries.find((o) => o.name === storedCountry);
						if (foundCountry) selectedCountryIso2 = foundCountry.iso2;
						// Restore state selection
						const storedState = String(c.state ?? '');
						if (storedState && foundCountry) {
							const foundState = getStatesByCountry(foundCountry.iso2)
								.find((s) => s.name === storedState);
							if (foundState) selectedStateId = String(foundState.id);
						}
						formReady = true;
						loading = false;
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

		const userId = authStore.userId;
		if (!userId) { saveError = 'Oturum bilgisi yüklenemedi.'; return; }

		saving = true;
		saveError = '';

		try {
			const body = {
				name:        form.name.trim(),
				nameSearch:  normalize(form.name.trim()),
				contactName: form.contactName.trim(),
				phone:       form.phone.trim(),
				companyType: form.companyType,
				status:      'lead',
				country:     countryName,
				...(form.state.trim()           && { state:           form.state.trim()           }),
				...(form.source.trim()          && { source:          form.source.trim()          }),
				...(form.city.trim()            && { city:            form.city.trim()            }),
				...(form.address.trim()         && { address:         form.address.trim()         }),
				...(form.deliveryAddress.trim() && { deliveryAddress: form.deliveryAddress.trim() }),
				...(form.email.trim()           && { email:           form.email.trim()           }),
				...(form.website.trim()         && { website:         form.website.trim()         }),
				...(form.phoneLandline.trim()   && { phoneLandline:   form.phoneLandline.trim()   }),
				...(form.taxNumber.trim()       && { taxNumber:       form.taxNumber.trim()       }),
				...(form.contactTitle.trim()    && { contactTitle:    form.contactTitle.trim()    })
			};

			console.log('Saving customer:', body);

			if (isNew) {
				const newId = id();
				await db.transact([
					tx.customers[newId].update({
						...body,
						assignedTo: userId,
						createdBy:  userId,
						createdAt:  Date.now(),
						updatedBy:  userId,
						updatedAt:  Date.now()
					})
				]);
			} else {
				await db.transact([
					tx.customers[customerId!].update({
						...body,
						updatedBy: userId,
						updatedAt: Date.now()
					})
				]);
			}
			onClose();
		} catch (err) {
			console.error('saveCustomer error:', err);
			saveError = 'Kaydedilemedi. Lütfen tekrar deneyin.';
		} finally {
			saving = false;
		}
	}
</script>

<!-- ─── Panel ───────────────────────────────────────────────────────────────── -->
<div class="flex h-full flex-col overflow-hidden bg-[#111111]">

	<!-- ── Header ───────────────────────────────────────────────────────────── -->
	<div class="shrink-0 border-b border-[#2a2a2a] px-6 py-5">
		<div class="flex items-start justify-between gap-3">
			<SectionHead
				title={form.name || (isNew ? 'Yeni Müşteri' : 'Müşteri Düzenle')}
				description={[countryName, form.state, form.city, form.phone].filter(Boolean).join(' · ')}
			/>
			<button
				type="button"
				onclick={onClose}
				aria-label="Kapat"
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#555]
					transition-colors hover:bg-[#222] hover:text-white"
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
			<div class="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
		</div>

	{:else}
		<form onsubmit={saveCustomer} novalidate class="flex min-h-0 flex-1 flex-col">

			<!-- Scrollable fields -->
			<div
				class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
				style="scrollbar-width: none;"
			>

				<!-- ── Section: Temel Bilgiler ─────────────────────────────────── -->
				<div class="flex items-center gap-3 pb-1">
					<span class="text-[11px] font-semibold uppercase tracking-widest text-[#444]">Temel Bilgiler</span>
					<div class="h-px flex-1 bg-[#2a2a2a]"></div>
				</div>

				<TextInput
					label="Müşteri Adı"
					bind:value={form.name}
					placeholder="Örn: Yıldız Tekstil A.Ş."
					required
					error={attempted && !form.name.trim() ? 'Bu alan zorunludur.' : ''}
				/>

				<TextInput
					label="Firma Yetkili Adı"
					bind:value={form.contactName}
					placeholder="Yetkili kişi adı"
					required
					error={attempted && !form.contactName.trim() ? 'Bu alan zorunludur.' : ''}
				/>

				<Select
					label="Müşteri Tip"
					bind:value={form.companyType}
					options={TYPE_OPTIONS}
					searchable={false}
				/>

				<Select
					label="Müşteri Sektör"
					bind:value={form.source}
					options={SECTOR_OPTIONS}
					placeholder="Sektör seçin"
				/>

				<!-- ── Section: Adres Bilgileri ───────────────────────────────── -->
				<div class="flex items-center gap-3 pb-1 pt-3">
					<span class="text-[11px] font-semibold uppercase tracking-widest text-[#444]">Adres Bilgileri</span>
					<div class="h-px flex-1 bg-[#2a2a2a]"></div>
				</div>

				<Select
					label="Ülke"
					bind:value={selectedCountryIso2}
					options={countryOptions}
					placeholder="Ülke seçin"
					onchange={() => {
						selectedStateId = '';
						form.state = '';
						form.city = '';
					}}
				/>

				<Select
					label={stateLabel}
					bind:value={selectedStateId}
					options={stateOptions}
					placeholder="{stateLabel} seçin"
					onchange={(opt) => {
						form.state = opt.label;
						form.city = '';
					}}
				/>

				<TextArea
					label="Fatura Adresi"
					bind:value={form.address}
					placeholder="Sokak, mahalle, ilçe..."
					rows={3}
				/>

				<Select
					label="Şehir / İlçe"
					bind:value={form.city}
					options={cityOptions}
					placeholder="Şehir seçin"
				/>

				<TextArea
					label="Teslimat Adresi"
					bind:value={form.deliveryAddress}
					placeholder="Teslimat adresi..."
					rows={3}
				/>

				<!-- ── Section: İletişim Bilgileri ────────────────────────────── -->
				<div class="flex items-center gap-3 pb-1 pt-3">
					<span class="text-[11px] font-semibold uppercase tracking-widest text-[#444]">İletişim Bilgileri</span>
					<div class="h-px flex-1 bg-[#2a2a2a]"></div>
				</div>

				<TextInput
					label="Telefon (Mobil)"
					bind:value={form.phone}
					type="tel"
					placeholder="+90 555 000 00 00"
					required
					error={attempted && !form.phone.trim() ? 'Bu alan zorunludur.' : ''}
				/>

				<TextInput
					label="Telefon (Sabit)"
					bind:value={form.phoneLandline}
					type="tel"
					placeholder="+90 212 000 00 00"
				/>

				<TextInput
					label="E-Posta"
					bind:value={form.email}
					type="email"
					placeholder="ornek@firma.com"
				/>

				<TextInput
					label="Website"
					bind:value={form.website}
					placeholder="https://www.firma.com"
				/>

				<TextInput
					label="Vergi No"
					bind:value={form.taxNumber}
					placeholder="1234567890"
				/>

				<TextInput
					label="Vergi Dairesi"
					bind:value={form.contactTitle}
					placeholder="Bağcılar VD"
				/>

				{#if saveError}
					<p class="rounded-xl border border-[#ff4444]/30 bg-[#2a1a1a] px-4 py-3 text-sm text-[#ff4444]">
						{saveError}
					</p>
				{/if}

			</div>

			<!-- Footer -->
			<div class="shrink-0 flex items-center justify-between gap-3 border-t border-[#2a2a2a] px-5 py-4">
				<button
					type="button"
					onclick={onClose}
					class="rounded-full bg-[#222] px-6 py-2.5 text-sm text-white transition-colors hover:bg-[#2a2a2a]"
				>
					İptal
				</button>
				<button
					type="submit"
					disabled={saving}
					class="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-opacity disabled:opacity-50"
				>
					{saving ? 'Kaydediliyor...' : isNew ? 'Müşteri Oluştur' : 'Kaydet'}
				</button>
			</div>

		</form>
	{/if}
</div>
