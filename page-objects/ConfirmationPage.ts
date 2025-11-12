import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';

/**
 * Page Object Model for Appointment Confirmation Page
 * 
 * This page appears after successful payment where users:
 * - See confirmation message
 * - View appointment details summary
 * - Access medical questionnaire
 * - Navigate to dashboard
 */
export class ConfirmationPage {
  readonly page: Page;
  readonly confirmationHeading: Locator;
  readonly confirmationMessage: Locator;
  readonly beginQuestionnaireButton: Locator;
  readonly goToDashboardButton: Locator;
  readonly appointmentDetailsCard: Locator;
  readonly serviceTitle: Locator;
  readonly locationName: Locator;
  readonly locationAddress: Locator;
  readonly appointment1Times: Locator;
  readonly appointment2Times: Locator;
  readonly openInGoogleMapsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Confirmation message
    this.confirmationHeading = page.locator('h1:has-text("received"), h2:has-text("received")').first();
    this.confirmationMessage = page.locator('text=/questionnaire|medical|appointment/').first();
    
    // Action buttons
    this.beginQuestionnaireButton = page.locator('button:has-text("Begin Medical Questionnaire"), button:has-text("Questionnaire")').first();
    this.goToDashboardButton = page.locator('button:has-text("Go to Dashboard"), a:has-text("Dashboard")').first();
    
    // Appointment details card
    this.appointmentDetailsCard = page.locator('.appointment-card, [data-testid="appointment-details"]').first();
    this.serviceTitle = page.locator('text=/MRI Scan|CT Scan/').first();
    this.locationName = page.locator('.location-name, [data-testid="location-name"]').first();
    this.locationAddress = page.locator('.location-address, [data-testid="location-address"]').first();
    this.appointment1Times = page.locator('.appointment-1, [data-testid="appointment-1"]').first();
    this.appointment2Times = page.locator('.appointment-2, [data-testid="appointment-2"]').first();
    this.openInGoogleMapsLink = page.locator('a:has-text("Google Maps"), a:has-text("Open in")').first();
  }

  /**
   * Navigate to confirmation page
   * Assumption: User has completed payment successfully
   */
  async goto() {
    await this.page.goto('/sign-up/scan-confirm');
    // Wait for DOM to be ready (more reliable than networkidle)
    await this.page.waitForLoadState('domcontentloaded');
    
    // Accept cookies FIRST before waiting for elements
    await acceptCookies(this.page);
    
    // Wait for key elements to be visible
    await this.confirmationHeading.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  /**
   * Verify confirmation message is displayed
   */
  async isConfirmationDisplayed(): Promise<boolean> {
    return await this.confirmationHeading.isVisible().catch(() => false);
  }

  /**
   * Get confirmation message text
   */
  async getConfirmationMessage(): Promise<string | null> {
    return await this.confirmationMessage.textContent();
  }

  /**
   * Click "Begin Medical Questionnaire" button
   */
  async clickBeginQuestionnaire() {
    await this.beginQuestionnaireButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Go to Dashboard" button
   */
  async clickGoToDashboard() {
    await this.goToDashboardButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get service title from appointment summary
   */
  async getServiceTitle(): Promise<string | null> {
    const isVisible = await this.serviceTitle.isVisible().catch(() => false);
    if (isVisible) {
      return await this.serviceTitle.textContent();
    }
    return null;
  }

  /**
   * Get location name from appointment summary
   */
  async getLocationName(): Promise<string | null> {
    const isVisible = await this.locationName.isVisible().catch(() => false);
    if (isVisible) {
      return await this.locationName.textContent();
    }
    return null;
  }

  /**
   * Get location address from appointment summary
   */
  async getLocationAddress(): Promise<string | null> {
    const isVisible = await this.locationAddress.isVisible().catch(() => false);
    if (isVisible) {
      return await this.locationAddress.textContent();
    }
    return null;
  }

  /**
   * Verify appointment details match expected values
   * @param expectedService Expected service title
   * @param expectedLocation Expected location name
   */
  async verifyAppointmentDetails(expectedService: string, expectedLocation: string): Promise<boolean> {
    const serviceTitle = await this.getServiceTitle();
    const locationName = await this.getLocationName();
    
    return (serviceTitle?.includes(expectedService) ?? false) && 
           (locationName?.includes(expectedLocation) ?? false);
  }
}

