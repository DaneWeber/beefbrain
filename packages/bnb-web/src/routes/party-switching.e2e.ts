import { expect, test } from '@playwright/test';

test('lists every party on the home page', async ({ page }) => {
	await page.goto('/');

	await expect(page.locator('.card h2')).toHaveText(['Beefy Boys', 'Brainy Boys']);
	await page.locator('.card', { hasText: 'Brainy Boys' }).click();

	await expect(page).toHaveURL('/parties/brainy-boys');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brainy Boys');
	await expect(page.locator('.card h2')).toHaveText(['Voidan']);
});

test('switches parties from the nav switcher', async ({ page }) => {
	await page.goto('/parties/brainy-boys');

	const switcher = page.getByLabel('Switch party');
	await expect(switcher).toHaveValue('brainy-boys');

	// The switcher navigates from an onchange handler, so a selection made before
	// hydration is dropped: retry until one takes effect.
	await expect(async () => {
		await switcher.selectOption('beefy-boys');
		await expect(page).toHaveURL('/parties/beefy-boys', { timeout: 1_000 });
	}).toPass();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Beefy Boys');
	await expect(page.locator('.card h2')).toHaveText(['Landorf']);
	await expect(page.getByRole('link', { name: 'DM View' })).toHaveAttribute(
		'href',
		'/parties/beefy-boys/dm'
	);
});

test('keeps the active party while viewing a character', async ({ page }) => {
	await page.goto('/parties/beefy-boys');
	await page.locator('.card', { hasText: 'Landorf' }).click();

	await expect(page).toHaveURL('/parties/beefy-boys/characters/ryan-landorf');
	await expect(page.getByLabel('Switch party')).toHaveValue('beefy-boys');
	await expect(page.getByRole('link', { name: '← Beefy Boys' })).toBeVisible();
});

test('does not serve a character from a different party', async ({ page }) => {
	const response = await page.goto('/parties/beefy-boys/characters/voidan');
	expect(response?.status()).toBe(404);
});
