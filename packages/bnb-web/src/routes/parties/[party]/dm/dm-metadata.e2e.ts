import { expect, test, type Page } from '@playwright/test';

async function openInventoryTab(page: Page, party: string) {
	await page.goto(`/parties/${party}/dm`);
	const inventoryTab = page.getByRole('button', { name: 'Inventory' });

	// The tab is driven by client state, so wait for hydration to pick up the click.
	await expect(async () => {
		await inventoryTab.click();
		await expect(page.locator('.inventory-table')).toBeVisible({ timeout: 1_000 });
	}).toPass();
}

test('enriches the DM inventory from the party-scoped metadata file', async ({ page }) => {
	await openInventoryTab(page, 'beefy-boys');

	// Item 209 is only described this richly in beefy-boys' item-metadata.yaml:
	// the character YAML carries the ID, not the value or aura.
	const row = page.locator('.inventory-table tbody tr', {
		has: page.locator('.id-cell', { hasText: /^209$/ })
	});

	await expect(row.locator('.description-cell').nth(1)).toHaveText('Bastard Sword +2 Giant-Bane');
	await expect(row.locator('.aura-strength-cell')).toHaveText('moderate');
	await expect(row.locator('.aura-type-cell')).toHaveText('transmutation');
	await expect(row.locator('td.numeric').nth(2)).toHaveText('18335');
});

test('warns about items that have no unique ID', async ({ page }) => {
	await openInventoryTab(page, 'beefy-boys');

	// Runa's inventory rows still carry prices where the ID belongs.
	const warning = page.getByRole('status').filter({ hasText: 'Missing item IDs:' });
	await expect(warning).toContainText('no unique ID');
	await expect(warning).toContainText('Runa Frostwhisper');

	// Those rows render a dash rather than a negative placeholder ID.
	const runaRow = page.locator('.inventory-table tbody tr', {
		has: page.locator('.pc-cell', { hasText: 'Runa Frostwhisper' })
	});
	await expect(runaRow.first().locator('.id-cell .no-id')).toHaveText('—');
	await expect(page.locator('.inventory-table .id-cell', { hasText: '-1' })).toHaveCount(0);
});

test('keeps the warning when the view is filtered', async ({ page }) => {
	await openInventoryTab(page, 'beefy-boys');

	// The warning describes the party's data, so narrowing the view to rows that
	// all have IDs must not imply the problem is gone.
	await page.locator('.filter-select').first().selectOption('Landorf');

	await expect(page.getByRole('status').filter({ hasText: 'Missing item IDs:' })).toBeVisible();
});

test('does not apply one party metadata to another', async ({ page }) => {
	await openInventoryTab(page, 'brainy-boys');

	// Brainy Boys have no metadata file of their own, so nothing may leak in from
	// Beefy Boys even though both would share item IDs.
	await expect(page.locator('.inventory-table tbody tr')).toHaveCount(0);
	await expect(page.getByText('Bastard Sword +2 Giant-Bane')).toHaveCount(0);

	// No items at all means nothing to warn about.
	await expect(page.getByRole('status').filter({ hasText: 'Missing item IDs:' })).toHaveCount(0);
});
