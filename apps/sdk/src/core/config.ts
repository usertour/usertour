import {
  ContentConfigObject,
  ContentPriority,
  RulesCondition,
  autoStartRulesSetting,
} from '@usertour-ui/types';
import autoBind from '../utils/auto-bind';
import { activedRulesConditions, isActive } from '../utils/conditions';
import { Evented } from './evented';

/**
 * Config class manages the configuration settings for UserTour content
 * Extends Evented to support event handling functionality
 */
export class Config extends Evented {
  private config: ContentConfigObject;
  constructor(config: ContentConfigObject) {
    super();
    autoBind(this);
    this.config = config;
  }

  /**
   * Checks if there is a wait time configured
   * @returns {boolean} True if wait time is greater than 0
   */
  isWait(): boolean {
    return this.getWaitTime() > 0;
  }

  /**
   * Gets the priority level for auto-start rules
   * @returns {ContentPriority} The configured priority level, defaults to MEDIUM
   */
  getPriority(): ContentPriority {
    return this.config.autoStartRulesSetting?.priority ?? ContentPriority.MEDIUM;
  }

  /**
   * Waits for the configured time period
   * @returns {Promise<void>} A promise that resolves after the wait time
   */
  wait(): Promise<void> {
    const waitTime = this.getWaitTime();
    if (waitTime > 0) {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, waitTime * 1000);
      });
    }
    return Promise.resolve();
  }

  /**
   * Gets the current configuration object
   * @returns {ContentConfigObject} The current configuration
   */
  private getConfig() {
    return this.config;
  }

  /**
   * Updates the configuration with new settings
   * @param {Partial<ContentConfigObject>} config - New configuration settings to merge
   */
  setConfig(config: Partial<ContentConfigObject>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Checks if auto-start is enabled based on rules
   * @returns {boolean} True if auto-start should be activated
   */
  isAutoStart(): boolean {
    const autoStartRules = this.getAutoStartRules();
    if (!this.isEnabledAutoStartRules()) {
      return false;
    }
    if (!autoStartRules || autoStartRules.length === 0) {
      return true;
    }
    return isActive(autoStartRules);
  }

  /**
   * Checks if the tour should be temporarily hidden based on rules
   * @returns {boolean} True if the tour should be hidden
   */
  isTemporarilyHidden(): boolean {
    const hideRules = this.getHideRules();
    if (!this.isEnabledHideRules()) {
      return false;
    }
    if (!hideRules || hideRules.length === 0) {
      return true;
    }
    return isActive(hideRules);
  }

  /**
   * Checks if auto-start rules are enabled
   * @returns {boolean} True if auto-start rules are enabled
   */
  isEnabledAutoStartRules(): boolean {
    return this.getConfig().enabledAutoStartRules;
  }

  /**
   * Checks if hide rules are enabled
   * @returns {boolean} True if hide rules are enabled
   */
  isEnabledHideRules(): boolean {
    return this.getConfig().enabledHideRules;
  }

  /**
   * Gets the auto-start rules configuration
   * @returns {RulesCondition[]} Array of auto-start rules
   */
  private getAutoStartRules(): RulesCondition[] {
    return this.getConfig().autoStartRules;
  }

  /**
   * Gets the hide rules configuration
   * @returns {RulesCondition[]} Array of hide rules
   */
  private getHideRules(): RulesCondition[] {
    return this.getConfig().hideRules;
  }

  /**
   * Gets the auto-start rules settings
   * @returns {autoStartRulesSetting} Auto-start rules configuration
   */
  private getAutoStartRulesSetting(): autoStartRulesSetting {
    return this.getConfig().autoStartRulesSetting;
  }

  /**
   * Gets the configured wait time in seconds
   * @returns {number} Wait time in seconds (capped at 300)
   */
  private getWaitTime(): number {
    const autoStartRulesSetting = this.getAutoStartRulesSetting();
    if (!this.isEnabledAutoStartRules()) {
      return 0;
    }
    if (!autoStartRulesSetting?.wait) {
      return 0;
    }
    return Math.min(autoStartRulesSetting.wait, 300);
  }

  /**
   * Processes and activates conditions for both auto-start and hide rules
   * Updates the configuration with activated rules
   */
  async activeConditions() {
    // Helper function to process rules
    const processRules = async (
      enabled: boolean,
      rules: any[] | undefined,
      key: keyof ContentConfigObject,
    ) => {
      if (enabled && rules && rules.length > 0) {
        const activedRules = await activedRulesConditions(rules);
        this.setConfig({ [key]: activedRules });
      }
    };

    await Promise.all([
      processRules(this.isEnabledAutoStartRules(), this.getAutoStartRules(), 'autoStartRules'),
      processRules(this.isEnabledHideRules(), this.getHideRules(), 'hideRules'),
    ]);
  }
}
