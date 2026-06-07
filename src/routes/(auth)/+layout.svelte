<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { User } from '@instantdb/core';
	import { db } from '$lib/instant';

	let { children }: { children: Snippet } = $props();

	type AuthResult = { user: User | undefined; error: undefined } | { user: undefined; error: { message: string } };
	let auth = $state<AuthResult>({ user: undefined, error: undefined });
	let authReady = $state(false);

	onMount(() => {
		return db.subscribeAuth((state) => {
			auth = state;
			authReady = true;
			if (state.user) {
				window.location.replace('/dashboard');
			}
		});
	});
</script>

{#if !authReady}
	<div class="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent opacity-30"></div>
	</div>
{:else if !auth.user}
	{@render children()}
{/if}
