<script lang="ts">
	import { db } from '$lib/instant';

	type Step = 'email' | 'code';

	let step      = $state<Step>('email');
	let email     = $state('');
	let code      = $state('');
	let isLoading = $state(false);
	let errorMsg  = $state('');

	async function sendCode(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) return;
		isLoading = true;
		errorMsg  = '';
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
		errorMsg  = '';
		try {
			await db.auth.signInWithMagicCode({ email: email.trim(), code: trimmedCode });
		} catch (err: unknown) {
			const msg = (err as { body?: { message?: string } })?.body?.message;
			errorMsg  = msg ?? 'Kod geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.';
			isLoading = false;
		}
	}

	function goBack() {
		step     = 'email';
		code     = '';
		errorMsg = '';
	}
</script>

<svelte:head>
	<title>Giriş — ERP-CRM</title>
</svelte:head>

<div class="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
	<div class="relative w-[900px] h-[600px] flex-shrink-0 ml-[50px]">

		<!-- Sol küçük panel -->
		<div class="absolute -left-[100px] top-1/2 -translate-y-1/2 w-[270px] h-[480px] bg-[#242424] rounded-[28px] border border-white/5 z-0"></div>

		<!-- Sağ form paneli -->
		<div class="absolute right-0 top-1/2 -translate-y-1/2 w-[680px] h-[480px] bg-[#242424] rounded-[28px] border border-white/5 z-0" style="box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5)">
			<div class="absolute right-12 top-1/2 -translate-y-1/2 w-[320px] space-y-6">
				<h2 class="text-xl font-medium text-gray-400">Email Authentication</h2>

				<div class="space-y-4">
					{#if step === 'email'}
						<form onsubmit={sendCode} class="space-y-4">
							<input
								type="email"
								bind:value={email}
								placeholder="ornek@sirket.com"
								autocomplete="email"
								required
								disabled={isLoading}
								class="bg-[#2d2d2d] border-none rounded-xl py-4 px-5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 w-full disabled:opacity-50"
							/>

							{#if errorMsg}
								<p class="rounded-lg bg-red-950/30 border border-red-900/50 px-4 py-3 text-sm text-red-400">{errorMsg}</p>
							{/if}

							<button
								type="submit"
								disabled={isLoading || !email.trim()}
								class="w-full bg-[#0a0a0a] text-white font-medium py-4 rounded-xl border border-white/10 hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
						<p class="text-sm text-gray-500">
							<span class="text-gray-300">{email}</span> adresine 6 haneli kod gönderdik.
						</p>

						<form onsubmit={verifyCode} class="space-y-4">
							<input
								type="text"
								bind:value={code}
								placeholder="123456"
								inputmode="numeric"
								autocomplete="one-time-code"
								maxlength="6"
								required
								disabled={isLoading}
								class="bg-[#2d2d2d] border-none rounded-xl py-4 px-5 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 w-full text-center text-lg font-mono tracking-[0.5em] disabled:opacity-50"
							/>

							{#if errorMsg}
								<p class="rounded-lg bg-red-950/30 border border-red-900/50 px-4 py-3 text-sm text-red-400">{errorMsg}</p>
							{/if}

							<button
								type="submit"
								disabled={isLoading || code.trim().length < 6}
								class="w-full bg-[#0a0a0a] text-white font-medium py-4 rounded-xl border border-white/10 hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
								class="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
							>
								← Farklı e-posta kullan
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>

		<!-- Merkez marka paneli -->
		<div class="absolute left-[90px] top-1/2 -translate-y-1/2 z-10 w-[400px] h-[640px] bg-[#1a1a1a] rounded-[36px] border border-white/10 flex flex-col items-center justify-between py-14 px-8 text-center" style="box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5)">

			<!-- Üst branding -->
			<div class="space-y-2">
				<h1 class="text-3xl font-bold tracking-tight whitespace-nowrap text-white">HLL International</h1>
				<p class="text-gray-500 font-medium">Business Operating Systems</p>
			</div>

			<!-- Logo -->
			<div class="w-full flex justify-center">
				<img
					src="/hll-logo.png"
					alt="HLL International"
					class="max-h-64 object-contain"
					style="filter: invert(1) brightness(2)"
				/>
			</div>

			<!-- Alt yazı -->
			<div>
				<p class="text-gray-600 text-sm tracking-wide">Enterprise Resource Planning</p>
			</div>
		</div>

	</div>
</div>
