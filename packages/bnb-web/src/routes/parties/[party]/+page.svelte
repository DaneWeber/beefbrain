<script lang="ts">
	import { base } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.party.name} - Beefbrain</title>
</svelte:head>

<div class="character-list">
	<a href="{base}/" class="back-link">&larr; All Parties</a>
	<h1>{data.party.name}</h1>
	<div class="cards">
		{#each data.characters as char}
			<a href="{base}/parties/{data.party.slug}/characters/{char.slug}" class="card">
				<h2>{char.name}</h2>
				<p class="player">Player: {char.player}</p>
				<p class="race">{char.race}</p>
				<p class="classes">{char.classes}</p>
			</a>
		{/each}
	</div>
</div>

<style>
	.character-list {
		max-width: 900px;
		margin: 0 auto;
	}
	h1 {
		margin-bottom: 1.5rem;
	}
	.back-link {
		display: inline-block;
		margin-bottom: 0.75rem;
		color: #555;
		text-decoration: none;
		font-size: 0.9rem;
	}
	.back-link:hover {
		text-decoration: underline;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1rem;
	}
	.card {
		display: block;
		padding: 1.25rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.15s;
	}
	.card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
	.card h2 {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
	}
	.card p {
		margin: 0.2rem 0;
		font-size: 0.9rem;
		color: #555;
	}
	.card .classes {
		font-weight: 600;
		color: #333;
	}
</style>
