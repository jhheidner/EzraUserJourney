import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';
import { handleTimezonePopup } from '../utils/timezone-handler';
import { DashboardPage } from './DashboardPage';

/**
 * Page Object Model for Select Your Scan Page
 *
 * Updated Flow:
 * - User lands here after clicking "Book a Scan"
 * - Selects one scan type
 * - (Optionally) views “What’s Included”
 * - Clicks Continue to move to scheduling/birth info page
 */
export class SelectScanPage {
  readonly page: Page;
  readonly mriScanCard: Locator;
  readonly mriScanWithSpineCard: Locator;
  readonly mriScanWithSkeletalCard: Locator;
  readonly heartLungsCTScanCard: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly whatsIncludedLink: Locator;
  readonly whatsIncludedPopup: Locator;
  readonly popupCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Scan plan cards - find the clickable card element
    // The cards are in listitems, find the clickable parent element
    // Find text, then find the clickable parent (go up DOM tree to find clickable element)
    // The clickable card is typically 2-3 levels up from the text
    this.mriScanCard = page.getByText('MRI Scan', { exact: true }).locator('..').locator('..').first();
    this.mriScanWithSpineCard = page.getByText('MRI Scan with Spine', { exact: true }).locator('..').locator('..').first();
    this.mriScanWithSkeletalCard = page.getByText('MRI Scan with Skeletal and Neurological Assessment', { exact: true }).locator('..').locator('..').first();
    this.heartLungsCTScanCard = page.getByText('Heart & Lungs CT Scan', { exact: true }).locator('..').locator('..').first();

    // Buttons
    this.continueButton = page.locator('[data-test="submit"]').first();
    this.cancelButton = page.locator('button:has-text("Cancel")').first();

    // Pop-up elements
    this.whatsIncludedLink = page.locator('text="What\'s Included"').first();
    this.whatsIncludedPopup = page.locator('.modal, .popup, [role="dialog"]').first();
    this.popupCloseButton = page.locator('button:has-text("×"), button[aria-label="Close"]').first();
  }

  /**
   * Navigate to the Select Scan page
   */
  async goto() {
    const currentUrl = this.page.url();
    if (currentUrl.includes('/select-scan') || currentUrl.includes('/select-plan')) {
      await this.page.waitForLoadState('domcontentloaded');
      await acceptCookies(this.page).catch(() => {});
      // Wait for page heading to be visible (more reliable and unique)
      await this.page.getByRole('heading', { name: 'Review your Scan.' }).waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    const dashboardPage = new DashboardPage(this.page);
    const isOnDashboard = await dashboardPage.isOnDashboard();

    if (isOnDashboard) {
      console.log('On dashboard, clicking "Book a scan"...');
      await dashboardPage.clickBookScan();
      
      // Wait for navigation to complete
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000); // Give time for page to render
      
      // Accept cookies quickly (won't block if no pop-up exists)
      await acceptCookies(this.page).catch(() => {});
      
      // Wait for page heading to be visible (more reliable and unique)
      await this.page.getByRole('heading', { name: 'Review your Scan.' }).waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    console.log('Navigating directly to select-scan page...');
    await this.page.goto('/select-scan');
    await this.page.waitForLoadState('domcontentloaded');
    await acceptCookies(this.page).catch(() => {});
    // Wait for page heading to be visible (more reliable and unique)
    await this.page.getByRole('heading', { name: 'Review your Scan.' }).waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Select a scan plan
   */
  async selectScanPlan(scanType: 'mri' | 'mri-spine' | 'mri-skeletal' | 'heart-lungs') {
    let cardName: string;
    let textToFind: string;

    switch (scanType) {
      case 'mri':
        cardName = 'MRI Scan';
        textToFind = 'MRI Scan';
        break;
      case 'mri-spine':
        cardName = 'MRI Scan with Spine';
        textToFind = 'MRI Scan with Spine';
        break;
      case 'mri-skeletal':
        cardName = 'MRI Scan with Skeletal and Neurological Assessment';
        textToFind = 'MRI Scan with Skeletal and Neurological Assessment';
        break;
      case 'heart-lungs':
        cardName = 'Heart & Lungs CT Scan';
        textToFind = 'Heart & Lungs CT Scan';
        break;
    }

    console.log(`Selecting scan plan: ${cardName}`);
    
    // Find the text element first
    const textElement = this.page.getByText(textToFind, { exact: true }).first();
    await textElement.waitFor({ state: 'visible', timeout: 15000 });
    
    // Find the clickable parent - go up to find the clickable card element
    // Try going up 2-3 levels to find the clickable parent
    let card = textElement.locator('..').locator('..').first();
    
    // Wait for the card to be visible and clickable
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.scrollIntoViewIfNeeded();
    
    // Click the card
    await card.click({ timeout: 5000 });
    console.log(`✓ ${cardName} selected`);
  }

  /**
   * Click Continue to proceed to next step
   */
  async clickContinue() {
    await this.continueButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Click and wait for navigation to schedule page or next step
    await Promise.all([
      this.page.waitForURL(/schedule|schedule-scan|select.*scan|dashboard/i, { timeout: 15000 }).catch(() => {}),
      this.continueButton.click()
    ]);
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Give time for page to render
  }

  /**
   * (Optional) Open and close “What’s Included”
   */
  async openAndCloseWhatsIncluded(scanType: 'mri' | 'mri-spine' | 'mri-skeletal' | 'heart-lungs') {
    let card: Locator;
    switch (scanType) {
      case 'mri': card = this.mriScanCard; break;
      case 'mri-spine': card = this.mriScanWithSpineCard; break;
      case 'mri-skeletal': card = this.mriScanWithSkeletalCard; break;
      case 'heart-lungs': card = this.heartLungsCTScanCard; break;
    }
    const link = card.locator('text="What\'s Included"').first();
    await link.click();
    await this.whatsIncludedPopup.waitFor({ state: 'visible', timeout: 5000 });
    await this.popupCloseButton.click();
    await this.whatsIncludedPopup.waitFor({ state: 'hidden', timeout: 5000 });
  }
}
