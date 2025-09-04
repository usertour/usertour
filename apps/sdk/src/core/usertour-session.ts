import { Step, ThemeVariation } from '@usertour/types';
import { SDKContentSession } from '@/types/sdk';

/**
 * Session data access class
 * Provides common getter methods for session data
 */
export class UsertourSession {
  private session: SDKContentSession;

  constructor(session: SDKContentSession) {
    this.session = session;
  }

  /**
   * Updates the session data
   * @param session - New session data to update
   */
  update(session: SDKContentSession): void {
    this.session = session;
  }

  /**
   * Gets the session ID
   */
  getSessionId(): string {
    return this.session.id;
  }

  /**
   * Gets the step by cvid
   */
  getStepByCvid(cvid: string): Step | undefined {
    return this.getSteps().find((step) => step.cvid === cvid);
  }

  /**
   * Gets the content ID from session
   */
  getContentId(): string {
    return this.session.content.id;
  }

  /**
   * Gets the version ID from session
   */
  getVersionId(): string {
    return this.session.version.id;
  }

  /**
   * Gets the content name from session
   */
  getContentName(): string {
    return this.session.content.name || '';
  }

  /**
   * Gets the content type from session
   */
  getContentType(): string {
    return this.session.content.type;
  }

  /**
   * Gets the project information from session
   */
  getProjectInfo() {
    return this.session.content.project;
  }

  /**
   * Checks if the session is in draft mode
   */
  isDraftMode(): boolean {
    return this.session.draftMode;
  }

  /**
   * Gets the steps array from session
   */
  getSteps(): Step[] {
    return this.session.version.steps || [];
  }

  /**
   * Gets theme settings from session
   */
  getVersionThemeSettings() {
    return this.session.version.theme?.settings;
  }

  /**
   * Gets theme variations from session
   */
  getVersionThemeVariations(): ThemeVariation[] | undefined {
    return this.session.version.theme?.variations;
  }

  /**
   * Gets checklist data from session
   */
  getChecklistData() {
    return this.session.version.checklist;
  }

  /**
   * Gets version config from session
   */
  getVersionConfig() {
    return this.session.version.config;
  }

  /**
   * Gets version data from session
   */
  getVersionData() {
    return this.session.version.data;
  }

  /**
   * Gets attributes array
   */
  getAttributes() {
    return this.session.attributes;
  }

  /**
   * Gets current step from session
   */
  getCurrentStepFromSession() {
    return this.session.currentStep;
  }

  /**
   * Checks if expand is pending
   */
  isExpandPending(): boolean {
    return Boolean(this.session.expandPending);
  }
}
