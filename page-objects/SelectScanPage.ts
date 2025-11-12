import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';
import { handleTimezonePopup } from '../utils/timezone-handler';
import { DashboardPage } from './DashboardPage';

export class SelectScanPage {
  readonly page: Page;
  readonly mriScanCard: Locator;
  readonly mriScanWithSpineCard: Locator;
  readonly mriScanWithSkeletalCard: Locator;
  readonly heartLungsCTScanCard: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly whatsIncludedPopup: Locator;
  readonly popupCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.mriScanCard = page.getByText('MRI Scan', { exact: true }).locator('..').locator('..').first();
    this.mriScanWithSpineCard = page.getByText('MRI Scan with Spine', { exact: true }).locator('..').locator('..').first();
    this.mriScanWithSkeletalCard = page.getByText('MRI Scan with Skeletal and Neurological Assessment', { exact: true }).locator('..').locator('..').first();
    this.heartLungsCTScanCard = page.getByText('Heart & Lungs CT Scan', { exact: true }).locator('..').locator('..').first();

    this.continueButton = page.locator('[data-test="submit"]').first();
    this.cancelButton = page.locator('button:has-text("Cancel")').first();
    this.whatsIncludedPopup = page.locator('.modal, .popup, [role="dialog"]').first();
    this.popupCloseButton = page.locator('button:has-text("×"), button[aria-label="Close"]').first();
  }

  async goto() {
    const currentUrl = this.page.url();
    if (currentUrl.includes('/select-scan') || currentUrl.includes('/select-plan')) {
      await this.page.waitForLoadState('domcontentloaded');
      await acceptCookies(this.page).catch(() => {});
      await this.page.getByRole('heading', { name: 'Review your Scan.' }).waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    const dashboardPage = new DashboardPage(this.page);
    const isOnDashboard = await dashboardPage.isOnDashboard();

    if (isOnDashboard) {
      console.log('On dashboard, clicking "Book a scan"...');
      await dashboardPage.clickBookScan();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000);
      await acceptCookies(this.page).catch(() => {});
      await this.page.getByRole('heading', { name: 'Review your Scan.' }).waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    console.log('Navigating directly to select-scan page...');
    await this.page.goto('/select-scan');
    await this.page.waitForLoadState('domcontentloaded');
    await acceptCookies(this.page).catch(() => {});
    await this.page.getByRole('heading', { name: 'Review your Scan.' }).waitFor({ state: 'visible', timeout: 15000 });
  }

  async selectScanPlan(scanType: 'mri' | 'mri-spine' | 'mri-skeletal' | 'heart-lungs') {
    let card: Locator;

    switch (scanType) {
      case 'mri': card = this.mriScanCard; break;
      case 'mri-spine': card = this.mriScanWithSpineCard; break;
      case 'mri-skeletal': card = this.mriScanWithSkeletalCard; break;
      case 'heart-lungs': card = this.heartLungsCTScanCard; break;
    }

    console.log(`Selecting scan plan: ${scanType}`);
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.scrollIntoViewIfNeeded();
    await card.click({ timeout: 5000 });
    console.log(`✓ ${scanType} selected`);
  }

  async completeIntakeIfPresent({
    dateOfBirth = '01-01-1990',
    sexAtBirth = 'Female',
  }: {
    dateOfBirth?: string;
    sexAtBirth?: string;
  } = {}) {
    const dobField = this.page.getByRole('textbox', { name: /date of birth/i }).first();
    const dobVisible = await dobField.isVisible({ timeout: 2000 }).catch(() => false);
    if (dobVisible) {
      console.log('Filling Date of Birth prerequisite...');
      await dobField.fill(dateOfBirth);
      await dobField.blur();
    }

    let sexDropdown = this.page.getByRole('combobox', { name: /sex at birth/i }).first();
    let sexVisible = await sexDropdown.isVisible({ timeout: 2000 }).catch(() => false);

    if (!sexVisible) {
      sexDropdown = this.page.getByRole('combobox').filter({ hasText: /Select/i }).first();
      sexVisible = await sexDropdown.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!sexVisible) {
      const label = this.page.getByText(/What was your sex at birth\?/i).first();
      const candidate = label.locator('xpath=following-sibling::*').locator('[role="combobox"], select, button').first();
      const candidateVisible = await candidate.isVisible({ timeout: 2000 }).catch(() => false);
      if (candidateVisible) {
        sexDropdown = candidate;
        sexVisible = true;
      }
    }

    if (sexVisible) {
      console.log('Selecting Sex at Birth prerequisite...');
      await sexDropdown.click();
      await this.page.waitForTimeout(200);

      const desiredOption = this.page.getByRole('option', { name: new RegExp(sexAtBirth, 'i') }).first();
      const optionVisible = await desiredOption.isVisible({ timeout: 2000 }).catch(() => false);
      if (optionVisible) {
        await desiredOption.click();
      } else {
        const fallbackOptions = this.page.getByRole('option');
        const optionCount = await fallbackOptions.count();
        if (optionCount > 0) {
          await fallbackOptions.first().click();
        }
      }
    }
  }

  async clickContinue() {
    await this.continueButton.waitFor({ state: 'visible', timeout: 10000 });

    console.log('Clicking Continue to move to Schedule Scan page...');
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      this.continueButton.click()
    ]);

    await this.page.waitForURL(/schedule|schedule-scan/i, { timeout: 15000 }).catch(() => {});
    await this.page.getByRole('heading', { name: /Schedule your scan/i }).waitFor({ timeout: 10000 });
    console.log('✓ Schedule Scan page loaded successfully');
  }
}
