<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="no-print">
	<a href="/" class="nav-brand">Beefbrain</a>
	<a href="/dm" class="nav-link">DM View</a>
</nav>

<main>
	{@render children()}
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
			sans-serif;
		color: #222;
		background: #fafafa;
	}
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	nav {
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
		margin-left: 1.5rem;
	}
	.nav-link:hover {
		color: #fff;
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
