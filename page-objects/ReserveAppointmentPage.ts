import { Page, Locator } from '@playwright/test';
import { acceptCookies } from '../utils/cookie-handler';

/**
 * Page Object Model for Reserve Your Appointment Page (Payment)
 * 
 * This page is the third step in the booking flow where users:
 * - Select payment method (Card, Affirm, Bank)
 * - Enter payment card details
 * - Review appointment summary
 * - Apply promo codes
 * - Complete payment
 */
export class ReserveAppointmentPage {
  page: Page;
  readonly cardPaymentMethod: Locator;
  readonly affirmPaymentMethod: Locator;
  readonly bankPaymentMethod: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly promoCodeInput: Locator;
  readonly applyCodeButton: Locator;
  readonly appointmentSummary: Locator;
  readonly totalAmount: Locator;
  readonly paymentConfirmation: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Payment method selection
    this.cardPaymentMethod = page.locator('input[type="radio"][value*="card"], input[type="radio"][name*="payment"][value*="card"]').first();
    this.affirmPaymentMethod = page.locator('input[type="radio"][value*="affirm"], input[type="radio"][name*="payment"][value*="affirm"]').first();
    this.bankPaymentMethod = page.locator('input[type="radio"][value*="bank"], input[type="radio"][name*="payment"][value*="bank"]').first();

    // Navigation buttons
    this.continueButton = page.locator('[data-test="submit"]');
    this.backButton = page.locator('button:has-text("Back")').first();
    
    // Promo code section
    this.promoCodeInput = page.locator('input[name*="promo"], input[id*="promo"], input[placeholder*="Promo"]').first();
    this.applyCodeButton = page.locator('button:has-text("Apply")').first();
    
    // Appointment summary
    this.appointmentSummary = page.locator('.appointment-summary, [data-testid="appointment-summary"]').first();
    this.totalAmount = page.locator('text=/Total/').locator('..').locator('paragraph').filter({ hasText: /\$\d+/ }).first();
    
    // Payment confirmation
    this.paymentConfirmation = page.locator('.payment-confirmation, [data-testid="payment-confirmation"]').first();
    
    // Error messages
    this.errorMessage = page.locator('alert, .error, .alert-error, [role="alert"]').first();
  }

  /** Ensure the payment page is ready (cookies handled, Stripe iframe present) */
  async waitUntilReady() {
    if (this.page.isClosed()) {
      const context = this.page.context();
      const freshPage = context.pages().find((p) => !p.isClosed()) ?? await context.newPage();
      this.page = freshPage;
      await this.page.goto('/reserve-appointment', { waitUntil: 'domcontentloaded' });
    }

    await this.page.waitForLoadState('domcontentloaded');
    await acceptCookies(this.page).catch(() => {});

    // Wait for Stripe iframe or payment form to be available
    await this.page.waitForSelector(
      'iframe[name^="__privateStripeFrame"], iframe[src*="stripe"], [data-testid="payment-form"]',
      { timeout: 15000 }
    ).catch(() => {
      console.log('⚠ Stripe iframe not detected within timeout – continuing, payment fields may appear later.');
    });
  }

  /**
   * Navigate to the Reserve Appointment (Payment) page
   */
  async goto() {
    if (this.page.isClosed()) {
      await this.waitUntilReady();
    }

    const currentUrl = this.page.url();
    const isOnPaymentPage = currentUrl.includes('/reserve') || 
                            currentUrl.includes('reserve-appointment') ||
                            currentUrl.includes('payment') ||
                            currentUrl.includes('appointment');
    
    if (isOnPaymentPage) {
      await this.waitUntilReady();
      return;
    }
    
    await this.page.goto('/reserve-appointment');
    await this.waitUntilReady();
  }

  /**
   * Select payment method
   */
  async selectPaymentMethod(method: 'card' | 'affirm' | 'bank') {
    switch (method) {
      case 'card':
        await this.cardPaymentMethod.click();
        break;
      case 'affirm':
        await this.affirmPaymentMethod.click();
        break;
      case 'bank':
        await this.bankPaymentMethod.click();
        break;
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Get Stripe iframe frame
   */
  async getStripeFrame() {
    if (this.page.isClosed()) {
      throw new Error('Payment page is no longer available (page closed).');
    }

    const deadline = Date.now() + 15000;

    const findStripeFrame = async () => {
      const frames = this.page.frames().filter((frame) => frame !== this.page.mainFrame());
      for (const frame of frames) {
        const hasStripeField = await frame
          .getByRole('textbox', { name: 'Card number' })
          .isVisible({ timeout: 2000 })
          .catch(() => false);
        if (hasStripeField) {
          return frame;
        }
      }
      return null;
    };

    let stripeFrame = await findStripeFrame();
    while (!stripeFrame && Date.now() < deadline && !this.page.isClosed()) {
      await this.page.waitForTimeout(250).catch(() => {});
      stripeFrame = await findStripeFrame();
    }

    if (!stripeFrame) {
      throw new Error('Could not find Stripe iframe. Make sure you are on the payment page.');
    }

    return stripeFrame;
  }

  /**
   * Fill payment card details in Stripe iframe
   */
  async fillPaymentDetails(
    cardNumber: string,
    expiry: string,
    email: string,
    phoneNumber: string ,
    cvv: string ,
    zipCode: string ,
  ) {
    const stripeFrame = await this.getStripeFrame();
    
    // Wait for iframe to be ready
    try {
      await stripeFrame.getByRole('textbox').first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.log('⚠ Waiting for iframe content to load...');
      await stripeFrame.waitForTimeout(2000);
    }
    
    // 1. Fill card number
    console.log('Filling card number...');
    const cardNumberField = stripeFrame.getByRole('textbox', { name: 'Card number' });
    await cardNumberField.waitFor({ state: 'visible', timeout: 10000 });
    await cardNumberField.scrollIntoViewIfNeeded();
    await cardNumberField.click({ timeout: 10000 });
    
    // Clear any existing value
    await cardNumberField.press('Control+A');
    await cardNumberField.press('Backspace');
    await stripeFrame.waitForTimeout(300);
    
    // Use fill() instead of pressSequentially() - Stripe handles formatting
    await cardNumberField.fill(cardNumber);
    
    // Wait for Stripe to auto-format the card number
    await stripeFrame.waitForTimeout(1500);
    
    // Verify card number was entered - Stripe adds spaces, so check without spaces
    const cardValue = await cardNumberField.inputValue();
    const digitsOnly = cardValue.replace(/\s/g, '');
    console.log(`Card value entered: "${cardValue}" (${digitsOnly.length} digits)`);
    
    if (!cardValue || digitsOnly.length < 15) {
      // Try one more time with slower input
      console.log('Retrying card number entry...');
      await cardNumberField.click();
      await cardNumberField.press('Control+A');
      await cardNumberField.press('Backspace');
      await stripeFrame.waitForTimeout(500);
      
      // Type character by character as fallback
      for (const char of cardNumber) {
        await cardNumberField.type(char, { delay: 100 });
      }
      
      await stripeFrame.waitForTimeout(2000);
      const retryValue = await cardNumberField.inputValue();
      const retryDigits = retryValue.replace(/\s/g, '');
      
      if (retryDigits.length < 15) {
        throw new Error(`Card number not filled correctly after retry. Current value: "${retryValue}" (${retryDigits.length} digits)`);
      }
    }
    
    console.log('✓ Card number filled and validated');
    
    // Trigger blur to complete Stripe validation
    await cardNumberField.blur();
    await stripeFrame.waitForTimeout(1000);

    // 2. Fill expiry date
    console.log('Filling expiry date...');
    const expiryField = stripeFrame.getByRole('textbox', { name: 'Expiration date MM / YY' }).or(
      stripeFrame.getByRole('textbox', { name: /Expiration.*MM.*YY/i })
    ).first();
    await expiryField.waitFor({ state: 'visible', timeout: 10000 });
    await expiryField.scrollIntoViewIfNeeded();
    await expiryField.click({ timeout: 10000 });
    await expiryField.fill(expiry);
    await expiryField.blur();
    await stripeFrame.waitForTimeout(800);
    
    // Verify expiry was entered
    const expiryValue = await expiryField.inputValue();
    if (!expiryValue || expiryValue.replace(/\s|\//g, '').length < 4) {
      throw new Error(`Expiry not filled correctly. Current value: ${expiryValue}`);
    }
    console.log('✓ Expiry date filled and validated');
    
    // 3. Fill security code (CVV)
    console.log('Filling security code...');
    const cvvField = stripeFrame.getByRole('textbox', { name: 'CVC' }).or(
      stripeFrame.getByRole('textbox', { name: 'Security code' })
    ).first();
    await cvvField.waitFor({ state: 'visible', timeout: 10000 });
    await cvvField.scrollIntoViewIfNeeded();
    await cvvField.click({ timeout: 10000 });
    await cvvField.fill(cvv);
    await cvvField.blur();
    await stripeFrame.waitForTimeout(800);
    
    // Verify CVV was entered
    const cvvValue = await cvvField.inputValue();
    if (!cvvValue || cvvValue.length < 3) {
      throw new Error(`CVV not filled correctly. Current value: ${cvvValue}`);
    }
    console.log('✓ Security code filled and validated');
    
    // 4. Fill ZIP code
    console.log('Filling ZIP code...');
    const zipField = stripeFrame.getByRole('textbox', { name: 'ZIP code' });
    await zipField.waitFor({ state: 'visible', timeout: 10000 });
    await zipField.click();
    await zipField.fill(zipCode);
    await zipField.blur();
    await stripeFrame.waitForTimeout(1000);
    
    // Verify ZIP was entered
    const zipValue = await zipField.inputValue();
    if (!zipValue || zipValue.length < 5) {
      throw new Error(`ZIP code not filled correctly. Current value: ${zipValue}`);
    }
    console.log('✓ ZIP code filled and validated');

    // 5. Fill email and phone number if Stripe reveals those fields after ZIP
    console.log('Checking for email and phone fields...');
    const emailLocator = stripeFrame
      .getByRole('textbox', { name: /^Email\b/i })
      .or(stripeFrame.locator('input[type="email"]'))
      .or(stripeFrame.getByPlaceholder(/email/i));
    const emailCount = await emailLocator.count();
    if (emailCount > 0) {
      console.log('Filling email...');
      const emailField = emailLocator.first();
      await emailField.waitFor({ state: 'visible', timeout: 7000 });
      await emailField.scrollIntoViewIfNeeded();
      await emailField.fill(email);
      await emailField.blur();
      const emailValue = await emailField.inputValue();
      if (!emailValue) {
        throw new Error('Email not filled correctly – field value empty after fill.');
      }
      console.log('✓ Email filled and validated');
      await stripeFrame.waitForTimeout(500);
    } else {
      console.log('⚠ Email field not present after ZIP entry – skipping.');
    }

    const phoneLocator = stripeFrame
      .getByRole('textbox', { name: /phone/i })
      .or(stripeFrame.locator('input[type="tel"]'))
      .or(stripeFrame.getByPlaceholder(/phone/i));
    const phoneCount = await phoneLocator.count();
    if (phoneCount > 0) {
      console.log('Filling phone number...');
      const phoneField = phoneLocator.first();
      await phoneField.waitFor({ state: 'visible', timeout: 7000 });
      await phoneField.scrollIntoViewIfNeeded();
      await phoneField.fill(phoneNumber);
      await phoneField.blur();
      const phoneValue = await phoneField.inputValue();
      if (!phoneValue) {
        throw new Error('Phone number not filled correctly – field value empty after fill.');
      }
      console.log('✓ Phone number filled and validated');
      await stripeFrame.waitForTimeout(500);
    } else {
      console.log('⚠ Phone number field not present – skipping.');
    }

    // 6. Select country (required for billing)
    console.log('Selecting country...');
    const countryCombo = stripeFrame.getByRole('combobox', { name: /Country/i });
    try {
      await countryCombo.waitFor({ state: 'visible', timeout: 10000 });
      const selectionStrategies = [
        () => countryCombo.selectOption('US'),
        () => countryCombo.selectOption({ value: 'US' }),
        () => countryCombo.selectOption({ label: 'United States' }),
        async () => {
          await countryCombo.click();
          const option = stripeFrame.getByRole('option', { name: /United States/i }).first();
          await option.waitFor({ state: 'visible', timeout: 5000 });
          await option.click();
        },
      ];

      let countrySelected = false;
      for (const attempt of selectionStrategies) {
        try {
          await attempt();
          countrySelected = true;
          await stripeFrame.waitForTimeout(1000);
          break;
        } catch (err) {
          continue;
        }
      }

      if (!countrySelected) {
        console.log('⚠ Unable to select country; field may already be set.');
      } else {
        console.log('✓ Country selected: United States');
      }
    } catch (err) {
      console.log('⚠ Country dropdown not found - continuing.');
    }
    
    // Final wait for Stripe to complete all validations
    await stripeFrame.waitForTimeout(2000);
    
    console.log('✓ All payment details filled successfully');
  }

  /**
   * Wait for payment form to be fully validated by Stripe
   */
  async waitForPaymentFormReady() {
    console.log('Waiting for payment form validation...');
    
    // Wait for Stripe to finish processing
    await this.page.waitForTimeout(2000);
    
    // Check if Continue button becomes enabled (if it was disabled)
    try {
      await this.continueButton.waitFor({ state: 'visible', timeout: 5000 });
      
      // Wait for button to be enabled (Stripe validation complete)
      let attempts = 0;
      while (attempts < 20) {
        const isEnabled = await this.continueButton.isEnabled();
        if (isEnabled) {
          console.log('✓ Payment form validated, Continue button enabled');
          return;
        }
        await this.page.waitForTimeout(500);
        attempts++;
      }
      
      console.log('⚠ Continue button still disabled after waiting');
    } catch (e) {
      console.log('⚠ Could not verify Continue button state');
    }
  }

  /**
   * Apply promo code
   */
  async applyPromoCode(promoCode: string) {
    await this.promoCodeInput.fill(promoCode);
    await this.applyCodeButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Click Continue button to process payment
   */
  async clickContinue() {
    await this.continueButton.click();
    await this.page.waitForTimeout(6000);
  }

  /**
   * Click Back button to return to scheduling
   */
  async clickBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if Continue button is enabled
   */
  async isContinueButtonEnabled(): Promise<boolean> {
    return await this.continueButton.isEnabled();
  }

  /**
   * Get total amount from appointment summary
   */
  async getTotalAmount(): Promise<string | null> {
    try {
      // Strategy 1: Find any element containing price pattern
      const anyPrice = this.page.locator('text=/\\$[0-9,]+/').first();
      const anyPriceVisible = await anyPrice.isVisible({ timeout: 10000 }).catch(() => false);
      if (anyPriceVisible) {
        const text = await anyPrice.textContent();
        if (text) {
          const priceMatch = text.match(/\$[0-9,]+/);
          if (priceMatch) {
            return priceMatch[0];
          }
          return text.trim();
        }
      }
      
      // Strategy 2: Find the "Total" label
      const totalLabel = this.page.getByText('Total', { exact: true }).first();
      const isLabelVisible = await totalLabel.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isLabelVisible) {
        const parent = totalLabel.locator('..');
        const priceInParent = parent.locator('text=/\\$[0-9,]+/').first();
        const priceText = await priceInParent.textContent({ timeout: 5000 }).catch(() => null);
        if (priceText) {
          const priceMatch = priceText.match(/\$[0-9,]+/);
          if (priceMatch) {
            return priceMatch[0];
          }
          return priceText.trim();
        }
      }
      
      // Strategy 3: Find any paragraph containing price
      const pricePattern = this.page.locator('p').filter({ hasText: /\$\d+/ }).first();
      const priceVisible = await pricePattern.isVisible({ timeout: 5000 }).catch(() => false);
      if (priceVisible) {
        const text = await pricePattern.textContent();
        if (text && text.includes('$')) {
          const priceMatch = text.match(/\$[0-9,]+/);
          if (priceMatch) {
            return priceMatch[0];
          }
          return text.trim();
        }
      }
      
      return null;
    } catch (e) {
      console.log('⚠ Could not find total amount:', e);
      return null;
    }
  }

  /**
   * Verify payment confirmation is displayed
   */
  async isPaymentConfirmed(): Promise<boolean> {
    return await this.paymentConfirmation.isVisible().catch(() => false);
  }

  /**
   * Get error message if payment fails
   */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.errorMessage.isVisible().catch(() => false);
    if (isVisible) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}