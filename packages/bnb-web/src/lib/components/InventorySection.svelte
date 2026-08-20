<script lang="ts">
	import { formatKey } from '$lib/format';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { inventory, compact = false, slug = '', editable = false }: {
		inventory: Record<string, any>;
		compact?: boolean;
		slug?: string;
		editable?: boolean;
	} = $props();

	function inventoryLocations(inv: Record<string, unknown>): string[] {
		if (Array.isArray(inv._on)) return inv._on as string[];
		return Object.keys(inv).filter((k) => !k.startsWith('_') && k !== 'money');
	}

	function inventoryItems(inv: Record<string, unknown>, location: string): unknown[][] {
		const items = inv[location];
		if (!Array.isArray(items)) return [];
		return items.filter((item: unknown) => Array.isArray(item) && (item as unknown[]).length > 0);
	}

	// Magic item body slots
	const bodySlots = [
		'arms',
		'body',
		'face',
		'feet',
		'hands',
		'head',
		'left-ring',
		'right-ring',
		'shoulders',
		'throat',
		'torso',
		'waist'
	];

	// Map singular tag names to plural slot names
	const slotNameMap: Record<string, string> = {
		'arm': 'arms',
		'arms': 'arms',
		'body': 'body',
		'face': 'face',
		'feet': 'feet',
		'foot': 'feet',
		'hand': 'hands',
		'hands': 'hands',
		'head': 'head',
		'left-ring': 'left-ring',
		'right-ring': 'right-ring',
		'shoulder': 'shoulders',
		'shoulders': 'shoulders',
		'throat': 'throat',
		'torso': 'torso',
		'waist': 'waist'
	};

	interface SlottedItem {
		name: string;
		notes: string;
		location: string;
		orderIndex: number;
		props: Record<string, unknown>;
	}

	interface SlotData {
		items: SlottedItem[];
		hasConflict: boolean;
	}

	function makeSlottedItem(item: unknown[], location: string): SlottedItem {
		const props = (item[5] && typeof item[5] === 'object' && !Array.isArray(item[5]))
			? item[5] as Record<string, unknown>
			: {};
		return {
			name: String(item[0] ?? ''),
			notes: Object.entries(props).map(([k, v]) => `${k}: ${v}`).join(', '),
			location,
			orderIndex: Number(item[4] ?? 0),
			props
		};
	}

	// Extract items by body slot
	const slottedItems = $derived(() => {
		const slots: Record<string, SlotData> = {};
		bodySlots.forEach(slot => slots[slot] = { items: [], hasConflict: false });

		for (const location of inventoryLocations(inventory)) {
			for (const item of inventoryItems(inventory, location)) {
				// Tags are always the last item in the array
				const tags = Array.isArray(item[item.length - 1]) ? (item[item.length - 1] as string[]).map(String) : [];

				// Check for slot tags
				for (const tag of tags) {
					if (tag.endsWith('-slot')) {
						const tagBase = tag.replace('-slot', '');
						const slotName = slotNameMap[tagBase];
						if (!slotName) continue;
						if (bodySlots.includes(slotName)) {
							slots[slotName].items.push(makeSlottedItem(item, location));
						}
					}
				}
			}
		}

		// Mark slots with conflicts (more than one item)
		for (const slot of bodySlots) {
			if (slots[slot].items.length > 1) {
				slots[slot].hasConflict = true;
			}
		}

		return slots;
	});

	// Extract "other" slotless items
	const otherItems = $derived(() => {
		const items: SlottedItem[] = [];

		for (const location of inventoryLocations(inventory)) {
			for (const item of inventoryItems(inventory, location)) {
				// Tags are always the last item in the array
				const tags = Array.isArray(item[item.length - 1]) ? (item[item.length - 1] as string[]).map(String) : [];

				if (tags.includes('other-slot')) {
					items.push(makeSlottedItem(item, location));
				}
			}
		}

		return items;
	});

	// Edit state
	let editingItem: { location: string; orderIndex: number } | null = $state(null);
	let editName = $state('');
	let editEffects = $state('');

	function startEdit(item: SlottedItem) {
		editingItem = { location: item.location, orderIndex: item.orderIndex };
		editName = item.name;
		editEffects = Object.entries(item.props).map(([k, v]) => `${k}: ${v}`).join('\n');
	}

	function cancelEdit() {
		editingItem = null;
	}

	function isEditing(item: SlottedItem): boolean {
		return editingItem?.location === item.location && editingItem?.orderIndex === item.orderIndex;
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

	<!-- Magic Item Body Slots -->
	<div class="body-slots">
		<h3>Magic Item Slots</h3>
		<div class="slot-grid">
			{#each bodySlots as slot}
				{@const slotData = slottedItems()[slot]}
				<div class="slot-row">
					<span class="slot-label">{formatKey(slot)}:</span>
					<span class="slot-item" class:empty={slotData.items.length === 0} class:conflict={slotData.hasConflict}>
						{#if slotData.items.length > 0}
							{#each slotData.items as item, i}
								{#if i > 0}<span class="item-separator"> + </span>{/if}
								{#if editable && isEditing(item)}
									<form
										method="POST"
										action="?/updateMagicItem"
										class="edit-form"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update();
												cancelEdit();
											};
										}}
									>
										<input type="hidden" name="location" value={item.location} />
										<input type="hidden" name="itemOrderIndex" value={item.orderIndex} />
										<input class="edit-name" name="name" bind:value={editName} />
										<textarea class="edit-effects" name="effects" bind:value={editEffects} rows="3" placeholder="key: value (one per line)"></textarea>
										<div class="edit-actions">
											<button type="submit" class="btn-save">Save</button>
											<button type="button" class="btn-cancel" onclick={cancelEdit}>Cancel</button>
										</div>
									</form>
								{:else}
									<span class="item-entry">
										<span class="item-name">{item.name}</span>
										{#if item.notes}
											<span class="item-notes">({item.notes})</span>
										{/if}
										{#if editable}
											<button class="btn-edit" onclick={() => startEdit(item)} title="Edit item">✎</button>
										{/if}
									</span>
								{/if}
							{/each}
						{:else}
							<span class="empty-slot">—</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>

		{#if otherItems().length > 0}
			<div class="other-items">
				<h4>Other (Slotless Items)</h4>
				<div class="other-list">
					{#each otherItems() as item}
						{#if editable && isEditing(item)}
							<form
								method="POST"
								action="?/updateMagicItem"
								class="edit-form"
								use:enhance={() => {
									return async ({ update }) => {
										await update();
										cancelEdit();
									};
								}}
							>
								<input type="hidden" name="location" value={item.location} />
								<input type="hidden" name="itemOrderIndex" value={item.orderIndex} />
								<input class="edit-name" name="name" bind:value={editName} />
								<textarea class="edit-effects" name="effects" bind:value={editEffects} rows="3" placeholder="key: value (one per line)"></textarea>
								<div class="edit-actions">
									<button type="submit" class="btn-save">Save</button>
									<button type="button" class="btn-cancel" onclick={cancelEdit}>Cancel</button>
								</div>
							</form>
						{:else}
							<div class="other-item">
								<span class="item-name">{item.name}</span>
								{#if item.notes}
									<span class="item-notes">({item.notes})</span>
								{/if}
								{#if editable}
									<button class="btn-edit" onclick={() => startEdit(item)} title="Edit item">✎</button>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>

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
	
	/* Body Slots */
	.body-slots {
		margin: 0.75rem 0;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #fafafa;
	}
	.body-slots h3 {
		font-size: 0.85rem;
		margin: 0 0 0.4rem;
		color: #555;
		font-weight: 600;
	}
	.slot-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.15rem 1rem;
		font-size: 0.8rem;
	}
	.slot-row {
		display: flex;
		gap: 0.35rem;
		align-items: baseline;
	}
	.slot-label {
		font-weight: 600;
		color: #666;
		min-width: 5rem;
		text-transform: capitalize;
	}
	.slot-item {
		flex: 1;
	}
	.slot-item.empty {
		color: #bbb;
	}
	.slot-item.conflict {
		color: #c00;
		font-weight: 600;
	}
	.slot-item.conflict .item-name {
		color: #c00;
	}
	.slot-item.conflict .item-notes {
		color: #d55;
	}
	.item-separator {
		color: #c00;
		font-weight: 700;
		margin: 0 0.2rem;
	}
	.item-entry {
		display: inline;
	}
	.slot-item .item-name {
		font-weight: 500;
	}
	.slot-item .item-notes {
		color: #777;
		font-size: 0.75rem;
		margin-left: 0.25rem;
	}
	.empty-slot {
		color: #ccc;
	}
	
	/* Other (Slotless) Items */
	.other-items {
		margin-top: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid #ddd;
	}
	.other-items h4 {
		font-size: 0.8rem;
		margin: 0 0 0.35rem;
		color: #666;
		font-weight: 600;
	}
	.other-list {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.8rem;
	}
	.other-item {
		display: flex;
		gap: 0.35rem;
		align-items: baseline;
	}
	.other-item .item-name {
		font-weight: 500;
	}
	.other-item .item-notes {
		color: #777;
		font-size: 0.75rem;
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

	/* Edit form */
	.btn-edit {
		background: none;
		border: none;
		cursor: pointer;
		color: #999;
		font-size: 0.8rem;
		padding: 0 0.2rem;
		line-height: 1;
		vertical-align: middle;
	}
	.btn-edit:hover {
		color: #555;
	}
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: 0.25rem 0;
		padding: 0.4rem;
		background: #f0f4ff;
		border: 1px solid #b0c0e8;
		border-radius: 4px;
		font-size: 0.8rem;
	}
	.edit-name {
		width: 100%;
		font-size: 0.82rem;
		padding: 0.2rem 0.35rem;
		border: 1px solid #b0c0e8;
		border-radius: 3px;
		box-sizing: border-box;
	}
	.edit-effects {
		width: 100%;
		font-size: 0.78rem;
		font-family: monospace;
		padding: 0.2rem 0.35rem;
		border: 1px solid #b0c0e8;
		border-radius: 3px;
		box-sizing: border-box;
		resize: vertical;
	}
	.edit-actions {
		display: flex;
		gap: 0.4rem;
	}
	.btn-save {
		padding: 0.2rem 0.6rem;
		background: #2a6;
		color: #fff;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.78rem;
	}
	.btn-save:hover {
		background: #1a5;
	}
	.btn-cancel {
		padding: 0.2rem 0.6rem;
		background: #888;
		color: #fff;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.78rem;
	}
	.btn-cancel:hover {
		background: #666;
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
