import { test, expect } from '@playwright/test';

test.describe('Settings & Persistence', () => {
    test('should persist language and theme selection across reloads', async ({ page }) => {
        // Start fresh
        await page.goto('/');

        // 1. Open Settings
        // Target specifically the header button to avoid ambiguity
        const settingsBtn = page.locator('header button').filter({ hasText: /(Settings|Einstellungen)/i }).first();
        await settingsBtn.click();

        // 2. Toggle Dark Mode
        // Look for the button that toggles mode. It usually says "Light Mode" or "Dark Mode" depending on current state.
        const themeBtn = page.getByRole('button', { name: /(Light Mode|Dark Mode)/i });

        // Ensure it is in view (Settings sidebar can be long)
        await themeBtn.scrollIntoViewIfNeeded();

        const btnText = await themeBtn.innerText();
        console.log('Theme Button Text:', btnText);

        await themeBtn.click({ force: true });

        // Wait for class application
        await page.waitForTimeout(500);

        // Check if class "dark" is applied to html element
        const isDarkNow = await page.locator('html').getAttribute('class');
        console.log('HTML Class after toggle:', isDarkNow);

        // If it was Light (default), it should now be Dark?
        // Wait, if button said "Light Mode" (meaning "Switch to Light Mode"? or "Current is Light Mode"?).
        // Standard UI: Toggle Switch usually shows "Dark Mode" label.
        // Code: {isDarkMode ? 'Dark Mode' : 'Light Mode'}
        // If isDarkMode is false (default), button says "Light Mode".
        // Clicking it sets isDarkMode(!false) -> true.
        // So clicking "Light Mode" should enable Dark Mode? 
        // Or does "Light Mode" mean "I am currently in Light Mode"?
        // Usually yes.
        // Let's assert based on the variable.

        if (btnText.includes('Light')) {
            await expect(page.locator('html')).toHaveClass(/dark/);
        } else {
            // If it was Dark, clicking makes it Light (no dark class).
            await expect(page.locator('html')).not.toHaveClass(/dark/);
        }

        // 3. Switch Language to Deutsch
        // Button text is either "Deutsch" or "English" depending on current lang.
        // Or it's a toggle button that shows the *active* one?
        // Code: {lang === 'de' ? 'Deutsch' : 'English'}
        // If we are in EN, it says "English". Clicking it toggles to DE.
        // So we click "English" (if present) to switch to "Deutsch"?
        // Wait, if text is "English", does it mean "Switch to English" or "Current is English"?
        // Usually buttons show *Action* or *Current State*.
        // Let's assume it shows current state and toggles.
        // So if we see "English", clicking it makes it "Deutsch".
        // Let's try to click the language button. 
        const langBtn = page.locator('button').filter({ hasText: /(English|Deutsch)/ }).first();
        // If it's English, click it. 
        if (await langBtn.innerText() === 'English') {
            await langBtn.click();
        } else {
            // Already Deutsch? Then ensure we are consistent.
            // If it says Deutsch, clicking makes it English.
            // We want to TEST persistence. So let's flip it.
            await langBtn.click();
        }

        // Wait for UI update
        await page.waitForTimeout(500);

        // Capture state
        const isDark = await page.locator('html').getAttribute('class');
        const titleText = await page.getByRole('heading', { level: 3 }).first().innerText(); // "Settings" or "Einstellungen"

        // 4. Reload
        await page.reload();

        // 5. Verify Persistence
        // Theme
        await expect(page.locator('html')).toHaveClass(isDark || '');

        // Language
        // Open settings again to check title or check header
        await page.locator('header button').filter({ hasText: /(Settings|Einstellungen)/i }).first().click();
        const newTitleText = await page.getByRole('heading', { level: 3 }).first().innerText();
        expect(newTitleText).toBe(titleText);
    });
});
