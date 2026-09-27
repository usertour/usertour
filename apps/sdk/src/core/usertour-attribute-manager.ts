import { UserTourTypes } from '@usertour/types';
import { attributeCacheChanged, attributeDataEqual, mergeAttributeCache } from '@usertour/helpers';
import { Evented } from '@/utils/evented';

import { autoBind } from '@/utils';

/**
 * Simple manager for user, company, and membership attributes
 * Extends Evented to provide event notification capabilities
 *
 * The cache exists only for change detection: it holds the literals this
 * page already sent and the server accepted. A key written with an operation
 * object ({add}, {union}, …) is always sent and never cached — the server
 * computes its value, which the client cannot know (ADR 0017 §6). A key the
 * server refused leaves the cache (ADR 0020 §6): what the server holds for
 * it is unknown here too.
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
    return attributeCacheChanged(currentAttributes, newAttributes);
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
   * Fold an answered user write into the cache: the literals the server
   * accepted are cached, the keys it refused leave the cache.
   * @param attributes - The attributes the write carried
   * @param refused - The keys the server refused
   * @returns True if the cache changed
   */
  setUserAttributes(
    attributes: UserTourTypes.Attributes,
    refused: readonly string[] = [],
  ): boolean {
    const next = mergeAttributeCache(this.userAttributes, attributes, refused);
    if (attributeDataEqual(this.userAttributes, next)) {
      return false;
    }
    this.userAttributes = next;
    return true;
  }

  /**
   * Fold an answered company write into the cache, as for the user.
   * @param attributes - The attributes the write carried
   * @param refused - The keys the server refused
   * @returns True if the cache changed
   */
  setCompanyAttributes(
    attributes: UserTourTypes.Attributes,
    refused: readonly string[] = [],
  ): boolean {
    const next = mergeAttributeCache(this.companyAttributes, attributes, refused);
    if (attributeDataEqual(this.companyAttributes, next)) {
      return false;
    }
    this.companyAttributes = next;
    return true;
  }

  /**
   * Fold an answered membership write into the cache, as for the user.
   * @param attributes - The attributes the write carried
   * @param refused - The keys the server refused
   * @returns True if the cache changed
   */
  setMembershipAttributes(
    attributes: UserTourTypes.Attributes,
    refused: readonly string[] = [],
  ): boolean {
    const next = mergeAttributeCache(this.membershipAttributes, attributes, refused);
    if (attributeDataEqual(this.membershipAttributes, next)) {
      return false;
    }
    this.membershipAttributes = next;
    return true;
  }

  /**
   * The keys of a write the server did not confirm leave the cache: what it
   * holds for them is unknown, and a stale literal would make the next call
   * carrying them look unchanged and go unsent — while a resend of the write
   * that failed offline would then land its stale value (ADR 0018 §4).
   */
  forgetUserAttributes(codeNames: readonly string[]): void {
    this.userAttributes = mergeAttributeCache(this.userAttributes, {}, codeNames);
  }

  forgetCompanyAttributes(codeNames: readonly string[]): void {
    this.companyAttributes = mergeAttributeCache(this.companyAttributes, {}, codeNames);
  }

  forgetMembershipAttributes(codeNames: readonly string[]): void {
    this.membershipAttributes = mergeAttributeCache(this.membershipAttributes, {}, codeNames);
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
    this.clearCompanyAndMembershipAttributes();
  }

  /**
   * Clears company and membership attributes only
   * Useful when switching to a different company group
   */
  clearCompanyAndMembershipAttributes(): void {
    this.companyAttributes = {};
    this.membershipAttributes = {};
  }
}
