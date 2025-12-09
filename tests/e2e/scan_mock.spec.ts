import { test, expect } from '@playwright/test';

test.describe('Mocked Scan Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Debug: Log all requests
        page.on('request', req => console.log('>> ' + req.method() + ' ' + req.url().substring(0, 100)));
        page.on('requestfailed', req => console.log('!! FAILED ' + req.url().substring(0, 100) + ' ' + req.failure()?.errorText));
        // Disable noisy page logs
        page.on('console', msg => {
            if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text().substring(0, 200));
        });

        // Setup Config: English, Gemini Mode, Dummy API Key
        await page.addInitScript(() => {
            localStorage.setItem('vcard-lang', '"en"');
            localStorage.setItem('vcard_ocr_method', 'gemini');
            // Correct key is 'llm_config' used by useLLMConfig hook
            localStorage.setItem('llm_config', JSON.stringify({
                provider: 'google',
                googleApiKey: 'AIzaSyDUMMYKEY1234567890'
            }));
        });

        // Mock the Gemini API Response
        // Use very broad wildcard to ensure capture
        await page.route('**/*generateContent*', async route => {
            console.log('Intercepted Gemini Request:', route.request().url());
            const json = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    // The app expects a raw VCard string
                                    text: "BEGIN:VCARD\nVERSION:3.0\nN:Power;Max;;;\nFN:Max Power\nORG:Power Corp\nEMAIL:max@power.com\nTEL;TYPE=WORK:+1 555 0199\nEND:VCARD"
                                }
                            ]
                        }
                    }
                ]
            };
            await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify(json)
            });
        });

        await page.goto('/');
    });

    test('should upload image, call mocked API, and display results', async ({ page }) => {
        // 1. Open Batch Upload Sidebar
        const uploadBtn = page.getByTestId('batch-upload-trigger');
        await uploadBtn.click();

        // Wait for Sidebar to open
        const sidebar = page.getByTestId('batch-upload-sidebar');
        await expect(sidebar).toBeVisible();

        // 2. Upload Dummy Image (via FileChooser)
        const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

        // Setup file chooser interception
        const fileChooserPromise = page.waitForEvent('filechooser');

        // Click the drop zone (border-dashed container) to trigger file picker
        // Use dispatchEvent to bypass "outside viewport" issues with fixed sidebar
        await sidebar.getByTestId('batch-dropzone').dispatchEvent('click');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({
            name: 'card.jpg',
            mimeType: 'image/jpeg',
            buffer: buffer
        });

        // 3. Start Processing
        // Wait for Start button to appear (implies selection success)
        const startBtn = sidebar.locator('button').filter({ hasText: /(Start|Convert|Verarbeiten)/i }).first();
        await expect(startBtn).toBeVisible({ timeout: 5000 });
        await startBtn.click();

        // 4. Verify Processing State
        // A toast or queue indicator should appear
        await expect(page.getByText(/(Processing|Verarbeite)/i).first()).toBeVisible({ timeout: 5000 });

        // 5. Verify Result
        // The mocked response should populate the VCard Editor/Preview.
        // Name: Max Power
        // Org: Power Corp
        await expect(page.locator('input[value="Max Power"]')).toBeVisible({ timeout: 20000 });
        await expect(page.locator('input[value="Power Corp"]')).toBeVisible();
    });
});
