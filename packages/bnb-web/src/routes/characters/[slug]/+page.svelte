<script lang="ts">
	import StreamlinedSheet from '$lib/components/StreamlinedSheet.svelte';
	import DetailedSheet from '$lib/components/DetailedSheet.svelte';

	let { data } = $props();
	const character = $derived(data.character);
	const name = $derived(character?.description?.name ?? 'Character');

	type ViewMode = 'streamlined' | 'detailed';
	let viewMode: ViewMode = $state('streamlined');
</script>

<svelte:head>
	<title>{name} - Beefbrain</title>
</svelte:head>

<div class="page-controls no-print">
	<a href="/" class="back-link">&larr; All Characters</a>
	<div class="view-toggle">
		<button
			class:active={viewMode === 'streamlined'}
			onclick={() => (viewMode = 'streamlined')}
		>
			Play
		</button>
		<button
			class:active={viewMode === 'detailed'}
			onclick={() => (viewMode = 'detailed')}
		>
			Detailed
		</button>
	</div>
	<button class="print-btn" onclick={() => window.print()}>Print</button>
</div>

{#if viewMode === 'streamlined'}
	<StreamlinedSheet {character} />
{:else}
	<DetailedSheet {character} />
{/if}

<style>
	.page-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		max-width: 1100px;
		margin-left: auto;
		margin-right: auto;
	}
	.back-link {
		color: #555;
		text-decoration: none;
		font-size: 0.9rem;
	}
	.back-link:hover {
		color: #000;
	}
	.view-toggle {
		display: flex;
		border: 1px solid #ccc;
		border-radius: 4px;
		overflow: hidden;
	}
	.view-toggle button {
		padding: 0.3rem 0.75rem;
		border: none;
		background: #f5f5f5;
		cursor: pointer;
		font-size: 0.82rem;
		color: #555;
	}
	.view-toggle button:not(:last-child) {
		border-right: 1px solid #ccc;
	}
	.view-toggle button.active {
		background: #333;
		color: #fff;
	}
	.print-btn {
		margin-left: auto;
		padding: 0.3rem 0.75rem;
		background: #333;
		color: #fff;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.82rem;
	}
	.print-btn:hover {
		background: #555;
	}

	@media print {
		:global(.no-print) {
			display: none !important;
		}
	}
</style>
