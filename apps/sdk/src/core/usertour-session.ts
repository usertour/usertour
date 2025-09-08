import { SDKContentSession, SessionStep, SessionTheme } from '@/types/sdk';

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
  getStepByCvid(cvid: string): SessionStep | undefined {
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
  getSteps(): SessionStep[] {
    return this.session.version.steps || [];
  }

  /**
   * Gets theme from session
   */
  getVersionTheme(): SessionTheme | undefined {
    return this.session.version.theme;
  }

  /**
   * Gets checklist data from session
   */
  getChecklistData() {
    return this.session.version.checklist;
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
