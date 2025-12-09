import { test, expect } from '@playwright/test';

test.describe('Sanity Checks', () => {
    test.beforeEach(async ({ page }) => {
        // Force English language for consistent selectors
        await page.addInitScript(() => {
            localStorage.setItem('vcard-lang', '"en"');
        });
    });

    test('should allow manual text entry and saving to history', async ({ page }) => {
        await page.goto('/');

        // 1. Check Title (regex for flexibility)
        await expect(page).toHaveTitle(/Kontakte/);

        // 2. Switch to Text Editor
        const textTab = page.getByRole('button', { name: /(Enter Text|Kontaktdaten)/i });
        await textTab.click();

        // 3. Enter Sample Data
        // Placeholder also varies: "Paste your email signature" vs "Fügen Sie hier..."
        const editor = page.locator('textarea').first(); // More robust than placeholder
        await editor.fill('Max Mustermann\nMusterfirma GmbH\n0123 456789');

        // 4. Verify Preview Updates (Parser runs)
        // The PreviewCard should show "Max Mustermann"
        // Using locator with value attribute as fallback
        await expect(page.locator('input[value="Max Mustermann"]')).toBeVisible();
        await expect(page.locator('input[value="Musterfirma GmbH"]')).toBeVisible();

        // 5. Save to History
        const saveBtn = page.getByRole('button', { name: /(Save to History|In Verlauf speichern)/i });
        await saveBtn.click();

        // 6. Verify Toast (Optional, but good practice)
        await expect(page.getByText(/(Saved to history|In Verlauf speichern)/i)).toBeVisible({ timeout: 5000 }).catch(() => {
            // Continue if toast is missed or different text, main check is sidebar
        });

        // 7. Open History and Check if item is in list
        // Target the button in the header explicitly
        const historyBtn = page.locator('header button').filter({ hasText: /(History|Verlauf)/i }).first();
        // Use force: true to bypass potential toast overlays or tooltips
        await historyBtn.click({ force: true });

        // Wait for sidebar animation
        await page.waitForTimeout(500);

        // Check for the item in the sidebar list
        const historyEntry = page.getByText('Max Mustermann').first();
        await expect(historyEntry).toBeVisible();

        // 8. Verify Export Functionality
        // Click the "VCF Backup" button in the History sidebar
        const exportBtn = page.getByRole('button', { name: /(VCF Backup|VCF)/i }).first();

        // Setup download listener
        const downloadPromise = page.waitForEvent('download');
        // Mobile view might overlay elements, so force click
        await exportBtn.click({ force: true });
        const download = await downloadPromise;

        // Verify filename exists and has extension
        const filename = download.suggestedFilename();
        expect(filename).toBeTruthy();
        expect(filename).toContain('.vcf');

        // 9. Verify History Persistence (IndexedDB)
        console.log('Reloading page to verify IndexedDB persistence...');
        await page.reload();

        // Open History again
        await page.locator('header button').filter({ hasText: /(History|Verlauf)/i }).first().click({ force: true });

        // Check for the item again
        await expect(page.getByText('Max Mustermann').first()).toBeVisible();
    });
});
