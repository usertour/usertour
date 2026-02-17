import { autoBind, logger } from '@/utils';

/**
 * Custom input registration entry
 */
interface CustomInputRegistration {
  cssSelector: string;
  getValue?: (el: Element) => string;
}

/**
 * CustomInputRegistry manages custom input element registrations
 * Allows users to register custom input components (e.g., combo boxes, custom widgets)
 * so the SDK can read their values using custom logic
 */
export class CustomInputRegistry {
  private registrations: CustomInputRegistration[] = [];

  constructor() {
    autoBind(this);
  }

  /**
   * Registers a custom input with a CSS selector and optional getValue function
   * Later registrations can override earlier ones for the same selector
   * @param cssSelector - CSS selector to match custom input elements
   * @param getValue - Optional function to extract value from element (defaults to textContent)
   */
  register(cssSelector: string, getValue?: (el: Element) => string): void {
    if (!cssSelector || typeof cssSelector !== 'string') {
      throw new Error('cssSelector must be a non-empty string');
    }

    // Check if already registered and update, or add new
    const existingIndex = this.registrations.findIndex((reg) => reg.cssSelector === cssSelector);

    if (existingIndex !== -1) {
      // Update existing registration (last registration wins)
      this.registrations[existingIndex] = { cssSelector, getValue };
      logger.info(`Updated custom input registration: ${cssSelector}`);
    } else {
      // Add new registration
      this.registrations.push({ cssSelector, getValue });
      logger.info(`Registered custom input: ${cssSelector}`);
    }
  }

  /**
   * Checks if an element matches any registered custom input selector
   * Returns the matching registration if found
   * @param element - The element to check
   * @returns The matching registration or null
   */
  match(element: Element): CustomInputRegistration | null {
    // Iterate in reverse order so last registered has priority
    for (let i = this.registrations.length - 1; i >= 0; i--) {
      const reg = this.registrations[i];
      try {
        if (element.matches(reg.cssSelector)) {
          return reg;
        }
      } catch {
        // Invalid selector, skip
        logger.warn(`Invalid CSS selector in custom input registration: ${reg.cssSelector}`);
      }
    }
    return null;
  }

  /**
   * Gets the value of a custom input element
   * @param element - The element to get value from
   * @returns String value (empty string if no match or error)
   */
  getValue(element: Element): string {
    const registration = this.match(element);
    if (!registration) {
      return '';
    }

    try {
      if (registration.getValue) {
        // Use custom getValue function, force to string
        const result = registration.getValue(element);
        return String(result ?? '');
      }
      // Default: use textContent
      return element.textContent?.trim() || '';
    } catch (error) {
      logger.error('Error getting custom input value:', error);
      return '';
    }
  }

  /**
   * Checks if an element is a registered custom input
   * @param element - The element to check
   * @returns true if element matches any registration
   */
  isCustomInput(element: Element): boolean {
    return this.match(element) !== null;
  }

  /**
   * Clears all registrations
   */
  clear(): void {
    this.registrations = [];
    logger.info('Cleared all custom input registrations');
  }

  /**
   * Gets count of registered custom inputs
   */
  getCount(): number {
    return this.registrations.length;
  }
}

// Export singleton instance
export const customInputRegistry = new CustomInputRegistry();
