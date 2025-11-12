import { Page, Locator, expect } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';

export class ScheduleScanPage {
  readonly page: Page;
  readonly additionalInfoInput: Locator;
  readonly dateInput: Locator;
  readonly timeSlotsContainer: Locator;
  readonly continueButton: Locator;
  readonly stateDropdown: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use more flexible selectors that match actual page structure
    this.additionalInfoInput = page.locator('textarea').filter({ 
      hasText: /additional|scheduling|details/i 
    }).or(
      page.getByPlaceholder(/additional|scheduling|details/i)
    ).or(
      page.locator('textarea').first()
    );
    this.dateInput = page.locator('input[type="date"], input[placeholder*="date" i], [data-testid*="date"]').first();
    this.timeSlotsContainer = page.locator('.time-slot, [data-testid="time-slot"]');
    this.continueButton = page.locator('[data-test="submit"]').first();
    this.stateDropdown = page.locator('[role="combobox"]');
  }

  /** Navigate to Schedule Scan page */
  async goto() {
    if (!this.page.url().includes('/schedule')) {
      console.log('Navigating to Schedule Scan page...');
      await this.page.goto('/schedule');
      await this.page.waitForLoadState('domcontentloaded');
      await acceptCookies(this.page).catch(() => {});
    }
  }

  /** Select a state and wait for centers to load */
  async selectState(state: string) {
    console.log(`Selecting state: ${state}`);

    await this.stateDropdown.click();
    const option = this.page.getByRole('option', { name: state });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    // Wait for at least one center to be visible (centers have "View on map" links)
    const firstCenter = this.page.locator('text=/View on map/i').first().locator('..').locator('..');
    await expect(firstCenter).toBeVisible({ timeout: 20000 });

    console.log('State selected and centers loaded');
  }

  /** Select a center by name dynamically */
  async selectCenter(centerName: string) {
    console.log(`Selecting center: ${centerName}`);

    // FIRST: Check if the calendar is already visible (center may already be selected)
    // Use longer timeout to ensure we don't miss an already-loaded calendar
    const calendarAlreadyVisible = await this.page
      .getByRole('button', { name: /^[MTWFS]\s+\d+$/ })
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    
    if (calendarAlreadyVisible) {
      console.log('✓ Calendar already visible - center already selected, skipping click');
      return;
    }

    console.log('Calendar not visible yet, selecting center...');

    // Check if center exists
    const centerOption = this.page.getByText(centerName, { exact: false }).first();
    const isVisible = await centerOption.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isVisible) {
      throw new Error(`Center "${centerName}" not found. Make sure you've selected the correct state that contains this center.`);
    }

    await centerOption.scrollIntoViewIfNeeded();
    
    // Click the center card (parent of the paragraph with center name)
    const centerCard = centerOption.locator('..').locator('..');
    
    // Wait for the card to be ready for interaction
    await centerCard.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(500);
    
    // Click the center card
    await centerCard.click({ timeout: 5000 });
    
    // Wait for network requests to complete
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Check if address selection is needed (some centers have multiple addresses)
    const addressOptions = this.page.locator('text=/Recommended|AMRIC|mi/i');
    const hasAddressOptions = await addressOptions.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasAddressOptions) {
      console.log('Address options found, selecting first available address...');
      await addressOptions.first().click({ timeout: 5000 });
      await this.page.waitForTimeout(1000);
    }

    // Wait for form to appear - look for calendar date buttons
    const dateButton = this.page.getByRole('button', { name: /^[MTWFS]\s+\d+$/ });
    await dateButton.first().waitFor({ state: 'visible', timeout: 15000 });
    console.log('✓ Calendar form is ready');

    console.log('Center selected and form is ready');
  }

  /** Fill scheduling details and select a time slot - SIMPLIFIED VERSION */
  async scheduleAppointment(slot: {
    state: string;
    centerName: string;
    additionalInfo: string;
    appointmentDate: string;
    appointmentTime: string;
  }) {
    const { state, centerName, additionalInfo, appointmentTime } = slot;

    // Step 1: Select state and center
    await this.selectState(state);
    await this.selectCenter(centerName);

    // Step 2: Wait for calendar to be ready
    await this.page.waitForSelector('button[aria-label*="November"], button:has-text("November 2025")', { 
      state: 'visible', 
      timeout: 15000 
    });

    // Step 3: Fill additional info if available
    const textarea = this.page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textarea.fill(additionalInfo);
      console.log('✓ Additional info entered');
    }

    // Step 4: Select ANY available date (simplest approach)
    console.log('Selecting first available date...');

    // Try known good dates first (from user testing: W 26, T 20, etc)
    const knownGoodDates = ['W 26', 'T 20', 'W 19', 'T 21', 'F 28', 'M 24', 'T 25'];
    
    let dateClicked = false;
    
    // Try known good dates first
    for (const dateName of knownGoodDates) {
      try {
        const dateBtn = this.page.getByRole('button', { name: dateName });
        const isVisible = await dateBtn.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (!isVisible) continue;
        
        console.log(`Trying known good date: ${dateName}`);
        await dateBtn.click();
        await this.page.waitForTimeout(1000);
        
        // Wait for time slots to appear
        const timeSlotAppeared = await this.page
          .locator('text=/\\d+:\\d+\\s*(AM|PM)/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        
        if (timeSlotAppeared) {
          console.log(`✓ Date selected: ${dateName} (time slots visible)`);
          dateClicked = true;
          break;
        }
        
        console.log(`Date ${dateName} clicked but no time slots`);
      } catch (e) {
        continue;
      }
    }
    
    // If known dates didn't work, try scanning from middle of calendar
    if (!dateClicked) {
      console.log('Known dates not available, scanning calendar...');
      const allDateButtons = this.page.getByRole('button', { name: /^[MTWFS]\s+\d+$/ });
      const dateButtonCount = await allDateButtons.count();
      console.log(`Found ${dateButtonCount} total date buttons`);

      // Skip the first several dates which are likely past/unavailable
      const startIndex = Math.min(5, Math.floor(dateButtonCount / 3));
      console.log(`Starting from date index ${startIndex}`);

      // Try dates from middle onwards
      for (let i = startIndex; i < Math.min(dateButtonCount, startIndex + 15); i++) {
        try {
          const dateBtn = allDateButtons.nth(i);
          const dateName = await dateBtn.textContent();
          
          console.log(`Trying date: ${dateName}`);
          await dateBtn.click();
          await this.page.waitForTimeout(1000);
          
          // Wait for time slots to appear
          const timeSlotAppeared = await this.page
            .locator('text=/\\d+:\\d+\\s*(AM|PM)/i')
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false);
          
          if (timeSlotAppeared) {
            console.log(`✓ Date selected: ${dateName} (time slots visible)`);
            dateClicked = true;
            break;
          }
          
          console.log(`Date ${dateName} - no time slots`);
        } catch (e) {
          continue;
        }
      }
    }
    
    if (!dateClicked) {
      throw new Error('Could not select any available date with time slots');
    }

    // Step 5: Select time slot - SIMPLE approach
    console.log('Selecting time slot...');
    
    // Convert time format
    const targetTime = appointmentTime.replace(':00', ':30');
    console.log(`Looking for time slot: ${targetTime}`);
    
    // Find ALL clickable time slot elements
    const allTimeSlots = this.page.locator('text=/\\d+:\\d+\\s*(AM|PM)/i');
    const slotCount = await allTimeSlots.count();
    console.log(`Found ${slotCount} time slots`);
    
    if (slotCount === 0) {
      throw new Error('No time slots found');
    }
    
    // Try to find preferred time, otherwise use first available
    let slotToClick = allTimeSlots.filter({ hasText: targetTime }).first();
    const hasPreferred = await slotToClick.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!hasPreferred) {
      console.log(`Preferred time ${targetTime} not found, using first available slot`);
      slotToClick = allTimeSlots.first();
    }
    
    // Get the PARENT element (the clickable container)
    // Time slots are text inside a clickable div
    const clickableParent = slotToClick.locator('..');
    await clickableParent.click();
    
    const selectedTime = await slotToClick.textContent();
    console.log(`✓ Time slot clicked: ${selectedTime}`);
    
    // Step 6: Wait for Continue button to be enabled
    const continueBtn = this.page.locator('[data-test="submit"]').filter({ 
      hasText: /Continue/i 
    });
    
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    
    // Wait for button to be enabled (backend validation)
    await expect(continueBtn).toBeEnabled({ timeout: 10000 });
    console.log('✓ Continue button enabled');

    // Step 7: Click Continue and wait for navigation
    console.log('Clicking Continue button...');
    
    await Promise.all([
      this.page.waitForURL(/reserve|payment|appointment/i, { timeout: 15000 }),
      continueBtn.click()
    ]);
    
    console.log('✓ Navigated to payment page');
  }

  /** Click Continue to proceed */
  async clickContinue() {
    await expect(this.continueButton).toBeVisible({ timeout: 10000 });
    await expect(this.continueButton).toBeEnabled({ timeout: 10000 });

    await Promise.all([
      this.page.waitForURL(/reserve|payment|confirmation/i, { timeout: 15000 }).catch(() => {}),
      this.continueButton.click()
    ]);

    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Verify Continue button is enabled */
  async isContinueButtonEnabled(): Promise<boolean> {
    return await this.continueButton.isEnabled();
  }
}