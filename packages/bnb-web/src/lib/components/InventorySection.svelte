<script lang="ts">
	import { formatKey } from '$lib/format';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { inventory, compact = false }: { inventory: Record<string, any>; compact?: boolean } =
		$props();

	function inventoryLocations(inv: Record<string, unknown>): string[] {
		if (Array.isArray(inv._on)) return inv._on as string[];
		return Object.keys(inv).filter((k) => !k.startsWith('_') && k !== 'money');
	}

	function inventoryItems(inv: Record<string, unknown>, location: string): unknown[][] {
		const items = inv[location];
		if (!Array.isArray(items)) return [];
		return items.filter((item: unknown) => Array.isArray(item) && (item as unknown[]).length > 0);
	}
</script>

<section class="inventory-section" class:compact>
	<h2>Inventory</h2>
	{#if inventory.money}
		<div class="money-row">
			<span class="label">Money</span>
			<span>
				{inventory.money._total}
				{#if inventory.money.coins}
					{@const coins = inventory.money.coins}
					{#if Array.isArray(coins) && coins[3]}
						<span class="detail">
							({#each Object.entries(coins[3]) as [denom, amt], i}{#if i > 0}, {/if}{denom}: {amt}{/each})
						</span>
					{/if}
				{/if}
			</span>
		</div>
	{/if}

	<div class="inv-flow">
	{#each inventoryLocations(inventory) as location}
		{@const items = inventoryItems(inventory, location)}
		{#if items.length > 0}
			<div class="inv-group">
			<h3>{formatKey(location)}</h3>
			<table>
				<thead>
					<tr>
						<th>Item</th>
						<th>Qty</th>
						{#if !compact}
							<th>Type</th>
						{/if}
						<th>Weight</th>
						{#if !compact}
							<th>Cost</th>
							<th>Notes</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each items as item}
						<tr>
							<td class="item-name">{item[0] ?? ''}</td>
							<td class="centered">{item[1] ?? ''}</td>
							{#if !compact}
								<td>{item[2] ?? ''}</td>
							{/if}
							<td class="right">{item[3] ?? ''}</td>
							{#if !compact}
								<td class="right">{item[4] ?? ''}</td>
								<td class="notes-cell">
									{#if item[5] && typeof item[5] === 'object' && !Array.isArray(item[5])}
										{Object.entries(item[5]).map(([k, v]) => `${k}: ${v}`).join(', ')}
									{/if}
									{#if Array.isArray(item[6])}
										{#if item[5] && typeof item[5] === 'object' && Object.keys(item[5]).length > 0}
											|
										{/if}
										<span class="tags">{item[6].join(', ')}</span>
									{/if}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
			</div>
		{/if}
	{/each}
	</div>
</section>

<style>
	.inventory-section {
		margin-bottom: 0.75rem;
	}
	h2 {
		font-size: 1rem;
		border-bottom: 1px solid #aaa;
		padding-bottom: 0.15rem;
		margin: 0 0 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #444;
	}
	h3 {
		font-size: 0.88rem;
		margin: 0.5rem 0 0.2rem;
		color: #555;
	}
	.inv-flow {
		column-count: 2;
		column-gap: 1.5rem;
	}
	.inv-group {
		break-inside: avoid;
	}
	.money-row {
		display: flex;
		gap: 0.5rem;
		margin: 0.15rem 0;
	}
	.label {
		font-weight: 600;
	}
	.detail {
		color: #777;
		font-size: 0.8rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.78rem;
		margin: 0.15rem 0;
	}
	.compact table {
		font-size: 0.88rem;
	}
	th,
	td {
		padding: 0.15rem 0.35rem;
		text-align: left;
		border-bottom: 1px solid #eee;
	}
	.compact th,
	.compact td {
		padding: 0.2rem 0.4rem;
	}
	th {
		font-weight: 600;
		font-size: 0.7rem;
		text-transform: uppercase;
		color: #888;
		border-bottom: 1px solid #ccc;
	}
	.compact th {
		font-size: 0.75rem;
	}
	.item-name {
		font-weight: 500;
	}
	.centered {
		text-align: center;
	}
	.right {
		text-align: right;
	}
	.notes-cell {
		color: #777;
		font-size: 0.75rem;
	}
	.tags {
		font-size: 0.72rem;
		color: #999;
		font-style: italic;
	}

	@media print {
		table {
			font-size: 7pt;
		}
		.compact table {
			font-size: 8pt;
		}
		.inventory-section {
			break-inside: avoid;
		}
	}
</style>
