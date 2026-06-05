<script lang="ts">
	import { db } from '$lib/instant';

	type Step = 'email' | 'code';

	let step = $state<Step>('email');
	let email = $state('');
	let code = $state('');
	let isLoading = $state(false);
	let errorMsg = $state('');

	async function sendCode(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) return;
		isLoading = true;
		errorMsg = '';
		try {
			await db.auth.sendMagicCode({ email: trimmed });
			step = 'code';
		} catch (err: unknown) {
			const msg = (err as { body?: { message?: string } })?.body?.message;
			errorMsg = msg ?? 'Kod gönderilemedi. Lütfen tekrar deneyin.';
		} finally {
			isLoading = false;
		}
	}

	async function verifyCode(e: SubmitEvent) {
		e.preventDefault();
		const trimmedCode = code.trim();
		if (!trimmedCode) return;
		isLoading = true;
		errorMsg = '';
		try {
			await db.auth.signInWithMagicCode({ email: email.trim(), code: trimmedCode });
			// +layout.svelte auth listener /dashboard'a yönlendirir
		} catch (err: unknown) {
			const msg = (err as { body?: { message?: string } })?.body?.message;
			errorMsg = msg ?? 'Kod geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.';
			isLoading = false;
		}
	}

	function goBack() {
		step = 'email';
		code = '';
		errorMsg = '';
	}
</script>

<svelte:head>
	<title>Giriş — ERP-CRM</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm">
		<!-- Logo / Başlık -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
				<svg class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-gray-900">ERP-CRM</h1>
			<p class="mt-1 text-sm text-gray-500">Şirket yönetim paneli</p>
		</div>

		<!-- Kart -->
		<div class="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
			{#if step === 'email'}
				<!-- Adım 1: E-posta -->
				<div class="mb-6">
					<h2 class="text-lg font-semibold text-gray-900">Giriş yap</h2>
					<p class="mt-1 text-sm text-gray-500">E-posta adresinize tek kullanımlık kod göndereceğiz.</p>
				</div>

				<form onsubmit={sendCode} class="space-y-4">
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700">E-posta</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="ornek@sirket.com"
							autocomplete="email"
							required
							disabled={isLoading}
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
						/>
					</div>

					{#if errorMsg}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
					{/if}

					<button
						type="submit"
						disabled={isLoading || !email.trim()}
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							Gönderiliyor...
						{:else}
							Kod gönder
						{/if}
					</button>
				</form>

			{:else}
				<!-- Adım 2: Kod doğrulama -->
				<div class="mb-6">
					<h2 class="text-lg font-semibold text-gray-900">Kodu girin</h2>
					<p class="mt-1 text-sm text-gray-500">
						<span class="font-medium text-gray-700">{email}</span> adresine 6 haneli kod gönderdik.
					</p>
				</div>

				<form onsubmit={verifyCode} class="space-y-4">
					<div>
						<label for="code" class="block text-sm font-medium text-gray-700">Doğrulama kodu</label>
						<input
							id="code"
							type="text"
							bind:value={code}
							placeholder="123456"
							inputmode="numeric"
							autocomplete="one-time-code"
							maxlength="6"
							required
							disabled={isLoading}
							class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
						/>
					</div>

					{#if errorMsg}
						<p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
					{/if}

					<button
						type="submit"
						disabled={isLoading || code.trim().length < 6}
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							Doğrulanıyor...
						{:else}
							Giriş yap
						{/if}
					</button>

					<button
						type="button"
						onclick={goBack}
						disabled={isLoading}
						class="w-full text-center text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
					>
						← Farklı e-posta kullan
					</button>
				</form>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-gray-400">
			Şifre yok. Sadece e-posta.
		</p>
	</div>
</main>
