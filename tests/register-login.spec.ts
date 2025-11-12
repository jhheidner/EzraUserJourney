import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../page-objects/RegistrationPage';
import { SelectScanPage } from '../page-objects/SelectScanPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import {
  generateRandomFirstName,
  generateRandomLastName,
  generateRandomEmail,
  generateRandomPhoneNumber,
} from '../utils/test-data';
import { handleTimezonePopup } from '../utils/timezone-handler';

/**
 * Test Case: TC-REGISTER-001
 * Register Account and Login Verification
 * 
 * Priority: P0 (Critical)
 * 
 * This test validates the account registration process and verifies that
 * users can successfully register and log in to the system.
 * 
 * Business Impact: If registration fails, no new users can join = zero growth
 */
test.describe('TC-REGISTER-001: Register Account and Login Verification', () => {

  // Note: We handle timezone pop-up within the test, not in beforeEach
  // This prevents accidentally clicking buttons before the page is ready

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed' && process.env.PAUSE_ON_FAILURE === 'true') {
      console.log('\n⚠️  TEST FAILED - Browser will remain open for debugging');
      // Pause removed - use --debug flag instead for debugging
    }
  });

  test('TC-REGISTER-001: Register Account and Login Verification @P0 @critical', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);

    // Step 1: Create a new account
    const firstName = generateRandomFirstName();
    const lastName = generateRandomLastName();
    const email = generateRandomEmail();
    const phoneNumber = generateRandomPhoneNumber();
    const password = 'YourTestPassword!';

    console.log(`Creating new test account: ${email}`);
    await registrationPage.register(firstName, lastName, email, phoneNumber, password);

    // Verify registration was successful
    const isRegistered = await registrationPage.isRegistrationSuccessful();
    expect(isRegistered).toBe(true);

    // Step 2: After registration, user should land on Select a scan page
    console.log('Waiting for navigation to Select a scan page...');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for navigation to select-plan or select-scan page
    try {
      await page.waitForURL(/select-plan|select-scan|select.*plan|select.*scan/i, { timeout: 10000 });
    } catch (e) {
      // If URL wait fails, check current URL
      const currentUrl = page.url();
      console.log(`⚠ WARNING: URL wait failed. Current URL: ${currentUrl}`);
    }
    
    const selectScanPage = new SelectScanPage(page);
    
    // Verify we're on the Select a scan page (URL can be /select-plan or /select-scan)
    const currentUrl = page.url();
    const isOnSelectScanPage = currentUrl.includes('/select-plan') || 
                               currentUrl.includes('select-plan') ||
                               currentUrl.includes('/select-scan') || 
                               currentUrl.includes('select-scan');
    expect(isOnSelectScanPage).toBe(true);
    console.log('✓ Successfully landed on Select a scan page');

    // Step 3: Click Cancel button on Select a scan page
    console.log('Clicking Cancel button on Select a scan page...');
    
    // Wait for Cancel button to be visible and click it
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.waitFor({ state: 'visible', timeout: 10000 });
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();
    
    // Wait for navigation after clicking Cancel
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check URL after Cancel
    const urlAfterCancel = page.url();
    console.log(`URL after clicking Cancel: ${urlAfterCancel}`);
    
    // Step 4: Handle timezone pop-up if it appears
    console.log('Checking for timezone pop-up...');
    await handleTimezonePopup(page, 'confirm').catch(() => {
      console.log('No timezone pop-up found or already handled');
    });
    
    // Wait a moment after handling timezone pop-up
    await page.waitForTimeout(1000).catch(() => {});
    
    // Step 5: Verify user is on Dashboard or root URL
    const dashboardPage = new DashboardPage(page);
    const isOnDashboard = await dashboardPage.isOnDashboard();
    
    expect(isOnDashboard).toBe(true);
    console.log('✓ Successfully navigated to Dashboard');

    // Step 6: Verify dashboard menu items are visible
    console.log('Verifying dashboard menu items...');
    
    // Verify all menu items using DashboardPage
    console.log('Checking for Home menu item...');
    const homeVisible = await dashboardPage.verifyHomeMenuVisible();
    expect(homeVisible).toBe(true);
    console.log('✓ Home menu item found');
    
    console.log('Checking for Reports menu item...');
    const reportsVisible = await dashboardPage.verifyReportsMenuVisible();
    expect(reportsVisible).toBe(true);
    console.log('✓ Reports menu item found');
    
    console.log('Checking for Invoices menu item...');
    const invoicesVisible = await dashboardPage.verifyInvoicesMenuVisible();
    expect(invoicesVisible).toBe(true);
    console.log('✓ Invoices menu item found');
    
    console.log('Checking for Account menu item...');
    const accountVisible = await dashboardPage.verifyAccountMenuVisible();
    expect(accountVisible).toBe(true);
    console.log('✓ Account menu item found');
    
    console.log('✓ All dashboard menu items visible - registration and login verified');
    
    // Test ends here - user is successfully registered and logged in
    console.log('✓ Registration and login verification complete');
  });
});

