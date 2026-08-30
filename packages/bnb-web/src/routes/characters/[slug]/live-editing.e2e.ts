import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const slug = 'ryan-landorf';
const sourceYamlPath = resolve(
	process.cwd(),
	'../../reference_material/beefy_boys_spreadsheets/yaml',
	`${slug}.yaml`
);
const testYamlPath = resolve(process.cwd(), '.playwright-data/yaml', `${slug}.yaml`);

test.beforeEach(async () => {
	const baseline = await readFile(sourceYamlPath, 'utf-8');
	await writeFile(testYamlPath, baseline, 'utf-8');
});

async function openDetailedSheetFor(page: Page) {
	await page.goto(`/characters/${slug}`);
	const detailedButton = page.getByRole('button', { name: 'Detailed' });
	const firstEditButton = page.locator('.slot-row .btn-edit').first();

	for (let attempt = 0; attempt < 10; attempt += 1) {
		await page.getByRole('button', { name: 'Play' }).click();
		await detailedButton.click();
		if (await firstEditButton.isVisible()) {
			break;
		}
		await page.waitForTimeout(250);
	}

	await expect(firstEditButton).toBeVisible({ timeout: 15_000 });
}

test('editing strength item updates slot and inventory table views', async ({ page }) => {
	await openDetailedSheetFor(page);

	const waistRow = page.locator('.slot-row', {
		has: page.locator('.slot-label', { hasText: 'Waist:' })
	});

	await expect(waistRow).toContainText("Belt of Giant's Strength +4");
	await waistRow.locator('.btn-edit').first().click();

	const editForm = waistRow.locator('form.edit-form');
	await editForm.locator('input[name="name"]').fill("Belt of Giant's Strength +6");
	await editForm.locator('textarea[name="effects"]').fill('str-enhancement: 6');
	const updateResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' &&
			response.url().includes(`/characters/${slug}`) &&
			response.url().includes('updateMagicItem')
	);
	await editForm.getByRole('button', { name: 'Save' }).click();
	const updatePayload = await (await updateResponse).json();
	expect(updatePayload, JSON.stringify(updatePayload)).toMatchObject({ type: 'success' });

	await expect(waistRow).toContainText("Belt of Giant's Strength +6");
	await expect(waistRow).toContainText('str-enhancement: 6');
	await expect(page.locator('.inv-group', { hasText: 'Equipped' })).toContainText(
		"Belt of Giant's Strength +6"
	);
});

test('editing shoulder item effects updates slot and inventory table views', async ({ page }) => {
	await openDetailedSheetFor(page);

	const shoulderRow = page.locator('.slot-row', {
		has: page.locator('.slot-label', { hasText: 'Shoulders:' })
	});

	await expect(shoulderRow).toContainText('Cloak of Resistance +1');
	await shoulderRow.locator('.btn-edit').first().click();

	const editForm = shoulderRow.locator('form.edit-form');
	await editForm.locator('textarea[name="effects"]').fill('saves-resistance: 3');
	const updateResponse = page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' &&
			response.url().includes(`/characters/${slug}`) &&
			response.url().includes('updateMagicItem')
	);
	await editForm.getByRole('button', { name: 'Save' }).click();
	const updatePayload = await (await updateResponse).json();
	expect(updatePayload, JSON.stringify(updatePayload)).toMatchObject({ type: 'success' });
	await expect(shoulderRow).toContainText('saves-resistance: 3');
	await expect(page.locator('.inv-group', { hasText: 'Equipped' })).toContainText(
		'Cloak of Resistance +1'
	);
	await expect(page.locator('.inv-group', { hasText: 'Equipped' })).toContainText(
		'saves-resistance: 3'
	);
});
