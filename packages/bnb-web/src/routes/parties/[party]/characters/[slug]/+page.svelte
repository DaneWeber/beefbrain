<script lang="ts">
	import StreamlinedSheet from '$lib/components/StreamlinedSheet.svelte';
	import DetailedSheet from '$lib/components/DetailedSheet.svelte';

	let { data, form } = $props();
	const character = $derived(data.character);
	const skillPointWarning = $derived(form?.skillPointWarning ?? data.skillPointWarning);
	const name = $derived(character?.description?.name ?? 'Character');
	const latexTemplates = $derived(data.latexTemplates ?? []);

	type ViewMode = 'streamlined' | 'detailed';
	let viewMode: ViewMode = $state('detailed');
	let selectedLatexTemplate = $state('dnd35-detailed');
	const sheetExportBase = $derived(`/parties/${data.party.slug}/characters/${data.slug}`);
	const latexDownloadHref = $derived(
		`${sheetExportBase}/latex?template=${encodeURIComponent(selectedLatexTemplate)}`
	);

	let pdfPending = $state(false);
	let pdfError: string | null = $state(null);

	// Fetched rather than linked so a slow or failed LuaLaTeX run reports itself
	// here instead of replacing the sheet with an error page.
	async function downloadPdf() {
		pdfPending = true;
		pdfError = null;
		try {
			const href = `${sheetExportBase}/pdf?template=${encodeURIComponent(selectedLatexTemplate)}`;
			const response = await fetch(href);
			if (!response.ok) {
				const body = await response.json().catch(() => null);
				throw new Error(body?.message ?? `PDF generation failed (${response.status})`);
			}

			const blob = await response.blob();
			const fileName =
				response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ??
				`${data.slug}-${selectedLatexTemplate}.pdf`;

			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			link.remove();
			// Chromium cancels the download if the object URL is revoked in the same
			// tick as the click, so let it start first.
			setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
		} catch (err) {
			pdfError = err instanceof Error ? err.message : String(err);
		} finally {
			pdfPending = false;
		}
	}
</script>

<svelte:head>
	<title>{name} - Beefbrain</title>
</svelte:head>

<div class="page-controls no-print">
	<a href="/parties/{data.party.slug}" class="back-link">&larr; {data.party.name}</a>
	<div class="view-toggle">
		<button class:active={viewMode === 'streamlined'} onclick={() => (viewMode = 'streamlined')}>
			Play
		</button>
		<button class:active={viewMode === 'detailed'} onclick={() => (viewMode = 'detailed')}>
			Detailed
		</button>
	</div>
	<div class="latex-export">
		<select bind:value={selectedLatexTemplate}>
			{#each latexTemplates as template}
				<option value={template.key}>{template.name}</option>
			{/each}
		</select>
		<a class="latex-link" href={latexDownloadHref}>Download LaTeX</a>
		<button class="latex-link pdf-btn" onclick={downloadPdf} disabled={pdfPending}>
			{pdfPending ? 'Generating PDF...' : 'Download PDF'}
		</button>
	</div>
	<button class="print-btn" onclick={() => window.print()}>Print</button>
</div>

{#if pdfError}
	<div class="pdf-error no-print" role="alert">
		<strong>PDF:</strong>
		{pdfError}
	</div>
{/if}

{#if skillPointWarning}
	<div class="skill-point-warning no-print" role="status">
		<strong>Skill points:</strong>
		{skillPointWarning}
	</div>
{/if}

{#if viewMode === 'streamlined'}
	<StreamlinedSheet {character} />
{:else}
	<DetailedSheet {character} slug={data.slug} inventoryLocations={data.inventoryLocations} />
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
	.latex-export {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.latex-export select {
		padding: 0.3rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.82rem;
		background: #fff;
	}
	.latex-link {
		padding: 0.3rem 0.75rem;
		background: #2f5f2f;
		color: #fff;
		border-radius: 4px;
		text-decoration: none;
		font-size: 0.82rem;
	}
	.latex-link:hover {
		background: #3e7a3e;
	}
	.pdf-btn {
		border: none;
		cursor: pointer;
		font-family: inherit;
	}
	.pdf-btn:disabled {
		background: #7a8a7a;
		cursor: progress;
	}
	.pdf-error {
		max-width: 1100px;
		margin: 0 auto 1rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid #c88;
		border-radius: 4px;
		background: #fdf0f0;
		color: #722;
		font-size: 0.85rem;
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
	.skill-point-warning {
		max-width: 1100px;
		margin: 0 auto 1rem;
		padding: 0.75rem 1rem;
		border: 1px solid #d6a000;
		border-radius: 4px;
		background: #fff8dc;
		color: #5f4700;
	}

	@media print {
		:global(.no-print) {
			display: none !important;
		}
	}
</style>
