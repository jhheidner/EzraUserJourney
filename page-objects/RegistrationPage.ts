import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';

/**
 * Page Object Model for Registration Page
 * 
 * This page is used to create new user accounts for testing.
 * After registration, users can proceed with the booking flow.
 */
export class RegistrationPage {
  readonly page: Page;
  readonly joinLink: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly checkboxes: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Join link on login page
    this.joinLink = page.locator('text="Join"').first();
    
    // Registration form fields
    this.firstNameInput = page.locator('#firstName').first();
    this.lastNameInput = page.locator('#lastName').first();
    this.emailInput = page.locator('#email').first();
    this.phoneNumberInput = page.locator('#phoneNumber').first();
    this.passwordInput = page.locator('#password').first();
    
    // Submit button
    this.submitButton = page.locator('button:has-text("Submit"), button[type="submit"]').first();
    
    // Checkboxes on registration page - try multiple strategies
    // Strategy 1: All checkboxes on the page
    // Strategy 2: Checkboxes within form
    // Strategy 3: Checkboxes with specific attributes
    this.checkboxes = page.locator('input[type="checkbox"]');
  }

  /**
   * Navigate to the registration page via login page
   */
  async goto() {
    await this.page.goto('/sign-in');
    await this.page.waitForLoadState('domcontentloaded');
    
    // Accept cookies if present
    await acceptCookies(this.page);
    
    // Click Join link to go to registration
    await this.joinLink.waitFor({ state: 'visible', timeout: 10000 });
    await this.joinLink.click();
    
    // Wait for registration form to load
    await this.page.waitForLoadState('domcontentloaded');
    await this.firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill out the registration form
   * @param firstName Legal first name
   * @param lastName Legal last name
   * @param email Email address
   * @param phoneNumber Phone number
   * @param password Password (default: YourTestPassword!)
   */
  async fillRegistrationForm(
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    password: string = 'YourTestPassword!'
  ) {
    // Fill first name
    await this.firstNameInput.click();
    await this.firstNameInput.fill(firstName);
    
    // Fill last name
    await this.lastNameInput.click();
    await this.lastNameInput.fill(lastName);
    
    // Fill email
    await this.emailInput.click();
    await this.emailInput.fill(email);
    
    // Fill phone number
    await this.phoneNumberInput.click();
    await this.phoneNumberInput.fill(phoneNumber);
    
    // Fill password
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
  }

  /**
   * Select all checkboxes on the registration page
   * This is required before the submit button becomes enabled
   * 
   * Uses multiple strategies to find checkboxes:
   * 1. Standard HTML input[type="checkbox"]
   * 2. Buttons containing SVG checkboxes (button > svg > rect)
   * 3. Custom SVG-based checkboxes (rect.border elements)
   * 4. Checkboxes within form elements
   * 5. Clickable elements that might be checkboxes
   */
  async selectAllCheckboxes() {
    // Wait for checkboxes to be visible
    await this.page.waitForTimeout(1000); // Give time for form to render
    
    // Strategy 1: Try to find standard HTML checkboxes first
    let checkboxes: Locator | null = null;
    let checkboxCount = 0;
    
    const standardCheckboxes = this.page.locator('input[type="checkbox"]');
    checkboxCount = await standardCheckboxes.count();
    
    if (checkboxCount > 0) {
      checkboxes = standardCheckboxes;
      console.log(`Found ${checkboxCount} standard HTML checkboxes`);
    } else {
      // Strategy 2: Try to find buttons containing SVG checkboxes
      // Based on the XPath: //*[@id="app"]/div[1]/div[2]/div[2]/div[2]/div/form/div[3]/div[7]/button/svg/rect[3]
      // The checkbox is inside a button > svg > rect structure
      // So we should click the button, not the rect
      const buttonWithSvg = this.page.locator('button:has(svg rect), button:has(svg rect.border)');
      const buttonCount = await buttonWithSvg.count();
      
      if (buttonCount > 0) {
        checkboxes = buttonWithSvg;
        checkboxCount = buttonCount;
        console.log(`Found ${checkboxCount} buttons containing SVG checkboxes`);
      } else {
        // Strategy 3: Try to find SVG-based checkboxes (custom checkboxes)
        // Look for SVG rect elements with class "border" - these are likely custom checkboxes
        const svgCheckboxes = this.page.locator('svg rect.border, svg rect[class*="border"]');
        const svgCount = await svgCheckboxes.count();
        
        if (svgCount > 0) {
          console.log(`Found ${svgCount} SVG-based checkboxes (custom checkboxes)`);
          // For SVG checkboxes, we need to click the parent element or the SVG container
          // Try to find the parent button element (most likely)
          const parentButtons = this.page.locator('button:has(svg rect.border)');
          const parentButtonCount = await parentButtons.count();
          
          if (parentButtonCount > 0) {
            checkboxes = parentButtons;
            checkboxCount = parentButtonCount;
            console.log(`Found ${checkboxCount} parent buttons containing SVG checkbox rects`);
          } else {
            // Try to find the parent clickable element
            const svgContainers = this.page.locator('svg rect.border').locator('xpath=ancestor::button[1]');
            const containerCount = await svgContainers.count();
            
            if (containerCount > 0) {
              checkboxes = svgContainers;
              checkboxCount = containerCount;
              console.log(`Found ${checkboxCount} checkbox button containers to click`);
            } else {
              // Try clicking the SVG element itself
              checkboxes = this.page.locator('svg').filter({ has: this.page.locator('rect.border') });
              checkboxCount = await checkboxes.count();
              console.log(`Found ${checkboxCount} SVG elements with checkbox rects`);
            }
          }
        } else {
          // Strategy 4: Try to find clickable elements that might contain checkboxes
          // Look for elements with checkbox-related classes or attributes
          const customCheckboxes = this.page.locator('[role="checkbox"], [aria-checked], .checkbox, [class*="checkbox"]');
          const customCount = await customCheckboxes.count();
          
          if (customCount > 0) {
            checkboxes = customCheckboxes;
            checkboxCount = customCount;
            console.log(`Found ${checkboxCount} custom checkbox elements`);
          }
        }
      }
    }
    
    if (!checkboxes || checkboxCount === 0) {
      // If no checkboxes found, try to get more info for debugging
      console.log('No checkboxes found. Attempting to find all checkbox-related elements...');
      
      // Try to find SVG rect elements
      const svgRects = await this.page.locator('svg rect').count();
      console.log(`Found ${svgRects} SVG rect elements`);
      
      // Try to find all input elements
      const allInputs = await this.page.locator('input').count();
      console.log(`Found ${allInputs} total input elements on the page`);
      
      // Try to find elements with checkbox-related attributes
      const roleCheckboxes = await this.page.locator('[role="checkbox"]').count();
      console.log(`Found ${roleCheckboxes} elements with role="checkbox"`);
      
      // Try to find SVG elements
      const svgElements = await this.page.locator('svg').count();
      console.log(`Found ${svgElements} SVG elements`);
      
      // Look for SVG rect elements with border class
      const borderRects = await this.page.locator('svg rect.border, svg rect[class*="border"]').count();
      console.log(`Found ${borderRects} SVG rect elements with border class`);
      
      // Try to find the parent elements of SVG rects with border class
      if (borderRects > 0) {
        console.log('Attempting to find parent elements of SVG checkbox rects...');
        
        // Strategy: Find buttons that contain SVG with rect.border
        const buttonsWithSvg = this.page.locator('button:has(svg rect.border)');
        const buttonCount = await buttonsWithSvg.count();
        console.log(`Found ${buttonCount} buttons containing SVG checkbox rects`);
        
        if (buttonCount > 0) {
          checkboxes = buttonsWithSvg;
          checkboxCount = buttonCount;
          console.log(`Using buttons containing SVG checkboxes: ${checkboxCount} found`);
        } else {
          // Try using XPath to find parent buttons
          const parentButtons = this.page.locator('svg rect.border').locator('xpath=ancestor::button[1]');
          const parentButtonCount = await parentButtons.count();
          console.log(`Found ${parentButtonCount} parent buttons using XPath`);
          
          if (parentButtonCount > 0) {
            checkboxes = parentButtons;
            checkboxCount = parentButtonCount;
            console.log(`Using XPath to find parent buttons: ${checkboxCount} found`);
          } else {
            // Try clicking the SVG elements that contain the rect.border
            const svgWithBorder = this.page.locator('svg').filter({ has: this.page.locator('rect.border') });
            const svgCount = await svgWithBorder.count();
            console.log(`Found ${svgCount} SVG elements containing rect.border`);
            
            if (svgCount > 0) {
              checkboxes = svgWithBorder;
              checkboxCount = svgCount;
              console.log(`Using SVG elements as checkboxes: ${checkboxCount} found`);
            }
          }
        }
      }
      
      if (!checkboxes || checkboxCount === 0) {
        throw new Error(`No checkboxes found on registration page. Please check the page structure.`);
      }
    }
    
    console.log(`Selecting ${checkboxCount} checkboxes...`);
    
    // Select all visible checkboxes
    for (let i = 0; i < checkboxCount; i++) {
      const checkbox = checkboxes.nth(i);
      const isVisible = await checkbox.isVisible().catch(() => false);
      
      if (isVisible) {
        // Get checkbox info for debugging
        const tagName = await checkbox.evaluate((el) => el.tagName).catch(() => '');
        const className = await checkbox.getAttribute('class').catch(() => '');
        const role = await checkbox.getAttribute('role').catch(() => '');
        const ariaChecked = await checkbox.getAttribute('aria-checked').catch(() => '');
        
        console.log(`Processing checkbox ${i + 1}: tag="${tagName}", class="${className}", role="${role}", aria-checked="${ariaChecked}"`);
        
        // Check if it's already checked (for standard checkboxes)
        let isChecked = false;
        if (tagName.toLowerCase() === 'input') {
          isChecked = await checkbox.isChecked().catch(() => false);
        } else {
          // For custom checkboxes, check aria-checked or other attributes
          isChecked = ariaChecked === 'true';
        }
        
        if (!isChecked) {
          // Scroll checkbox into view if needed
          await checkbox.scrollIntoViewIfNeeded();
          // Wait a moment before clicking
          await this.page.waitForTimeout(300);
          
          // Click the checkbox (works for both standard and custom checkboxes)
          await checkbox.click({ force: true });
          // Wait a moment for the checkbox state to update
          await this.page.waitForTimeout(500);
          
          // Verify it was checked
          if (tagName.toLowerCase() === 'input') {
            const nowChecked = await checkbox.isChecked().catch(() => false);
            if (nowChecked) {
              console.log(`✓ Checkbox ${i + 1} successfully checked`);
            } else {
              console.log(`✗ Checkbox ${i + 1} failed to check, trying again...`);
              // Try one more time
              await checkbox.click({ force: true });
              await this.page.waitForTimeout(500);
            }
          } else {
            // For custom checkboxes, check if aria-checked changed
            const newAriaChecked = await checkbox.getAttribute('aria-checked').catch(() => '');
            if (newAriaChecked === 'true') {
              console.log(`✓ Custom checkbox ${i + 1} successfully checked`);
            } else {
              console.log(`✓ Custom checkbox ${i + 1} clicked (may not have aria-checked attribute)`);
            }
          }
        } else {
          console.log(`✓ Checkbox ${i + 1} already checked`);
        }
      }
    }
    
    // Wait a moment for all checkboxes to be processed
    await this.page.waitForTimeout(1000);
    
    console.log('All checkboxes processed');
  }

  /**
   * Submit the registration form
   * Assumes checkboxes are already selected
   */
  async submit() {
    // Wait for submit button to be visible
    await this.submitButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for submit button to be enabled (it becomes enabled after checkboxes are selected)
    await this.submitButton.waitFor({ state: 'attached', timeout: 10000 });
    
    // Check if button is enabled, if not wait a bit more
    const isEnabled = await this.submitButton.isEnabled().catch(() => false);
    
    if (!isEnabled) {
      console.log('Submit button not enabled yet, waiting...');
      // Wait for button to become enabled (checkboxes might need more time)
      await this.page.waitForTimeout(1000);
      
      // Try waiting for button to be enabled with a timeout
      let attempts = 0;
      while (attempts < 10) {
        const enabled = await this.submitButton.isEnabled().catch(() => false);
        if (enabled) {
          break;
        }
        await this.page.waitForTimeout(500);
        attempts++;
      }
    }
    
    // Verify button is enabled before clicking
    const finalEnabled = await this.submitButton.isEnabled().catch(() => false);
    if (!finalEnabled) {
      throw new Error('Submit button is not enabled. Make sure all required checkboxes are selected.');
    }
    
    // Scroll button into view
    await this.submitButton.scrollIntoViewIfNeeded();
    
    // Wait a moment for form validation
    await this.page.waitForTimeout(500);
    
    // Click submit
    await this.submitButton.click({ force: true });
    
    // Wait for navigation after registration
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000); // Give time for registration to complete
  }

  /**
   * Complete the full registration process
   * @param firstName Legal first name
   * @param lastName Legal last name
   * @param email Email address
   * @param phoneNumber Phone number
   * @param password Password (default: YourTestPassword!)
   */
  async register(
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    password: string = 'YourTestPassword!'
  ) {
    // Step 1: Navigate to sign-in page and click Join
    await this.goto();
    
    // Step 2: Fill out registration form
    await this.fillRegistrationForm(firstName, lastName, email, phoneNumber, password);
    
    // Step 3: Select all checkboxes (REQUIRED - submit button won't be enabled until all checkboxes are selected)
    console.log('Selecting all required checkboxes...');
    await this.selectAllCheckboxes();
    
    // Step 4: Wait for submit button to be visible and enabled (it becomes enabled after checkboxes are selected)
    console.log('Waiting for submit button to be enabled...');
    await this.submitButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Step 5: Submit the form
    console.log('Submitting registration form...');
    await this.submit();
  }

  /**
   * Check if registration was successful
   * Waits for navigation away from registration page or success indicators
   */
  async isRegistrationSuccessful(): Promise<boolean> {
    // Wait for navigation away from registration page (with timeout)
    try {
      // Wait for URL to change away from registration/sign-in page
      await this.page.waitForURL(
        (url) => {
          const urlString = url.toString();
          return !urlString.includes('/sign-in') && !urlString.includes('/register') && !urlString.includes('/join');
        },
        { timeout: 10000 }
      ).catch(() => {
        // If URL wait fails, check current state
      });
    } catch (e) {
      // URL wait failed, continue to check current state
    }
    
    // Wait a moment for page to settle
    await this.page.waitForTimeout(1000).catch(() => {});
    
    const currentUrl = this.page.url();
    
    // If we're no longer on registration/sign-in page, registration likely succeeded
    if (!currentUrl.includes('/sign-in') && !currentUrl.includes('/register') && !currentUrl.includes('/join')) {
      return true;
    }
    
    // Check for success indicators (dashboard, home, etc.)
    const successIndicators = [
      this.page.locator('text=/welcome/i'),
      this.page.locator('text=/dashboard/i'),
      this.page.locator('text=/select.*scan/i'),
      this.page.locator('text=Home'),
      this.page.locator('text=Reports'),
    ];
    
    for (const indicator of successIndicators) {
      const isVisible = await indicator.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        return true;
      }
    }
    
    // Check for error messages on registration page
    const errorIndicators = [
      this.page.locator('text=/error/i'),
      this.page.locator('text=/invalid/i'),
      this.page.locator('text=/already exists/i'),
      this.page.locator('text=/duplicate/i'),
    ];
    
    for (const indicator of errorIndicators) {
      const isVisible = await indicator.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        const errorText = await indicator.textContent().catch(() => '');
        console.log(`Registration error detected: ${errorText}`);
        return false;
      }
    }
    
    // If still on registration page and no errors, registration might still be processing
    // or might have failed silently - return false to be safe
    return false;
  }
}


