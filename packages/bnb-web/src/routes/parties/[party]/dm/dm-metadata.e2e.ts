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

test('does not apply one party metadata to another', async ({ page }) => {
	await openInventoryTab(page, 'brainy-boys');

	// Brainy Boys have no metadata file of their own, so nothing may leak in from
	// Beefy Boys even though both would share item IDs.
	await expect(page.locator('.inventory-table tbody tr')).toHaveCount(0);
	await expect(page.getByText('Bastard Sword +2 Giant-Bane')).toHaveCount(0);
});
