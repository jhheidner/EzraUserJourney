import { Page, Locator } from '@playwright/test';

export class BookingPage {
  readonly page: Page;
  readonly bookButton: Locator;
  readonly datePicker: Locator;
  readonly timeSlot: Locator;
  readonly serviceType: Locator;
  readonly coachSelect: Locator;
  readonly confirmBookingButton: Locator;
  readonly cancelBookingButton: Locator;
  readonly bookingConfirmation: Locator;
  readonly bookingId: Locator;
  readonly errorMessage: Locator;
  readonly validationMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Adjust selectors based on actual application structure
    this.bookButton = page.locator('button:has-text("Book"), a:has-text("Book Session")').first();
    this.datePicker = page.locator('input[type="date"], .date-picker, [data-testid="date-picker"]').first();
    this.timeSlot = page.locator('.time-slot, [data-testid="time-slot"]').first();
    this.serviceType = page.locator('select[name="service"], [data-testid="service-type"]').first();
    this.coachSelect = page.locator('select[name="coach"], [data-testid="coach-select"]').first();
    this.confirmBookingButton = page.locator('button:has-text("Confirm"), button:has-text("Book Now")').first();
    this.cancelBookingButton = page.locator('button:has-text("Cancel")').first();
    this.bookingConfirmation = page.locator('.booking-confirmation, [data-testid="booking-confirmation"]').first();
    this.bookingId = page.locator('[data-testid="booking-id"], .booking-id').first();
    this.errorMessage = page.locator('.error, .alert-error, [role="alert"]').first();
    this.validationMessage = page.locator('.validation-error, .field-error').first();
  }

  async goto() {
    await this.page.goto('/bookings');
    await this.page.waitForLoadState('networkidle');
  }

  async clickBookSession() {
    await this.bookButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectDate(date: string) {
    // Format: YYYY-MM-DD
    await this.datePicker.fill(date);
  }

  async selectTimeSlot(time: string) {
    // Select time slot by text or data attribute
    await this.page.locator(`text="${time}"`).first().click();
  }

  async selectServiceType(service: string) {
    if (await this.serviceType.count() > 0) {
      await this.serviceType.selectOption(service);
    }
  }

  async selectCoach(coach: string) {
    if (await this.coachSelect.count() > 0) {
      await this.coachSelect.selectOption(coach);
    }
  }

  async confirmBooking() {
    await this.confirmBookingButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async createBooking(date: string, time: string, service?: string, coach?: string) {
    await this.clickBookSession();
    await this.selectDate(date);
    await this.selectTimeSlot(time);
    if (service) {
      await this.selectServiceType(service);
    }
    if (coach) {
      await this.selectCoach(coach);
    }
    await this.confirmBooking();
  }

  async getBookingId(): Promise<string | null> {
    const isVisible = await this.bookingId.isVisible().catch(() => false);
    if (isVisible) {
      return await this.bookingId.textContent();
    }
    return null;
  }

  async isBookingConfirmed(): Promise<boolean> {
    const isVisible = await this.bookingConfirmation.isVisible().catch(() => false);
    return isVisible;
  }

  async getValidationMessage(): Promise<string | null> {
    const isVisible = await this.validationMessage.isVisible().catch(() => false);
    if (isVisible) {
      return await this.validationMessage.textContent();
    }
    return null;
  }

  async cancelBooking(bookingId?: string) {
    if (bookingId) {
      // Navigate to specific booking
      await this.page.goto(`/bookings/${bookingId}`);
    }
    await this.cancelBookingButton.click();
    // Handle confirmation dialog if present
    await this.page.locator('button:has-text("Confirm"), button:has-text("Yes")').click().catch(() => {});
  }

  async isDateDisabled(date: string): Promise<boolean> {
    const dateInput = this.page.locator(`input[value="${date}"]`);
    const isDisabled = await dateInput.isDisabled().catch(() => false);
    return isDisabled;
  }

  async isTimeSlotAvailable(time: string): Promise<boolean> {
    const timeSlot = this.page.locator(`text="${time}"`);
    const isVisible = await timeSlot.isVisible().catch(() => false);
    if (!isVisible) return false;
    
    // Check if time slot has "unavailable" or "booked" class/text
    const hasUnavailableClass = await timeSlot.locator('..').getAttribute('class').then(
      (className) => className?.includes('unavailable') || className?.includes('booked')
    ).catch(() => false);
    
    return !hasUnavailableClass;
  }
}

