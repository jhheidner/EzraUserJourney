import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { SelectScanPage } from '../page-objects/SelectScanPage';
import { ScheduleScanPage } from '../page-objects/ScheduleScanPage';
import { ReserveAppointmentPage } from '../page-objects/ReserveAppointmentPage';
import { testUsers, testCards, getFutureDate } from '../utils/test-data';

test.describe('TC-SCHEDULE-002: Declined Card Handling', () => {
  test.setTimeout(120_000);

  test('TC-SCHEDULE-002 @P0 @critical - surfaces decline message and blocks flow', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const selectScanPage = new SelectScanPage(page);
    const scheduleScanPage = new ScheduleScanPage(page);
    const reserveAppointmentPage = new ReserveAppointmentPage(page);

    // Step 1: Login
    const email = process.env.TEST_USER_EMAIL || testUsers.valid.email;
    const password = process.env.TEST_USER_PASSWORD || testUsers.valid.password;
    console.log(`Logging in as ${email} for decline scenario`);

    await loginPage.goto();
    await loginPage.login(email, password);
    await loginPage.waitForLoginSuccess();
    expect(await dashboardPage.isOnDashboard()).toBe(true);

    // Step 2: Select scan plan
    console.log('Navigating to Select Scan page (decline scenario)...');
    await selectScanPage.goto();
    await selectScanPage.selectScanPlan('mri-spine');
    await expect(selectScanPage.continueButton).toBeEnabled();
    await selectScanPage.clickContinue();

    // Step 3: Schedule scan
    await scheduleScanPage.goto();
    await scheduleScanPage.scheduleAppointment({
      state: 'California',
      centerName: 'Walnut Creek',
      additionalInfo: 'decline scenario',
      appointmentDate: getFutureDate(7),
      appointmentTime: '10:00 AM',
    });

    // Step 4: Ensure we are on payment page
    const isOnPaymentPage = page.url().includes('/reserve') ||
      page.url().includes('reserve-appointment') ||
      page.url().includes('payment');
    if (!isOnPaymentPage) {
      await reserveAppointmentPage.goto();
    } else {
      await reserveAppointmentPage.waitUntilReady();
    }
    await reserveAppointmentPage.waitUntilReady();

    // Step 5: Attempt payment with declining card
    const declinedCard = testCards.declined;
    const phoneNumber = '1234561234';
    console.log('Submitting declined card details...');
    await reserveAppointmentPage.fillPaymentDetails(
      declinedCard.number,
      declinedCard.expiry,
      email,
      phoneNumber,
      declinedCard.cvv,
      '12345'
    );

    console.log('Clicking Continue to trigger decline...');
    await reserveAppointmentPage.clickContinue();

    // Step 6: Validate error surfaced and flow blocked
    await expect(page).toHaveURL(/reserve-appointment/);

    const declineMessage = page.getByText(/card (was|has been) declined/i, { exact: false });
    await expect(declineMessage).toBeVisible({ timeout: 15000 });

    await expect(reserveAppointmentPage.continueButton).toBeEnabled();
    console.log('✓ Decline message displayed and user kept on payment page');
  });
});

