import { UserTourTypes } from '@usertour/types';
import { isEqual } from '@usertour/helpers';
import { Evented } from '@/utils/evented';

import { autoBind } from '@/utils';

/**
 * Simple manager for user, company, and membership attributes
 * Extends Evented to provide event notification capabilities
 */
export class UsertourAttributeManager extends Evented {
  // === Properties ===
  private userAttributes: UserTourTypes.Attributes = {};
  private companyAttributes: UserTourTypes.Attributes = {};
  private membershipAttributes: UserTourTypes.Attributes = {};

  // === Constructor ===
  constructor() {
    super();
    autoBind(this);
  }

  // === Attribute Change Detection ===
  /**
   * Check if attributes have actually changed
   * @param currentAttributes - Current attributes
   * @param newAttributes - New attributes to merge
   * @returns True if attributes have changed
   */
  private hasAttributesChanged(
    currentAttributes: UserTourTypes.Attributes,
    newAttributes: UserTourTypes.Attributes,
  ): boolean {
    const mergedAttributes = { ...currentAttributes, ...newAttributes };
    return !isEqual(currentAttributes, mergedAttributes);
  }

  /**
   * Check if user attributes changed
   * @param attributes - Attributes to check
   * @returns True if changed
   */
  userAttrsChanged(attributes: UserTourTypes.Attributes): boolean {
    return this.hasAttributesChanged(this.userAttributes, attributes);
  }

  /**
   * Check if company attributes changed
   * @param attributes - Attributes to check
   * @returns True if changed
   */
  companyAttrsChanged(attributes: UserTourTypes.Attributes): boolean {
    return this.hasAttributesChanged(this.companyAttributes, attributes);
  }

  /**
   * Check if membership attributes changed
   * @param attributes - Attributes to check
   * @returns True if changed
   */
  membershipAttrsChanged(attributes: UserTourTypes.Attributes): boolean {
    return this.hasAttributesChanged(this.membershipAttributes, attributes);
  }

  // === Attribute Setters ===
  /**
   * Set user attributes
   * @param attributes - User attributes to set
   * @returns True if attributes were actually changed and updated
   */
  setUserAttributes(attributes: UserTourTypes.Attributes): boolean {
    if (!this.hasAttributesChanged(this.userAttributes, attributes)) {
      return false; // No changes detected
    }

    this.userAttributes = { ...this.userAttributes, ...attributes };

    return true;
  }

  /**
   * Set company attributes
   * @param attributes - Company attributes to set
   * @returns True if attributes were actually changed and updated
   */
  setCompanyAttributes(attributes: UserTourTypes.Attributes): boolean {
    if (!this.hasAttributesChanged(this.companyAttributes, attributes)) {
      return false; // No changes detected
    }

    this.companyAttributes = { ...this.companyAttributes, ...attributes };

    return true;
  }

  /**
   * Set membership attributes
   * @param attributes - Membership attributes to set
   * @returns True if attributes were actually changed and updated
   */
  setMembershipAttributes(attributes: UserTourTypes.Attributes): boolean {
    if (!this.hasAttributesChanged(this.membershipAttributes, attributes)) {
      return false; // No changes detected
    }

    this.membershipAttributes = { ...this.membershipAttributes, ...attributes };

    return true;
  }

  // === Attribute Getters ===
  /**
   * Get user attributes
   * @returns Current user attributes
   */
  getUserAttributes(): UserTourTypes.Attributes {
    return { ...this.userAttributes };
  }

  /**
   * Get company attributes
   * @returns Current company attributes
   */
  getCompanyAttributes(): UserTourTypes.Attributes {
    return { ...this.companyAttributes };
  }

  /**
   * Get membership attributes
   * @returns Current membership attributes
   */
  getMembershipAttributes(): UserTourTypes.Attributes {
    return { ...this.membershipAttributes };
  }

  /**
   * Get all attributes in a structured format
   * @returns Object containing all attribute types
   */
  get() {
    return {
      userAttributes: this.getUserAttributes(),
      companyAttributes: this.getCompanyAttributes(),
      membershipAttributes: this.getMembershipAttributes(),
    };
  }

  // === Cleanup ===
  /**
   * Cleans up all attributes
   */
  cleanup(): void {
    this.userAttributes = {};
    this.companyAttributes = {};
    this.membershipAttributes = {};
  }
}
