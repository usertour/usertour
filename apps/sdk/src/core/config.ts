import {
  ContentConfigObject,
  ContentPriority,
  RulesCondition,
  autoStartRulesSetting,
} from '@usertour-ui/types';
import autoBind from '../utils/auto-bind';
import { activedRulesConditions, isActive } from '../utils/conditions';
import { Evented } from './evented';

export class Config extends Evented {
  private config: ContentConfigObject;
  constructor(config: ContentConfigObject) {
    super();
    autoBind(this);
    this.config = config;
  }

  isWait(): boolean {
    return this.getWaitTime() > 0;
  }

  getPriority(): ContentPriority {
    return this.config.autoStartRulesSetting?.priority ?? ContentPriority.MEDIUM;
  }

  wait(): Promise<void> {
    const waitTime = this.getWaitTime();
    if (waitTime > 0) {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, waitTime * 1000);
      });
    }
    return Promise.resolve();
  }

  private getConfig() {
    return this.config;
  }

  setConfig(config: Partial<ContentConfigObject>) {
    this.config = { ...this.config, ...config };
  }

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

  isEnabledAutoStartRules(): boolean {
    return this.getConfig().enabledAutoStartRules;
  }

  isEnabledHideRules(): boolean {
    return this.getConfig().enabledHideRules;
  }

  private getAutoStartRules(): RulesCondition[] {
    return this.getConfig().autoStartRules;
  }

  private getHideRules(): RulesCondition[] {
    return this.getConfig().hideRules;
  }

  private getAutoStartRulesSetting(): autoStartRulesSetting {
    return this.getConfig().autoStartRulesSetting;
  }

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
