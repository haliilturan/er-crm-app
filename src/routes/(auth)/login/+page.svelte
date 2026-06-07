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

<main class="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
	<div class="w-full max-w-sm">
		<!-- Logo / Başlık -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
				<svg class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-white">ERP-CRM</h1>
			<p class="mt-1 text-sm text-[#888]">Şirket yönetim paneli</p>
		</div>

		<!-- Kart -->
		<div class="rounded-2xl bg-[#111111] border border-[#2a2a2a] p-8">
			{#if step === 'email'}
				<!-- Adım 1: E-posta -->
				<div class="mb-6">
					<h2 class="text-lg font-semibold text-white">Giriş yap</h2>
					<p class="mt-1 text-sm text-[#888]">E-posta adresinize tek kullanımlık kod göndereceğiz.</p>
				</div>

				<form onsubmit={sendCode} class="space-y-4">
					<div>
						<label for="email" class="block text-sm font-medium text-[#888]">E-posta</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							placeholder="ornek@sirket.com"
							autocomplete="email"
							required
							disabled={isLoading}
							class="mt-1 block w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#555] focus:outline-none focus:ring-1 focus:ring-[#555] disabled:opacity-50"
						/>
					</div>

					{#if errorMsg}
						<p class="rounded-lg bg-[#2a1a1a] border border-[#ff4444]/30 px-3 py-2 text-sm text-[#ff4444]">{errorMsg}</p>
					{/if}

					<button
						type="submit"
						disabled={isLoading || !email.trim()}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#e0e0e0] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
							Gönderiliyor...
						{:else}
							Kod gönder
						{/if}
					</button>
				</form>

			{:else}
				<!-- Adım 2: Kod doğrulama -->
				<div class="mb-6">
					<h2 class="text-lg font-semibold text-white">Kodu girin</h2>
					<p class="mt-1 text-sm text-[#888]">
						<span class="font-medium text-white">{email}</span> adresine 6 haneli kod gönderdik.
					</p>
				</div>

				<form onsubmit={verifyCode} class="space-y-4">
					<div>
						<label for="code" class="block text-sm font-medium text-[#888]">Doğrulama kodu</label>
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
							class="mt-1 block w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2.5 text-center text-lg font-mono tracking-[0.5em] text-white placeholder-[#555] focus:border-[#555] focus:outline-none focus:ring-1 focus:ring-[#555] disabled:opacity-50"
						/>
					</div>

					{#if errorMsg}
						<p class="rounded-lg bg-[#2a1a1a] border border-[#ff4444]/30 px-3 py-2 text-sm text-[#ff4444]">{errorMsg}</p>
					{/if}

					<button
						type="submit"
						disabled={isLoading || code.trim().length < 6}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#e0e0e0] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isLoading}
							<span class="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent"></span>
							Doğrulanıyor...
						{:else}
							Giriş yap
						{/if}
					</button>

					<button
						type="button"
						onclick={goBack}
						disabled={isLoading}
						class="w-full text-center text-sm text-[#888] hover:text-white transition-colors disabled:opacity-50"
					>
						← Farklı e-posta kullan
					</button>
				</form>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-[#555]">
			Şifre yok. Sadece e-posta.
		</p>
	</div>
</main>
