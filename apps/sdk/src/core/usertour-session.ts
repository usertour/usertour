import {
  AttributeBizTypes,
  LauncherData,
  CustomContentSession,
  SessionStep,
  SessionTheme,
} from '@usertour/types';

/**
 * Session data access class
 * Provides common getter methods for session data
 */
export class UsertourSession {
  // === Properties ===
  private session: CustomContentSession;

  // === Constructor ===
  constructor(session: CustomContentSession) {
    this.session = session;
  }

  // === Session Management ===
  /**
   * Updates the session data
   * @param session - New session data to update
   */
  update(session: CustomContentSession): void {
    this.session = session;
  }

  // === Session Info ===
  /**
   * Gets the session ID
   */
  getSessionId(): string {
    return this.session.id || '';
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
   * Checks if expand is pending
   */
  isExpandPending(): boolean {
    return Boolean(this.session.expandPending);
  }

  /**
   * Checks if the remove branding is enabled
   */
  isRemoveBranding(): boolean {
    return this.session.content.project.removeBranding;
  }

  // === Steps ===
  /**
   * Gets the steps array from session
   */
  getSteps(): SessionStep[] {
    return this.session.version.steps || [];
  }

  /**
   * Gets the step by cvid
   */
  getStepByCvid(cvid: string): SessionStep | undefined {
    return this.getSteps().find((step) => step.cvid === cvid);
  }

  /**
   * Gets the step by id
   */
  getStepById(id: string): SessionStep | undefined {
    return this.getSteps().find((step) => step.id === id);
  }

  /**
   * Gets current step from session
   */
  getCurrentStepFromSession() {
    return this.session.currentStep;
  }

  // === Theme ===
  /**
   * Gets theme from session
   */
  getVersionTheme(): SessionTheme | undefined {
    return this.session.version.theme;
  }

  // === Content Data ===
  /**
   * Gets checklist data from session
   */
  getChecklistData() {
    return this.session.version.checklist;
  }

  /**
   * Gets launcher data from session
   */
  getLauncherData(): LauncherData | undefined {
    return this.session.version.launcher;
  }

  // === Attributes ===
  /**
   * Gets attributes array
   */
  getAttributes() {
    return this.session.attributes;
  }

  /**
   * Updates an attribute in session
   * @param bizType - The business type of the attribute
   * @param codeName - The code name of the attribute
   * @param value - The value of the attribute
   */
  updateAttribute(bizType: AttributeBizTypes, codeName: string, value: unknown): void {
    const attributes = this.getAttributes();
    this.session.attributes = attributes?.map((attr) =>
      attr.codeName === codeName && attr.bizType === bizType ? { ...attr, value } : attr,
    );
  }
}
