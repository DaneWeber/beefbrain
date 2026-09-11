<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Beefbrain - Parties</title>
</svelte:head>

<div class="party-list">
	<h1>Parties</h1>
	{#if data.parties.length === 0}
		<p class="empty">
			No parties found. Add character files under <code>data/parties/&lt;party&gt;/</code>.
		</p>
	{:else}
		<div class="cards">
			{#each data.parties as party (party.slug)}
				<a href="/parties/{party.slug}" class="card">
					<h2>{party.name}</h2>
					<p class="count">
						{party.characterCount}
						{party.characterCount === 1 ? 'character' : 'characters'}
					</p>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.party-list {
		max-width: 900px;
		margin: 0 auto;
	}
	h1 {
		margin-bottom: 1.5rem;
	}
	.empty {
		color: #555;
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
	.card .count {
		margin: 0;
		font-size: 0.9rem;
		color: #555;
	}
</style>
