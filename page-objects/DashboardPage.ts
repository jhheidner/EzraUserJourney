import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';
import { handleTimezonePopup } from '../utils/timezone-handler';

/**
 * Page Object Model for Dashboard (Main Page After Login)
 *
 * This page is the main landing page after successful login where users can:
 * - View dashboard menu items (Home, Reports, Invoices, Account)
 * - Click "Book a scan" button to start the booking flow
 * - Navigate to different sections of the application
 */
export class DashboardPage {
  readonly page: Page;
  readonly homeMenu: Locator;
  readonly reportsMenu: Locator;
  readonly invoicesMenu: Locator;
  readonly accountMenu: Locator;
  readonly bookScanButton: Locator;
  readonly startQuestionnaireButton: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.homeMenu = page.locator('text=Home').first();
    this.reportsMenu = page.locator('text=Reports').first();
    this.invoicesMenu = page.locator('text=Invoices').first();
    this.accountMenu = page.locator('text=Account').first();

    this.bookScanButton = page.getByRole('button', { name: 'Book a scan' });
    this.startQuestionnaireButton = page.getByRole('button', { name: 'Start' }).first();
    this.signOutButton = page.locator('button:has-text("Sign out")').first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');

    await acceptCookies(this.page);

    try {
      if (!this.page.isClosed()) {
        await handleTimezonePopup(this.page, 'confirm').catch(() => {});
      }
    } catch (e) {}

    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network idle timeout, continuing...');
    });

    await this.page.waitForTimeout(2000);
  }

  async isOnDashboard(): Promise<boolean> {
    const currentUrl = this.page.url();
    return currentUrl.includes('/dashboard') ||
           currentUrl.includes('/home') ||
           currentUrl === 'https://myezra-staging.ezra.com/' ||
           currentUrl === 'https://myezra-staging.ezra.com';
  }

  private async getHomeMenu(): Promise<Locator> {
    let homeMenu = this.page.locator('text=Home').first();
    let isVisible = await homeMenu.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isVisible) {
      homeMenu = this.page.locator('a:has-text("Home")').first();
      isVisible = await homeMenu.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!isVisible) homeMenu = this.page.getByText('Home').first();

    return homeMenu;
  }

  private async getReportsMenu(): Promise<Locator> {
    let reportsMenu = this.page.locator('text=Reports').first();
    let isVisible = await reportsMenu.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isVisible) {
      reportsMenu = this.page.locator('a:has-text("Reports")').first();
      isVisible = await reportsMenu.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!isVisible) reportsMenu = this.page.getByText('Reports').first();
    return reportsMenu;
  }

  private async getInvoicesMenu(): Promise<Locator> {
    let invoicesMenu = this.page.locator('text=Invoices').first();
    let isVisible = await invoicesMenu.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isVisible) {
      invoicesMenu = this.page.locator('a:has-text("Invoices")').first();
      isVisible = await invoicesMenu.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!isVisible) invoicesMenu = this.page.getByText('Invoices').first();
    return invoicesMenu;
  }

  private async getAccountMenu(): Promise<Locator> {
    let accountMenu = this.page.locator('text=Account').first();
    let isVisible = await accountMenu.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isVisible) {
      accountMenu = this.page.locator('a:has-text("Account")').first();
      isVisible = await accountMenu.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (!isVisible) accountMenu = this.page.getByText('Account').first();
    return accountMenu;
  }

  async verifyHomeMenuVisible() {
    const homeMenu = await this.getHomeMenu();
    await homeMenu.waitFor({ state: 'visible', timeout: 15000 });
    return await homeMenu.isVisible();
  }

  async verifyReportsMenuVisible() {
    const reportsMenu = await this.getReportsMenu();
    await reportsMenu.waitFor({ state: 'visible', timeout: 15000 });
    return await reportsMenu.isVisible();
  }

  async verifyInvoicesMenuVisible() {
    const invoicesMenu = await this.getInvoicesMenu();
    await invoicesMenu.waitFor({ state: 'visible', timeout: 15000 });
    return await invoicesMenu.isVisible();
  }

  async verifyAccountMenuVisible() {
    const accountMenu = await this.getAccountMenu();
    await accountMenu.waitFor({ state: 'visible', timeout: 15000 });
    return await accountMenu.isVisible();
  }

  async verifyAllMenuItemsVisible() {
    const homeVisible = await this.verifyHomeMenuVisible();
    const reportsVisible = await this.verifyReportsMenuVisible();
    const invoicesVisible = await this.verifyInvoicesMenuVisible();
    const accountVisible = await this.verifyAccountMenuVisible();
    return homeVisible && reportsVisible && invoicesVisible && accountVisible;
  }

  async clickHome() {
    const homeMenu = await this.getHomeMenu();
    await homeMenu.waitFor({ state: 'visible', timeout: 15000 });
    await homeMenu.scrollIntoViewIfNeeded();
    await homeMenu.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickReports() {
    const reportsMenu = await this.getReportsMenu();
    await reportsMenu.waitFor({ state: 'visible', timeout: 15000 });
    await reportsMenu.scrollIntoViewIfNeeded();
    await reportsMenu.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickInvoices() {
    const invoicesMenu = await this.getInvoicesMenu();
    await invoicesMenu.waitFor({ state: 'visible', timeout: 15000 });
    await invoicesMenu.scrollIntoViewIfNeeded();
    await invoicesMenu.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickAccount() {
    const accountMenu = await this.getAccountMenu();
    await accountMenu.waitFor({ state: 'visible', timeout: 15000 });
    await accountMenu.scrollIntoViewIfNeeded();
    await accountMenu.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Click "Book a scan" button to start the booking flow
   */
  async clickBookScan() {
    await this.bookScanButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.bookScanButton.scrollIntoViewIfNeeded();

    console.log('Clicking "Book a scan"...');
    await Promise.all([
      this.page.waitForURL(/select-plan|select-scan|select.*plan|select.*scan/i, { timeout: 15000 }).catch(() => {}),
      this.bookScanButton.click()
    ]);

    await this.page.waitForLoadState('domcontentloaded');

    try {
      if (!this.page.isClosed()) {
        await handleTimezonePopup(this.page, 'confirm').catch(() => {});
      }
    } catch (e) {}

    await this.page.waitForTimeout(1000);
  }

  async clickStartQuestionnaire() {
    await this.startQuestionnaireButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.startQuestionnaireButton.scrollIntoViewIfNeeded();

    console.log('Clicking "Start" to begin questionnaire...');
    await Promise.all([
      this.page.waitForURL(/questionnaire|assessment|intake/i, { timeout: 15000 }).catch(() => {}),
      this.startQuestionnaireButton.click()
    ]);

    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async verifyBookScanButtonVisible(): Promise<boolean> {
    return await this.bookScanButton.isVisible({ timeout: 10000 }).catch(() => false);
  }

  async signOut() {
    await this.signOutButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.signOutButton.scrollIntoViewIfNeeded();
    await this.signOutButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
