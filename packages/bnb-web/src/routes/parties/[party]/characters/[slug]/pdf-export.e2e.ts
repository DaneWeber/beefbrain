import { expect, test, type Page } from '@playwright/test';

const party = 'beefy-boys';
const slug = 'ryan-landorf';
const pdfRoute = '**/characters/*/pdf?*';

/**
 * The export button is server-rendered but inert until the client bundle
 * hydrates, and only the view toggle shows when that has happened.
 */
async function waitForHydration(page: Page) {
	const detailed = page.getByRole('button', { name: 'Detailed' });
	await expect(async () => {
		await detailed.click();
		await expect(detailed).toHaveClass(/active/);
	}).toPass({ timeout: 30_000 });
	await page.getByRole('button', { name: 'Play' }).click();
}

test('downloads a compiled PDF for the selected template', async ({ page }) => {
	test.setTimeout(60_000);

	// The CI runner has no TeX install, so the compiled bytes are stubbed here;
	// the real pdflatex run is covered by the characters.latex unit tests.
	await page.route(pdfRoute, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/pdf',
			headers: { 'content-disposition': `attachment; filename="${slug}-dnd35-detailed.pdf"` },
			body: '%PDF-1.7 stub'
		})
	);

	await page.goto(`/parties/${party}/characters/${slug}`);
	await waitForHydration(page);

	await page.locator('.latex-export select').selectOption('dnd35-detailed');

	const [request, download] = await Promise.all([
		page.waitForRequest(pdfRoute),
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'Download PDF' }).click()
	]);

	expect(request.url()).toContain('template=dnd35-detailed');
	expect(download.suggestedFilename()).toBe(`${slug}-dnd35-detailed.pdf`);
	await expect(page.locator('.pdf-error')).toHaveCount(0);
});

test('reports a compile failure without leaving the sheet', async ({ page }) => {
	test.setTimeout(60_000);

	await page.route(pdfRoute, (route) =>
		route.fulfill({
			status: 503,
			contentType: 'application/json',
			body: JSON.stringify({ message: 'No LaTeX compiler on the server.' })
		})
	);

	await page.goto(`/parties/${party}/characters/${slug}`);
	await waitForHydration(page);

	const button = page.getByRole('button', { name: 'Download PDF' });
	await button.click();

	await expect(page.getByRole('alert')).toContainText('No LaTeX compiler on the server.');
	await expect(button).toBeEnabled();
	await expect(page).toHaveURL(new RegExp(`/characters/${slug}$`));
});
