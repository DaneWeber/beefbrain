<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data, children } = $props();

	let currentParty = $derived(page.params.party ?? '');

	function switchParty(event: Event) {
		const slug = (event.currentTarget as HTMLSelectElement).value;
		// Character slugs differ between parties, so land on the party index.
		goto(slug ? `/parties/${slug}` : '/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="no-print">
	<a href="/" class="nav-brand">Beefbrain</a>

	{#if data.parties.length > 0}
		<label class="party-switcher">
			<span class="party-label">Party</span>
			<select value={currentParty} onchange={switchParty} aria-label="Switch party">
				<option value="">All parties</option>
				{#each data.parties as party (party.slug)}
					<option value={party.slug}>{party.name}</option>
				{/each}
			</select>
		</label>
	{/if}

	{#if currentParty}
		<a href="/parties/{currentParty}/dm" class="nav-link">DM View</a>
	{/if}
</nav>

<main>
	{@render children()}
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		color: #222;
		background: #fafafa;
	}
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		background: #2c2c2c;
		padding: 0.5rem 1.5rem;
		margin-bottom: 1.5rem;
	}
	.nav-brand {
		color: #fff;
		font-weight: 700;
		font-size: 1.1rem;
		text-decoration: none;
	}
	.nav-brand:hover {
		color: #ccc;
	}
	.nav-link {
		color: #aaa;
		text-decoration: none;
		font-size: 0.9rem;
	}
	.nav-link:hover {
		color: #fff;
	}
	.party-switcher {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.party-label {
		color: #aaa;
		font-size: 0.9rem;
	}
	.party-switcher select {
		background: #3c3c3c;
		color: #fff;
		border: 1px solid #555;
		border-radius: 4px;
		padding: 0.2rem 0.4rem;
		font-size: 0.9rem;
	}
	main {
		padding: 0 1.5rem 2rem;
	}
	@media print {
		nav {
			display: none;
		}
		main {
			padding: 0;
		}
		:global(body) {
			background: white;
		}
	}
</style>
