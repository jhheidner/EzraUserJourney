import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../page-objects/RegistrationPage';
import { SelectScanPage } from '../page-objects/SelectScanPage';
import { ScheduleScanPage } from '../page-objects/ScheduleScanPage';
import { ReserveAppointmentPage } from '../page-objects/ReserveAppointmentPage';
import { ConfirmationPage } from '../page-objects/ConfirmationPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { acceptCookies } from '../utils/cookie-handler';
import {
  generateRandomFirstName,
  generateRandomLastName,
  generateRandomEmail,
  generateRandomPhoneNumber,
  testCards,
  getFutureDate,
} from '../utils/test-data';

test.describe('TC-E2E-REGISTER-SCHEDULE-001: Register and Complete Booking Flow', () => {
  test.setTimeout(150_000);

  test('TC-E2E-REGISTER-SCHEDULE-001 @P0 @critical', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const selectScanPage = new SelectScanPage(page);
    const scheduleScanPage = new ScheduleScanPage(page);
    const reserveAppointmentPage = new ReserveAppointmentPage(page);
    const confirmationPage = new ConfirmationPage(page);
    const dashboardPage = new DashboardPage(page);

    // Step 1: Register a brand-new account
    const firstName = generateRandomFirstName();
    const lastName = generateRandomLastName();
    const email = generateRandomEmail();
    const phoneNumber = generateRandomPhoneNumber();
    const rawDigitsPhone = phoneNumber.replace(/\D/g, '').slice(0, 10) || '5555551212';
    const password = 'YourTestPassword!';

    console.log(`Registering new user: ${email}`);
    await registrationPage.register(firstName, lastName, email, phoneNumber, password);

    expect(await registrationPage.isRegistrationSuccessful()).toBe(true);
    console.log('✓ Registration successful, proceeding to booking flow');

    // Step 2: Select a scan plan
    await page.waitForLoadState('domcontentloaded');
    await selectScanPage.selectScanPlan('mri-spine');
    await acceptCookies(page).catch(() => {});
    await selectScanPage.completeIntakeIfPresent({
      dateOfBirth: '01-01-1990',
      sexAtBirth: 'Female',
    });

    await expect(selectScanPage.continueButton).toBeEnabled({ timeout: 15000 });
    console.log('✓ Scan plan ready, clicking Continue');
    await selectScanPage.clickContinue();

    // Step 3: Schedule the scan
    await scheduleScanPage.goto();
    await scheduleScanPage.scheduleAppointment({
      state: 'California',
      centerName: 'Walnut Creek',
      additionalInfo: 'New user end-to-end flow',
      appointmentDate: getFutureDate(7),
      appointmentTime: '10:00 AM',
    });

    console.log('✓ Scheduling complete, on payment page');

    // Step 4: Complete payment using standard test card
    const card = testCards.valid;
    await reserveAppointmentPage.waitUntilReady();
    await reserveAppointmentPage.fillPaymentDetails(
      card.number,
      card.expiry,
      email,
      rawDigitsPhone,
      card.cvv,
      '12345'
    );

    expect(await reserveAppointmentPage.isContinueButtonEnabled()).toBe(true);
    await reserveAppointmentPage.clickContinue();

    // Step 5: Confirm booking and verify dashboard
    await confirmationPage.goto();
    expect(await dashboardPage.isOnDashboard()).toBe(true);
    console.log('✓ Returned to dashboard after confirmation');

    // Optional: sanity check dashboard menus
    await expect(async () => {
      const menusVisible = await dashboardPage.verifyAllMenuItemsVisible();
      expect(menusVisible).toBe(true);
    }).toPass();
  });
});

