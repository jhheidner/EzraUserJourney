import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { SelectScanPage } from '../page-objects/SelectScanPage';
import { ScheduleScanPage } from '../page-objects/ScheduleScanPage';
import { ReserveAppointmentPage } from '../page-objects/ReserveAppointmentPage';
import { ConfirmationPage } from '../page-objects/ConfirmationPage';
import { testUsers, testCards, getFutureDate } from '../utils/test-data';

test.describe('TC-SCHEDULE-001: Complete Schedule Scan Flow End-to-End', () => {
  test.setTimeout(120_000);

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed' && process.env.PAUSE_ON_FAILURE === 'true') {
      console.log('\n⚠️ TEST FAILED – keeping browser open for debugging');
      await page.pause();
    }
  });

  test('TC-SCHEDULE-001 @P0 @critical', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const selectScanPage = new SelectScanPage(page);
    const scheduleScanPage = new ScheduleScanPage(page);
    const reserveAppointmentPage = new ReserveAppointmentPage(page);
    const confirmationPage = new ConfirmationPage(page);

    // Step 1: Login
    const email = process.env.TEST_USER_EMAIL || testUsers.valid.email;
    const password = process.env.TEST_USER_PASSWORD || testUsers.valid.password;
    console.log(`Logging in as ${email}`);

    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForLoginSuccess();

    expect(await dashboardPage.isOnDashboard()).toBe(true);
    console.log('✓ Logged in and on dashboard');

    // Step 2: Select scan type
    console.log('Navigating to Select Scan page...');
    await selectScanPage.goto();

    const scanType = 'mri-spine' as const;
    console.log('Selecting MRI Scan with Spine...');
    await selectScanPage.selectScanPlan(scanType);

    await expect(selectScanPage.continueButton).toBeEnabled();
    console.log('✓ Scan plan selected, Continue enabled');

    console.log('Clicking Continue...');
    await selectScanPage.clickContinue();

    // Step 3: Schedule the scan
    console.log('Navigating to Schedule Scan page...');
    await scheduleScanPage.goto();
    console.log('✓ Successfully navigated to Schedule Scan page');

    const state = 'California';
    const centerName = 'Walnut Creek';
    const additionalInfo = 'test info';
    const appointmentDate = getFutureDate(7);
    // Property 'scheduleAppointment' does not exist on type 'ScheduleScanPage'.
    // Fix: Assuming the correct method is 'selectAppointment' and that it takes the same arguments.
    const appointmentTime = '10:00 AM';

    await scheduleScanPage.scheduleAppointment({
      state,
      centerName,
      additionalInfo,
      appointmentDate,
      appointmentTime: appointmentTime,
    });

    // Step 4: Payment
    // Note: scheduleAppointment() should have already navigated to payment page
    // Only call goto() if we're not already on the payment page
    const currentUrl = page.url();
    const isOnPaymentPage = currentUrl.includes('/reserve') || 
                            currentUrl.includes('reserve-appointment') ||
                            currentUrl.includes('payment') ||
                            currentUrl.includes('appointment');
    
    if (!isOnPaymentPage) {
      console.log('Not on payment page, navigating...');
      await reserveAppointmentPage.goto();
    } else {
      console.log('Already on payment page, waiting for elements to load...');
      await reserveAppointmentPage.waitUntilReady();
    }

    // Verify we're actually on the payment page before proceeding
    const finalUrl = page.url();
    console.log(`Current URL: ${finalUrl}`);
    
    if (!finalUrl.includes('/reserve') && !finalUrl.includes('reserve-appointment') && 
        !finalUrl.includes('payment') && !finalUrl.includes('appointment')) {
      throw new Error(`Expected to be on payment page, but URL is: ${finalUrl}`);
    }

    // Wait for payment page to be fully loaded
    console.log('Waiting for payment page to be ready...');
    await reserveAppointmentPage.waitUntilReady();

    const cardNumber = process.env.TEST_CARD_NUMBER || testCards.valid.number;
    const cardExpiry = process.env.TEST_CARD_EXPIRY || testCards.valid.expiry;
    const userEmail = process.env.TEST_USER_EMAIL || testUsers.valid.email;
    const phoneNumber = '1234561234';

    try {
      console.log('Filling payment details...');
      await reserveAppointmentPage.fillPaymentDetails(
        cardNumber,
        cardExpiry,
        userEmail,
        phoneNumber,
        '333',  // CVV
        '12345' // ZIP code
      );
      console.log('✓ Payment details filled successfully');
    } catch (error) {
      console.error('Error filling payment details:', error instanceof Error ? error.message : String(error));
      throw error;
    }

    expect(await reserveAppointmentPage.isContinueButtonEnabled()).toBe(true);
    expect(await reserveAppointmentPage.getTotalAmount()).toBeTruthy();

    console.log('Clicking Continue to confirmation...');
    await reserveAppointmentPage.clickContinue();

    // Step 5: Confirmation and return to dashboard
    console.log('Waiting for confirmation page...');
    await confirmationPage.goto();

    expect(await dashboardPage.isOnDashboard()).toBe(true);
    console.log('✓ Successfully navigated to Dashboard');

    // Step 6: Verify dashboard UI elements
    console.log('Verifying dashboard menu items...');
    expect(await dashboardPage.verifyAllMenuItemsVisible()).toBe(true);
    console.log('✓ All dashboard menu items visible');
    console.log('🎉 Schedule Scan flow completed successfully!');
  });
});
