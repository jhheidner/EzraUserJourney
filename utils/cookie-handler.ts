import { Page, Locator } from '@playwright/test';

/**
 * Cookie Consent Handler
 * 
 * Utility to handle cookie consent pop-ups that appear on the site.
 * This should be called before interacting with page elements.
 */

/**
 * Accept cookie consent pop-up if present
 * @param page Playwright page object
 */
export async function acceptCookies(page: Page): Promise<void> {
  try {
    // First, quickly check if a cookie pop-up exists at all
    // This avoids unnecessary checks if there's no pop-up
    const cookiePopup = page.locator('.cookie-consent, [role="dialog"], .cookie-banner, .cookie-popup').first();
    const isPopupVisible = await cookiePopup.isVisible({ timeout: 500 }).catch(() => false);
    
    // If no pop-up container found, check for accept button directly (but quickly)
    if (!isPopupVisible) {
      const quickAcceptCheck = page.locator('button:has-text("Accept"), button:has-text("Accept All")').first();
      const hasAcceptButton = await quickAcceptCheck.isVisible({ timeout: 500 }).catch(() => false);
      
      if (!hasAcceptButton) {
        // No cookie pop-up found, exit early
        return;
      }
    }
    
    // Cookie pop-up exists, now handle it
    // Try multiple selectors for the Accept button
    const acceptButtonSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      '[data-testid="cookie-accept"]',
      '.cookie-consent button:has-text("Accept")',
      'button[aria-label*="Accept"]',
      'button[aria-label*="accept"]',
    ];
    
    for (const selector of acceptButtonSelectors) {
      const acceptButton = page.locator(selector).first();
      const isVisible = await acceptButton.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        await acceptButton.click();
        // Wait for pop-up to disappear
        await page.waitForTimeout(500);
        return;
      }
    }
    
    // If no Accept button found in main selectors, try within pop-up container
    if (isPopupVisible) {
      const acceptInPopup = cookiePopup.locator('button:has-text("Accept"), button:has-text("Accept All")').first();
      const isAcceptVisible = await acceptInPopup.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isAcceptVisible) {
        await acceptInPopup.click();
        await page.waitForTimeout(500);
        return;
      }
    }
  } catch (error) {
    // If cookie pop-up doesn't exist or can't be clicked, that's okay
    // Just continue with the test silently
  }
}

/**
 * Check if cookie consent pop-up is visible
 * @param page Playwright page object
 * @returns true if cookie pop-up is visible
 */
export async function isCookiePopupVisible(page: Page): Promise<boolean> {
  try {
    const cookiePopup = page.locator(
      '.cookie-consent, [role="dialog"], .cookie-banner, button:has-text("Accept")'
    ).first();
    return await cookiePopup.isVisible().catch(() => false);
  } catch {
    return false;
  }
}

