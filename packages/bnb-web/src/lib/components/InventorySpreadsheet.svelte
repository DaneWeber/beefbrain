<script lang="ts">
	import { downloadInventoryCSV } from '$lib/csvExport';
	import type { InventoryItem } from '$lib/inventory';

	interface Props {
		items: InventoryItem[];
		summary?: {
			totalItems: number;
			totalValue: number;
			totalWeight: number;
			magicItemCount: number;
			byCategory: Record<string, InventoryItem[]>;
			byPC: Record<string, InventoryItem[]>;
		};
	}

	let { items, summary }: Props = $props();

	type SortField = 'id' | 'pcName' | 'location' | 'category' | 'description' | 'quantity' | 'weight' | 'marketValue';
	type SortOrder = 'asc' | 'desc';

	let sortField: SortField = $state('pcName');
	let sortOrder: SortOrder = $state('asc');
	let filterCategory = $state('');
	let filterPC = $state('');
	let filterLocation = $state('');
	let searchText = $state('');

	// Get unique values for filters
	const categories = $derived(Array.from(new Set(items.map((i) => i.category))).sort());
	const pcs = $derived(Array.from(new Set(items.map((i) => i.pcName))).sort());
	const locations = $derived(Array.from(new Set(items.map((i) => i.location))).sort());

	// Filter items based on criteria
	const filteredItems = $derived(
		items.filter((item) => {
			if (filterCategory && item.category !== filterCategory) return false;
			if (filterPC && item.pcName !== filterPC) return false;
			if (filterLocation && item.location !== filterLocation) return false;
			if (searchText) {
				const search = searchText.toLowerCase();
				return (
					item.description.toLowerCase().includes(search) ||
					item.category.toLowerCase().includes(search) ||
					item.pcName.toLowerCase().includes(search) ||
					item.id.toLowerCase().includes(search)
				);
			}
			return true;
		})
	);

	// Sort items
	const sortedItems = $derived.by(() => {
		const sorted = [...filteredItems];
		sorted.sort((a, b) => {
			let aVal: string | number = '';
			let bVal: string | number = '';

			switch (sortField) {
				case 'id':
					aVal = a.id;
					bVal = b.id;
					break;
				case 'pcName':
					aVal = a.pcName;
					bVal = b.pcName;
					break;
				case 'location':
					aVal = a.location;
					bVal = b.location;
					break;
				case 'category':
					aVal = a.category;
					bVal = b.category;
					break;
				case 'description':
					aVal = a.description;
					bVal = b.description;
					break;
				case 'quantity':
					aVal = a.quantity;
					bVal = b.quantity;
					break;
				case 'weight':
					aVal = a.weight;
					bVal = b.weight;
					break;
				case 'marketValue':
					aVal = a.marketValue;
					bVal = b.marketValue;
					break;
			}

			if (typeof aVal === 'string' && typeof bVal === 'string') {
				return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
			}
			return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
		});
		return sorted;
	});

	// Calculate filtered totals
	const filteredStats = $derived.by(() => {
		let totalValue = 0;
		let totalWeight = 0;
		let totalQty = 0;
		let magicCount = 0;

		for (const item of filteredItems) {
			totalValue += item.marketValue * item.quantity;
			totalWeight += item.weight * item.quantity;
			totalQty += item.quantity;
			if (item.tags.includes('magic')) magicCount++;
		}

		return { totalValue, totalWeight, totalQty, magicCount };
	});

	function handleSort(field: SortField) {
		if (sortField === field) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortOrder = 'asc';
		}
	}

	function handleCSVExport() {
		downloadInventoryCSV(sortedItems, `inventory-${new Date().toISOString().split('T')[0]}.csv`);
	}

	function getSortIndicator(field: SortField): string {
		if (sortField !== field) return '';
		return sortOrder === 'asc' ? ' ▲' : ' ▼';
	}
</script>

<div class="inventory-grid">
	<div class="summary-panel">
		<h3>Inventory Summary</h3>
		{#if summary}
			<div class="summary-stats">
				<div class="stat">
					<span class="label">Total Items</span>
					<span class="value">{summary.totalItems}</span>
				</div>
				<div class="stat">
					<span class="label">Total Value</span>
					<span class="value">{summary.totalValue.toLocaleString()} gp</span>
				</div>
				<div class="stat">
					<span class="label">Total Weight</span>
					<span class="value">{summary.totalWeight.toFixed(1)} lbs</span>
				</div>
				<div class="stat">
					<span class="label">Magic Items</span>
					<span class="value">{summary.magicItemCount}</span>
				</div>
			</div>
		{:else if filteredItems.length > 0}
			<div class="summary-stats">
				<div class="stat">
					<span class="label">Filtered Items</span>
					<span class="value">{filteredItems.length}</span>
				</div>
				<div class="stat">
					<span class="label">Total Value</span>
					<span class="value">{filteredStats.totalValue.toLocaleString()} gp</span>
				</div>
				<div class="stat">
					<span class="label">Total Weight</span>
					<span class="value">{filteredStats.totalWeight.toFixed(1)} lbs</span>
				</div>
				<div class="stat">
					<span class="label">Magic Items</span>
					<span class="value">{filteredStats.magicCount}</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="controls">
		<div class="search-bar">
			<input
				type="text"
				placeholder="Search items, categories, PCs..."
				bind:value={searchText}
				class="search-input"
			/>
		</div>

		<div class="filter-group">
			<select bind:value={filterPC} class="filter-select">
				<option value="">All Characters</option>
				{#each pcs as pc}
					<option value={pc}>{pc}</option>
				{/each}
			</select>

			<select bind:value={filterLocation} class="filter-select">
				<option value="">All Locations</option>
				{#each locations as loc}
					<option value={loc}>{loc}</option>
				{/each}
			</select>

			<select bind:value={filterCategory} class="filter-select">
				<option value="">All Categories</option>
				{#each categories as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<button onclick={handleCSVExport} class="export-btn">📥 Export CSV</button>
		</div>
	</div>

	<div class="table-container">
		<table class="inventory-table">
			<thead>
				<tr>
					<th onclick={() => handleSort('id')}>ID {getSortIndicator('id')}</th>
					<th onclick={() => handleSort('pcName')}>PC {getSortIndicator('pcName')}</th>
					<th onclick={() => handleSort('location')}>Location {getSortIndicator('location')}</th>
					<th onclick={() => handleSort('category')}>Category {getSortIndicator('category')}</th>
					<th onclick={() => handleSort('description')}>Description {getSortIndicator('description')}</th>
					<th>True Description</th>
					<th>Aura Strength</th>
					<th>Aura Type</th>
					<th>Origin</th>
					<th onclick={() => handleSort('quantity')} class="numeric">Qty {getSortIndicator('quantity')}</th>
					<th onclick={() => handleSort('weight')} class="numeric">Weight {getSortIndicator('weight')}</th>
					<th onclick={() => handleSort('marketValue')} class="numeric">
						Value {getSortIndicator('marketValue')}
					</th>
					<th class="numeric">Total Value</th>
					<th>Tags</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedItems as item (item.id)}
					<tr class:magic={item.tags.includes('magic')}>
						<td class="id-cell">{item.id}</td>
						<td class="pc-cell">{item.pcName}</td>
						<td class="location-cell">{item.location}</td>
						<td class="category-cell">{item.category}</td>
						<td class="description-cell">{item.description}</td>
						<td class="description-cell">{item.trueDescription}</td>
						<td class="aura-strength-cell">{item.auraStrength}</td>
						<td class="aura-type-cell">{item.auraType}</td>
						<td class="origin-cell">{item.origin || '-'}</td>
						<td class="numeric">{item.quantity}</td>
						<td class="numeric">{item.weight}</td>
						<td class="numeric">{item.marketValue}</td>
						<td class="numeric">{(item.marketValue * item.quantity).toLocaleString()}</td>
						<td class="tags-cell">
							{#if item.tags.length > 0}
								<span class="tag-list">{item.tags.join(', ')}</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if sortedItems.length === 0}
		<div class="empty-state">
			<p>No items match the current filters.</p>
		</div>
	{/if}
</div>

<style>
	.inventory-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.summary-panel {
		background: white;
		padding: 1rem;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.summary-panel h3 {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		color: #333;
	}

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.stat .label {
		font-size: 0.75rem;
		color: #666;
		font-weight: 600;
		text-transform: uppercase;
	}

	.stat .value {
		font-size: 1.1rem;
		font-weight: bold;
		color: #1a5490;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: white;
		padding: 1rem;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.search-bar {
		display: flex;
		gap: 0.5rem;
	}

	.search-input {
		flex: 1;
		padding: 0.6rem;
		border: 1px solid #ddd;
		border-radius: 3px;
		font-size: 0.9rem;
	}

	.filter-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filter-select {
		padding: 0.6rem 0.75rem;
		border: 1px solid #ddd;
		border-radius: 3px;
		background: white;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.export-btn {
		padding: 0.6rem 1rem;
		background: #1a5490;
		color: white;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		transition: background 0.2s;
	}

	.export-btn:hover {
		background: #0d3a5c;
	}

	.table-container {
		overflow-x: auto;
		background: white;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.inventory-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.inventory-table thead {
		background: #f0f0f0;
		border-bottom: 2px solid #ddd;
		position: sticky;
		top: 0;
	}

	.inventory-table th {
		padding: 0.75rem;
		text-align: left;
		font-weight: 600;
		color: #333;
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
		border-right: 1px solid #ddd;
	}

	.inventory-table th:last-child {
		border-right: none;
	}

	.inventory-table th.numeric {
		text-align: right;
	}

	.inventory-table th:hover {
		background: #e0e0e0;
	}

	.inventory-table td {
		padding: 0.6rem 0.75rem;
		border-right: 1px solid #eee;
		border-bottom: 1px solid #eee;
	}

	.inventory-table td:last-child {
		border-right: none;
	}

	.inventory-table tbody tr:hover {
		background: #f9f9f9;
	}

	.inventory-table tbody tr.magic {
		background: #f0f4ff;
	}

	.inventory-table tbody tr.magic:hover {
		background: #e5ecff;
	}

	.numeric {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.id-cell {
		font-family: monospace;
		font-size: 0.8rem;
		color: #666;
	}

	.pc-cell {
		font-weight: 600;
		color: #1a5490;
	}

	.location-cell {
		color: #666;
		text-transform: capitalize;
	}

	.category-cell {
		color: #555;
		font-weight: 500;
	}

	.description-cell {
		color: #333;
	}

	.aura-strength-cell {
		font-weight: 500;
		color: #b8860b;
	}

	.aura-type-cell {
		color: #7a4ba8;
		font-size: 0.8rem;
	}

	.origin-cell {
		color: #666;
		font-size: 0.85rem;
	}

	.tags-cell {
		font-size: 0.8rem;
	}

	.tag-list {
		display: inline-block;
		background: #f0f0f0;
		padding: 0.2rem 0.5rem;
		border-radius: 2px;
		color: #666;
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: #999;
		background: white;
		border-radius: 4px;
	}
</style>
