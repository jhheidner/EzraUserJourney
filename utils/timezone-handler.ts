import { Page, Locator } from '@playwright/test';

/**
 * Timezone Handler
 * 
 * Utility to handle timezone confirmation pop-ups that appear after login.
 * This should be called after successful login.
 */

/**
 * Handle timezone confirmation pop-up if present
 * @param page Playwright page object
 * @param action 'confirm' to confirm with default, 'close' to close, or 'skip' to skip if not present
 */
export async function handleTimezonePopup(
  page: Page,
  action: 'confirm' | 'close' | 'skip' = 'confirm'
): Promise<void> {
  try {
    if (page.isClosed()) {
      return;
    }

    console.log('Checking for timezone pop-up...');
    
    // First, wait a moment for any pop-ups to appear
    await page.waitForTimeout(1000);
    
    // Check for timezone pop-up using multiple strategies
    // Strategy 1: Wait for the specific timezone modal class
    const timezoneModal = page.locator('.timezone-modal, [class*="timezone-modal"]').first();
    
    // Strategy 2: Wait for text indicating timezone pop-up
    const timezoneTitle = page.locator('text=/Confirm your time zone/i').first();
    
    // Strategy 3: Wait for any modal/dialog
    const anyModal = page.locator('.modal-dialogue, [class*="modal"], [role="dialog"]').first();
    
    // Check which one is actually visible (don't wait, just check current state)
    let popup: Locator | null = null;
    const isTimezoneModalVisible = await timezoneModal.isVisible({ timeout: 2000 }).catch(() => false);
    const isTitleVisible = await timezoneTitle.isVisible({ timeout: 2000 }).catch(() => false);
    const isAnyModalVisible = await anyModal.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isTimezoneModalVisible) {
      popup = timezoneModal;
      console.log('✓ Found timezone modal using .timezone-modal class');
    } else if (isTitleVisible) {
      // Find the modal containing the title
      popup = timezoneTitle.locator('xpath=ancestor::*[contains(@class, "modal") or contains(@class, "dialog")][1]');
      const popupVisible = await popup.isVisible({ timeout: 2000 }).catch(() => false);
      if (!popupVisible) {
        popup = anyModal;
      }
      console.log('✓ Found timezone modal using title text');
    } else if (isAnyModalVisible) {
      // Verify this modal contains timezone-related text
      const modalText = await anyModal.textContent().catch(() => '') || '';
      if (modalText.toLowerCase().includes('time zone') || modalText.toLowerCase().includes('timezone')) {
        popup = anyModal;
        console.log('✓ Found timezone modal using generic selector (contains timezone text)');
      } else {
        console.log('Found a modal, but it does not appear to be the timezone pop-up');
        if (modalText) {
          console.log(`  Modal text: ${modalText.substring(0, 100)}...`);
        }
      }
    }
    
    if (!popup) {
      console.log('No timezone pop-up found, continuing...');
      return;
    }
    
    // Verify pop-up is actually visible
    const popupVisible = await popup.isVisible({ timeout: 2000 }).catch(() => false);
    if (!popupVisible) {
      console.log('Timezone pop-up not visible, continuing...');
      return;
    }
    
    console.log('Timezone pop-up is visible, attempting to handle...');

    // Handle the pop-up based on action
    if (action === 'confirm') {
      // Strategy 0: Use the exact CSS selector provided by the user
      // Selector: button.basic.small.yellow within .timezone-modal__btn-bar
      try {
        if (!page.isClosed()) {
          console.log('Attempting to find Confirm button using specific selectors...');
          
          // Try multiple selector variations - MUST be within timezone modal to avoid clicking Sign out button
          const selectors = [
            '.timezone-modal__btn-bar button.basic.small.yellow:has-text("Confirm")',
            '.timezone-modal button.basic.small.yellow:has-text("Confirm")',
            '.timezone-modal__btn-bar button:has-text("Confirm")',
            '.timezone-modal button:has-text("Confirm")',
            popup.locator('button:has-text("Confirm")').first(),
            popup.locator('.timezone-modal__btn-bar button').last(), // Last button in btn-bar is usually Confirm
            popup.locator('button').last() // Last button in popup is usually Confirm
          ];
          
          for (let i = 0; i < selectors.length; i++) {
            try {
              if (page.isClosed()) {
                return;
              }
              
              const selector = selectors[i];
              let confirmButton: Locator;
              
              if (typeof selector === 'string') {
                confirmButton = page.locator(selector).first();
              } else {
                confirmButton = selector;
              }
              
              // Wait for button to be visible and enabled
              const isVisible = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
              
              if (isVisible) {
                // CRITICAL: Verify button text is "Confirm" and NOT "Sign out" or "Logout"
                const buttonText = await confirmButton.textContent().catch(() => '');
                const normalizedText = buttonText?.toLowerCase().trim() || '';
                
                // Check if this is actually a Sign out button (should NOT click it!)
                if (normalizedText.includes('sign out') || normalizedText.includes('logout') || normalizedText.includes('log out')) {
                  console.log(`⚠ Skipping button - appears to be Sign out button: "${buttonText}"`);
                  continue; // Skip this button, try next selector
                }
                
                // Verify it's a Confirm button (unless it's the last button in popup, which is usually Confirm)
                const isConfirmButton = normalizedText.includes('confirm') || 
                                       (i >= selectors.length - 2 && popup); // Last 2 selectors are fallbacks
                
                if (!isConfirmButton && i < selectors.length - 2) {
                  console.log(`⚠ Skipping button - text doesn't match "Confirm": "${buttonText}"`);
                  continue; // Skip this button, try next selector
                }
                
                const isEnabled = await confirmButton.isEnabled().catch(() => true);
                
                if (isEnabled) {
                  console.log(`✓ Found Confirm button using selector ${i + 1}: ${typeof selector === 'string' ? selector : 'popup locator'} (text: "${buttonText}")`);
                  
                  // Wait for button to be stable (not animating)
                  await page.waitForTimeout(500);
                  
                  // Scroll into view
                  await confirmButton.scrollIntoViewIfNeeded();
                  await page.waitForTimeout(500);
                  
                  // Double-check button is still visible and enabled
                  const stillVisible = await confirmButton.isVisible().catch(() => false);
                  const stillEnabled = await confirmButton.isEnabled().catch(() => true);
                  
                  if (!stillVisible || !stillEnabled) {
                    console.log('⚠ Button became invisible or disabled, trying next selector...');
                    continue;
                  }
                  
                  // Click the button
                  console.log('Clicking Confirm button...');
                  
                  // Capture current URL before clicking
                  const urlBeforeClick = page.url();
                  
                  // Try clicking with multiple strategies
                  try {
                    await confirmButton.click({ timeout: 10000, force: true });
                  } catch (clickError) {
                    // If regular click fails, try JavaScript click
                    console.log('Regular click failed, trying JavaScript click...');
                    await confirmButton.evaluate((el: any) => {
                      if (el && typeof el.click === 'function') {
                        el.click();
                      }
                    });
                  }
                  
                  // Wait for pop-up to close or navigation
                  await page.waitForTimeout(2000);
                  
                  // Check if we were redirected to login page (unexpected behavior)
                  if (!page.isClosed()) {
                    const urlAfterClick = page.url();
                    const redirectedToLogin = urlAfterClick.includes('/login') || 
                                             urlAfterClick.includes('/sign-in') || 
                                             urlAfterClick.includes('/signin');
                    
                    if (redirectedToLogin && !urlBeforeClick.includes('/login') && !urlBeforeClick.includes('/sign-in')) {
                      console.log('⚠ WARNING: Clicking Confirm redirected to login page. This may indicate a bug in the application.');
                      console.log(`   Before: ${urlBeforeClick}`);
                      console.log(`   After: ${urlAfterClick}`);
                      // Pop-up is gone (we're on login page), but this is unexpected
                      return; // Return anyway since pop-up is closed
                    }
                  }
                  
                  // Verify pop-up is gone
                  if (!page.isClosed() && popup) {
                    const popupStillVisible = await popup.isVisible({ timeout: 2000 }).catch(() => false);
                    if (!popupStillVisible) {
                      console.log('✓ Timezone pop-up closed successfully!');
                      return; // Success!
                    } else {
                      console.log('⚠ Pop-up still visible after click, trying next selector...');
                      continue;
                    }
                  } else {
                    console.log('✓ Page navigated or closed, assuming success');
                    return; // Success!
                  }
                }
              }
            } catch (e) {
              console.log(`Selector ${i + 1} failed: ${e}`);
              continue; // Try next selector
            }
          }
          
          console.log('⚠ All specific selectors failed, trying fallback strategies...');
        }
      } catch (e) {
        console.log('Specific selector strategy failed:', e);
        // Continue to fallback strategies
      }
      
      // Strategy 1: Direct approach - find the Confirm button by exact text match
      // Based on the page snapshot, the button is at ref=e57 with text "Confirm"
      // Try multiple ways to find and click the Confirm button
      
      // First, try to find any visible Confirm button on the page (but MUST be within timezone modal)
      const confirmButtons = popup ? popup.locator('button:has-text("Confirm")') : page.locator('.timezone-modal button:has-text("Confirm")');
      const confirmCount = await confirmButtons.count().catch(() => 0);
      
      for (let i = 0; i < confirmCount; i++) {
        try {
          // Check if page is still open
          if (page.isClosed()) {
            return;
          }
          
          const confirmButton = confirmButtons.nth(i);
          const isVisible = await confirmButton.isVisible().catch(() => false);
          
          if (isVisible) {
            // CRITICAL: Verify button text is "Confirm" and NOT "Sign out" or "Logout"
            const buttonText = await confirmButton.textContent().catch(() => '');
            const normalizedText = buttonText?.toLowerCase().trim() || '';
            
            // Check if this is actually a Sign out button (should NOT click it!)
            if (normalizedText.includes('sign out') || normalizedText.includes('logout') || normalizedText.includes('log out')) {
              console.log(`⚠ Skipping button in fallback - appears to be Sign out button: "${buttonText}"`);
              continue; // Skip this button, try next one
            }
            
            // Verify it's a Confirm button
            if (!normalizedText.includes('confirm')) {
              console.log(`⚠ Skipping button in fallback - text doesn't match "Confirm": "${buttonText}"`);
              continue; // Skip this button, try next one
            }
            
            // Check if this button is within the timezone pop-up
            // Get the button's bounding box
            const buttonBox = await confirmButton.boundingBox().catch(() => null);
            const popupBox = await popup?.boundingBox().catch(() => null);
            
            // If we have both boxes, check if button is within popup
            let shouldClick = true;
            if (buttonBox && popupBox) {
              shouldClick = (
                buttonBox.x >= popupBox.x &&
                buttonBox.y >= popupBox.y &&
                buttonBox.x + buttonBox.width <= popupBox.x + popupBox.width &&
                buttonBox.y + buttonBox.height <= popupBox.y + popupBox.height
              );
            }
            
            if (shouldClick) {
              console.log(`✓ Found Confirm button in fallback strategy (text: "${buttonText}")`);
              await confirmButton.scrollIntoViewIfNeeded();
              
              // Click and wait for navigation or pop-up to close
              // Use Promise.race to handle both navigation and pop-up closing
              const clickPromise = confirmButton.click({ timeout: 5000, force: true });
              
              // Wait for either navigation or pop-up to close
              await Promise.race([
                clickPromise,
                page.waitForTimeout(3000).catch(() => {})
              ]);
              
              // Wait for any navigation to complete
              if (!page.isClosed()) {
                try {
                  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
                } catch (e) {
                  // Navigation might have closed the page, that's okay
                }
                
                // Wait a bit for pop-up to close
                await page.waitForTimeout(1000).catch(() => {});
                
                // Verify pop-up is gone
                if (!page.isClosed()) {
                  const stillVisible = await popup.isVisible().catch(() => false);
                  if (!stillVisible) {
                    return; // Success!
                  }
                } else {
                  return; // Page closed, assume success (might have navigated)
                }
              } else {
                return; // Page closed, assume success (might have navigated)
              }
            }
          }
        } catch (e) {
          // Try next button
          continue;
        }
      }
      
      // Strategy 1b: If no button found, try clicking the last button in the pop-up
      // (Confirm is usually the last/rightmost button) - BUT verify it's not Sign out!
      try {
        if (!page.isClosed() && popup) {
          const allButtons = popup.locator('button');
          const buttonCount = await allButtons.count().catch(() => 0);
          
          if (buttonCount > 0) {
            const lastButton = allButtons.nth(buttonCount - 1);
            const isVisible = await lastButton.isVisible().catch(() => false);
            
            if (isVisible) {
              // CRITICAL: Verify button text is NOT "Sign out" or "Logout"
              const buttonText = await lastButton.textContent().catch(() => '');
              const normalizedText = buttonText?.toLowerCase().trim() || '';
              
              // Check if this is actually a Sign out button (should NOT click it!)
              if (normalizedText.includes('sign out') || normalizedText.includes('logout') || normalizedText.includes('log out')) {
                console.log(`⚠ Skipping last button - appears to be Sign out button: "${buttonText}"`);
                // Try the second-to-last button instead
                if (buttonCount > 1) {
                  const secondLastButton = allButtons.nth(buttonCount - 2);
                  const secondLastVisible = await secondLastButton.isVisible().catch(() => false);
                  if (secondLastVisible) {
                    const secondLastText = await secondLastButton.textContent().catch(() => '');
                    const secondLastNormalized = secondLastText?.toLowerCase().trim() || '';
                    if (!secondLastNormalized.includes('sign out') && !secondLastNormalized.includes('logout')) {
                      console.log(`✓ Using second-to-last button instead (text: "${secondLastText}")`);
                      await secondLastButton.scrollIntoViewIfNeeded();
                      const clickPromise = secondLastButton.click({ timeout: 5000, force: true });
                      await Promise.race([clickPromise, page.waitForTimeout(3000).catch(() => {})]);
                      await page.waitForTimeout(2000).catch(() => {});
                      return;
                    }
                  }
                }
                // If we can't find a safe button, skip this strategy
                throw new Error('Last button is Sign out, cannot use this strategy');
              }
              
              console.log(`✓ Using last button in popup (text: "${buttonText}")`);
              await lastButton.scrollIntoViewIfNeeded();
              
              // Click and wait for navigation or pop-up to close
              const clickPromise = lastButton.click({ timeout: 5000, force: true });
              
              // Wait for either navigation or pop-up to close
              await Promise.race([
                clickPromise,
                page.waitForTimeout(3000).catch(() => {})
              ]);
              
              // Wait for any navigation to complete
              if (!page.isClosed()) {
                try {
                  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
                } catch (e) {
                  // Navigation might have closed the page, that's okay
                }
                
                await page.waitForTimeout(1000).catch(() => {});
                const stillVisible = await popup.isVisible().catch(() => false);
                if (!stillVisible) {
                  return; // Success!
                }
              } else {
                return; // Page closed, assume success (might have navigated)
              }
            }
          }
        }
      } catch (e) {
        // Continue to next strategy
      }
      
      // Strategy 2: Find any visible "Confirm" button on the page (fallback) - MUST be in timezone modal
      const allConfirmButtonsFallback = popup ? popup.locator('button:has-text("Confirm")') : page.locator('.timezone-modal button:has-text("Confirm")');
      const confirmCountFallback = await allConfirmButtonsFallback.count().catch(() => 0);
      
      for (let i = 0; i < confirmCountFallback; i++) {
        // Check if page is still open
        if (page.isClosed()) {
          return;
        }
        
        const button = allConfirmButtonsFallback.nth(i);
        const isVisible = await button.isVisible().catch(() => false);
        if (isVisible) {
          // CRITICAL: Verify button text is NOT "Sign out" or "Logout"
          const buttonText = await button.textContent().catch(() => '');
          const normalizedText = buttonText?.toLowerCase().trim() || '';
          
          // Check if this is actually a Sign out button (should NOT click it!)
          if (normalizedText.includes('sign out') || normalizedText.includes('logout') || normalizedText.includes('log out')) {
            console.log(`⚠ Skipping button in Strategy 2 - appears to be Sign out button: "${buttonText}"`);
            continue; // Skip this button, try next one
          }
          
          // Verify it's a Confirm button
          if (!normalizedText.includes('confirm')) {
            console.log(`⚠ Skipping button in Strategy 2 - text doesn't match "Confirm": "${buttonText}"`);
            continue; // Skip this button, try next one
          }
          
          // Try to click it
          try {
            console.log(`✓ Found Confirm button in Strategy 2 (text: "${buttonText}")`);
            await button.scrollIntoViewIfNeeded();
            await button.click({ timeout: 5000, force: true });
            
            // Wait for pop-up to close
            if (!page.isClosed()) {
              await page.waitForTimeout(1500);
              // Verify pop-up is gone
              const stillVisible = await popup.isVisible().catch(() => false);
              if (!stillVisible) {
                return; // Success!
              }
            }
          } catch (e) {
            // Try next button
            continue;
          }
        }
      }
      
      // Strategy 3: Find button with "Confirm" text within the pop-up
      const confirmInPopup = popup.locator('button:has-text("Confirm")').first();
      const isConfirmInPopupVisible = await confirmInPopup.isVisible().catch(() => false);
      
      if (isConfirmInPopupVisible) {
        // CRITICAL: Verify button text is NOT "Sign out" or "Logout"
        const buttonText = await confirmInPopup.textContent().catch(() => '');
        const normalizedText = buttonText?.toLowerCase().trim() || '';
        
        // Check if this is actually a Sign out button (should NOT click it!)
        if (normalizedText.includes('sign out') || normalizedText.includes('logout') || normalizedText.includes('log out')) {
          console.log(`⚠ Skipping button in Strategy 3 - appears to be Sign out button: "${buttonText}"`);
        } else {
          console.log(`✓ Found Confirm button in Strategy 3 (text: "${buttonText}")`);
          await confirmInPopup.scrollIntoViewIfNeeded();
          await confirmInPopup.click({ timeout: 5000, force: true });
          if (!page.isClosed()) {
            await page.waitForTimeout(2000);
          }
          return;
        }
      }
      
      // Strategy 4: Find the last button in the pop-up (Confirm is usually last/rightmost) - BUT verify it's not Sign out!
      const allButtons = popup.locator('button');
      const buttonCount = await allButtons.count();
      if (buttonCount > 0) {
        const lastButton = allButtons.nth(buttonCount - 1);
        const isVisible = await lastButton.isVisible().catch(() => false);
        if (isVisible) {
          // CRITICAL: Verify button text is NOT "Sign out" or "Logout"
          const buttonText = await lastButton.textContent().catch(() => '');
          const normalizedText = buttonText?.toLowerCase().trim() || '';
          
          // Check if this is actually a Sign out button (should NOT click it!)
          if (normalizedText.includes('sign out') || normalizedText.includes('logout') || normalizedText.includes('log out')) {
            console.log(`⚠ Skipping last button in Strategy 4 - appears to be Sign out button: "${buttonText}"`);
            // Try the second-to-last button instead
            if (buttonCount > 1) {
              const secondLastButton = allButtons.nth(buttonCount - 2);
              const secondLastVisible = await secondLastButton.isVisible().catch(() => false);
              if (secondLastVisible) {
                const secondLastText = await secondLastButton.textContent().catch(() => '');
                const secondLastNormalized = secondLastText?.toLowerCase().trim() || '';
                if (!secondLastNormalized.includes('sign out') && !secondLastNormalized.includes('logout')) {
                  console.log(`✓ Using second-to-last button in Strategy 4 (text: "${secondLastText}")`);
                  await secondLastButton.scrollIntoViewIfNeeded();
                  await secondLastButton.click({ timeout: 5000 });
                  await page.waitForTimeout(2000);
                  return;
                }
              }
            }
            // If we can't find a safe button, skip this strategy
            return;
          }
          
          console.log(`✓ Using last button in Strategy 4 (text: "${buttonText}")`);
          await lastButton.scrollIntoViewIfNeeded();
          await lastButton.click({ timeout: 5000 });
          await page.waitForTimeout(2000);
          return;
        }
      }
      
      // Strategy 4: Try clicking by coordinates (last resort)
      // Get pop-up bounding box and click in the bottom-right area where Confirm usually is
      const popupBox = await popup.boundingBox().catch(() => null);
      if (popupBox) {
        // Click in bottom-right area (where Confirm button usually is)
        await page.mouse.click(
          popupBox.x + popupBox.width * 0.85, 
          popupBox.y + popupBox.height * 0.85
        );
        await page.waitForTimeout(2000);
        return;
      }
    } else if (action === 'close') {
      // Find and click the Close button
      const closeInPopup = popup.locator('button:has-text("Close")').first();
      const isCloseVisible = await closeInPopup.isVisible().catch(() => false);
      
      if (isCloseVisible) {
        await closeInPopup.click();
        await page.waitForTimeout(1500);
        return;
      }
    }
  } catch (error) {
    // If timezone pop-up doesn't exist or can't be clicked, that's okay
    console.log('Timezone pop-up not found or already handled:', error);
  }
}

/**
 * Check if timezone pop-up is visible
 * @param page Playwright page object
 * @returns true if timezone pop-up is visible
 */
export async function isTimezonePopupVisible(page: Page): Promise<boolean> {
  try {
    const timezonePopup = page.locator(
      'text="Confirm your time zone", [role="dialog"]:has-text("time zone"), .modal:has-text("time zone")'
    ).first();
    return await timezonePopup.isVisible().catch(() => false);
  } catch {
    return false;
  }
}

