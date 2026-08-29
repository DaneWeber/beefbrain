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
	await page.getByRole('button', { name: 'Detailed' }).click();
	await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Magic Item Slots' })).toBeVisible();
}

test('editing strength item recalculates ability and grapple values', async ({ page }) => {
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

	const strengthRow = page.locator('.ability-table tbody tr', {
		has: page.locator('td.ability-name', { hasText: 'Strength' })
	});
	await expect(strengthRow).toContainText('24');
	await expect(strengthRow).toContainText('+7');

	const grappleRow = page.locator('.stat-row', {
		has: page.locator('.label', { hasText: 'Grapple' })
	});
	await expect(grappleRow).toContainText('+24');
	await expect(grappleRow).toContainText('str: 7');
});

test('editing resistance item propagates to all saving throws', async ({ page }) => {
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

	const fortitudeRow = page.locator('.stat-row', {
		has: page.locator('.label', { hasText: 'Fortitude' })
	});
	const reflexRow = page.locator('.stat-row', {
		has: page.locator('.label', { hasText: 'Reflex' })
	});
	const willRow = page.locator('.stat-row', {
		has: page.locator('.label', { hasText: 'Will' })
	});

	await expect(fortitudeRow).toContainText('+13');
	await expect(reflexRow).toContainText('+8');
	await expect(willRow).toContainText('+6');
	await expect(fortitudeRow).toContainText('cloak-resistance: 3');
	await expect(reflexRow).toContainText('cloak-resistance: 3');
	await expect(willRow).toContainText('cloak-resistance: 3');
});
