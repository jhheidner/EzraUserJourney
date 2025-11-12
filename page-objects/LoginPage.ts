import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';
import { handleTimezonePopup } from '../utils/timezone-handler';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Adjust selectors based on actual application structure
    this.emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();
    this.loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In"), button:has-text("Submit"), button[type="submit"]').first();
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a:has-text("Password")').first();
    // Error message selector - try multiple patterns to find error text
    this.errorMessage = page.locator(
      '.error, .alert-error, [role="alert"], text=/invalid|incorrect|wrong|error|username.*password/i'
    ).first();
    this.successMessage = page.locator('.success, .alert-success').first();
  }

  async goto() {
    // Check if page is already closed
    if (this.page.isClosed()) {
      throw new Error('Cannot navigate to login page - page is closed');
    }

    // First, check if we're already on the login page
    try {
      const currentUrl = this.page.url();
      const isOnLoginPage = currentUrl.includes('/login') || currentUrl.includes('/sign-in') || currentUrl.includes('/signin');
      
      if (isOnLoginPage) {
        // We're already on login page, just wait for form to be visible
        await this.page.waitForLoadState('domcontentloaded');
        await acceptCookies(this.page);
        
        // Handle timezone pop-up if it appears (it might block the login form)
        if (!this.page.isClosed()) {
          await handleTimezonePopup(this.page, 'confirm').catch(() => {});
        }
        
        // Wait a moment for any pop-ups to close
        if (!this.page.isClosed()) {
          await this.page.waitForTimeout(1000).catch(() => {});
        }
        
        // Check if email input is visible
        const isEmailVisible = await this.emailInput.isVisible({ timeout: 2000 }).catch(() => false);
        if (isEmailVisible) {
          await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
          return; // Success - we're on the login page
        }
      }
    } catch (e) {
      // Page might have closed, continue to navigation
      if (this.page.isClosed()) {
        throw new Error('Cannot navigate to login page - page is closed');
      }
    }

    // Try to navigate to login page - try multiple possible URLs
    const loginUrls = ['/login', '/sign-in', '/signin', '/'];
    
    for (const url of loginUrls) {
      try {
        // Check if page is still open before navigating
        if (this.page.isClosed()) {
          throw new Error('Page closed during navigation');
        }

        await this.page.goto(url);
        
        // Check if page closed during navigation
        if (this.page.isClosed()) {
          continue; // Try next URL
        }
        
        // Wait for DOM to be ready (more reliable than networkidle)
        await this.page.waitForLoadState('domcontentloaded');
        
        // Accept cookies FIRST before waiting for networkidle
        await acceptCookies(this.page);
        
        // Handle timezone pop-up if it appears (it might block the login form)
        // Note: This might close/navigate the page, so check after
        if (!this.page.isClosed()) {
          await handleTimezonePopup(this.page, 'confirm').catch(() => {});
        }
        
        // Wait a moment for any pop-ups to close and check if page is still open
        if (!this.page.isClosed()) {
          await this.page.waitForTimeout(1000).catch(() => {});
        }
        
        // Check if page closed after timezone handler
        if (this.page.isClosed()) {
          continue; // Try next URL
        }
        
        // Check if we're actually on the login page by looking for the email input
        const isEmailVisible = await this.emailInput.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (isEmailVisible) {
          // We found the login form, wait for it to be fully visible
          await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
          return; // Success - we're on the login page
        }
        
        // If email input not found, check if we're redirected to dashboard (already logged in)
        const currentUrl = this.page.url();
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/home') || currentUrl.includes('/select-scan')) {
          // User is already logged in, don't need to go to login page
          return;
        }
        
        // Check if we're on login page by URL
        if (currentUrl.includes('/login') || currentUrl.includes('/sign-in') || currentUrl.includes('/signin')) {
          // We're on login page but email input not visible yet, wait a bit more
          await this.page.waitForTimeout(2000).catch(() => {});
          if (!this.page.isClosed()) {
            const emailVisible = await this.emailInput.isVisible({ timeout: 5000 }).catch(() => false);
            if (emailVisible) {
              await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
              return;
            }
          }
        }
      } catch (e) {
        // If page closed, don't try more URLs
        if (this.page.isClosed()) {
          throw new Error('Cannot navigate to login page - page is closed');
        }
        // Try next URL
        continue;
      }
    }
    
    // If we get here, none of the URLs worked - check if page is still open
    if (this.page.isClosed()) {
      throw new Error('Cannot navigate to login page - page is closed');
    }
    
    // Try one more time with explicit wait
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
    await acceptCookies(this.page);
    
    if (!this.page.isClosed()) {
      await handleTimezonePopup(this.page, 'confirm').catch(() => {});
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(1000).catch(() => {});
        if (!this.page.isClosed()) {
          await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
        }
      }
    }
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Wait for navigation or error message after login attempt
    // Use a longer timeout and wait for any navigation away from login page
    await Promise.race([
      this.page.waitForURL(/dashboard|home|profile|select-scan|select.*scan|\/$/, { timeout: 15000 }).catch(() => {}),
      this.errorMessage.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      this.page.waitForNavigation({ timeout: 15000 }).catch(() => {}) // Wait for any navigation
    ]);
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async getErrorMessage(): Promise<string | null> {
    // Check if page is closed before proceeding
    if (this.page.isClosed()) {
      return null;
    }
    
    // Wait a moment for error message to appear, but check if page is still open
    try {
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(1000).catch(() => {
          // Page might have closed, that's okay
        });
      }
    } catch (e) {
      // Page closed, return null
      return null;
    }
    
    // Check again if page is closed before trying to find error message
    if (this.page.isClosed()) {
      return null;
    }
    
    // Try multiple ways to find error message
    const errorSelectors = [
      '.error, .alert-error, [role="alert"]',
      'text=/invalid|incorrect|wrong|error/i',
      'text=/username.*password/i',
      'text=/password.*incorrect/i'
    ];
    
    for (const selector of errorSelectors) {
      try {
        if (this.page.isClosed()) {
          return null;
        }
        
        const errorLocator = this.page.locator(selector).first();
        const isVisible = await errorLocator.isVisible().catch(() => false);
        if (isVisible) {
          const text = await errorLocator.textContent();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch (e) {
        // Page might have closed, continue to next selector
        continue;
      }
    }
    
    return null;
  }

  async isLoggedIn(): Promise<boolean> {
    // First check if we're still on login page (login failed)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login') || currentUrl.endsWith('/') || currentUrl.includes('sign-in')) {
      // Check for error message
      const hasError = await this.errorMessage.isVisible().catch(() => false);
      if (hasError) {
        return false; // Login failed
      }
    }
    
    // Check for indicators of successful login (adjust based on actual app)
    const indicators = [
      this.page.locator('text=/dashboard/i'),
      this.page.locator('text=/welcome/i'),
      this.page.locator('[data-testid="user-menu"]'),
      this.page.locator('.user-profile'),
      this.page.locator('text=/select.*scan/i'), // Select scan page indicates successful login
    ];
    
    for (const indicator of indicators) {
      const isVisible = await indicator.isVisible().catch(() => false);
      if (isVisible) {
        return true;
      }
    }
    
    // Check if URL changed from login page
    if (!currentUrl.includes('/login') && !currentUrl.endsWith('/')) {
      return true; // Likely logged in if we navigated away
    }
    
    return false;
  }

  async waitForLoginSuccess() {
    // Check if page is closed before starting
    if (this.page.isClosed()) {
      console.log('⚠ Page is closed, cannot wait for login success');
      return;
    }

    // Wait for redirect after successful login - check for common post-login URLs
    try {
      await this.page.waitForURL(/dashboard|home|profile|select-scan|select.*scan/i, { timeout: 10000 }).catch(() => {});
    } catch (e) {
      if (this.page.isClosed()) {
        console.log('⚠ Page closed during URL wait');
        return;
      }
    }
    
    // Check if page is still open before continuing
    if (this.page.isClosed()) {
      console.log('⚠ Page closed after URL wait');
      return;
    }
    
    // Also wait for page to be ready
    try {
      await this.page.waitForLoadState('domcontentloaded');
    } catch (e) {
      if (this.page.isClosed()) {
        console.log('⚠ Page closed during load state wait');
        return;
      }
    }
    
    // Wait a bit for any pop-ups to appear
    if (!this.page.isClosed()) {
      try {
        await this.page.waitForTimeout(2000);
      } catch (e) {
        if (this.page.isClosed()) {
          console.log('⚠ Page closed during timeout wait');
          return;
        }
        // Re-throw if it's not a page closed error
        throw e;
      }
    } else {
      console.log('⚠ Page closed before timeout wait');
      return;
    }
    
    // Handle timezone pop-up if it appears after login
    // Check if page is still open before handling pop-up
    if (!this.page.isClosed()) {
      // Check if timezone pop-up is actually visible before trying to handle it
      const timezoneModal = this.page.locator('.timezone-modal, [class*="timezone-modal"]').first();
      const isTimezoneVisible = await timezoneModal.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isTimezoneVisible) {
        console.log('Timezone pop-up detected after login, handling...');
        await handleTimezonePopup(this.page, 'confirm').catch(() => {
          // If timezone handler fails, that's okay - continue
          console.log('Timezone pop-up handler failed, continuing...');
        });
        
        // Wait a bit more to ensure pop-up is closed, but check if page is still open
        if (!this.page.isClosed()) {
          try {
            await this.page.waitForTimeout(1000);
          } catch (e) {
            // Page might have closed, that's okay
            if (this.page.isClosed()) {
              console.log('⚠ Page closed after timezone handler');
            }
          }
        }
      } else {
        console.log('No timezone pop-up detected after login, skipping handler');
      }
    }
  }

  /**
   * Log out from the application
   * Looks for "Sign out" button and clicks it
   */
  async logout(): Promise<void> {
    try {
      if (this.page.isClosed()) {
        return; // Page already closed, nothing to do
      }

      // Look for sign out button - try multiple selectors
      const signOutButton = this.page.locator('button:has-text("Sign out"), button:has-text("Sign Out"), button:has-text("Logout"), button:has-text("Log out"), a:has-text("Sign out"), a:has-text("Logout")').first();
      
      const isVisible = await signOutButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        console.log('Logging out...');
        await signOutButton.click();
        
        // Wait for logout to complete (redirect to login page or home)
        await this.page.waitForTimeout(2000);
        
        // Verify we're logged out by checking if we're on login page or home
        const currentUrl = this.page.url();
        const isLoggedOut = currentUrl.includes('/login') || 
                           currentUrl.includes('/sign-in') || 
                           currentUrl.includes('/signin') ||
                           (!currentUrl.includes('/dashboard') && !currentUrl.includes('/home') && !currentUrl.includes('/select-scan'));
        
        if (isLoggedOut) {
          console.log('✓ Successfully logged out');
        }
      } else {
        // Sign out button not found - might already be logged out
        console.log('Sign out button not found - may already be logged out');
      }
    } catch (e) {
      // Logout failed, but that's okay - continue
      console.log('Logout failed or not needed:', e);
    }
  }
}

