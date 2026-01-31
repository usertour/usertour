import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LicenseService } from './license.service';
import { GenerateLicenseInput } from './dto/generate-license.input';
import {
  GeneratedLicense,
  LicenseValidationResult,
  LicenseAdminStatus,
} from './models/generated-license.model';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
import { LicenseAdminGuard } from './license-admin.guard';

@Resolver()
export class LicenseResolver {
  constructor(private licenseService: LicenseService) {}

  /**
   * Get the license admin status
   * Shows whether license generation is available
   */
  @Query(() => LicenseAdminStatus)
  @UseGuards(LicenseAdminGuard)
  async getLicenseAdminStatus(): Promise<LicenseAdminStatus> {
    return this.licenseService.getLicenseAdminStatus();
  }

  /**
   * Generate a new license for a project
   * Requires LICENSE_PRIVATE_KEY to be configured
   */
  @Mutation(() => GeneratedLicense)
  @UseGuards(LicenseAdminGuard)
  async generateLicense(
    @UserEntity() user: User,
    @Args('input') input: GenerateLicenseInput,
  ): Promise<GeneratedLicense> {
    const result = this.licenseService.generateLicense({
      plan: input.plan,
      subject: input.subject,
      projectId: input.projectId,
      expiresInDays: input.expiresInDays,
      features: input.features,
      issuer: input.issuer,
    });

    return {
      token: result.token,
      payload: result.payload,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  /**
   * Validate a license token and return detailed information
   */
  @Query(() => LicenseValidationResult)
  @UseGuards(LicenseAdminGuard)
  async validateLicenseAdmin(
    @Args('licenseToken') licenseToken: string,
  ): Promise<LicenseValidationResult> {
    const result = await this.licenseService.validateLicenseWithDetails(licenseToken);

    return {
      isValid: result.isValid,
      error: result.error,
      isExpired: result.isExpired,
      payload: result.payload,
      daysRemaining: result.daysRemaining,
    };
  }

  /**
   * Get available plan types for license generation
   */
  @Query(() => [String])
  @UseGuards(LicenseAdminGuard)
  async getAvailablePlanTypes(): Promise<string[]> {
    return ['hobby', 'starter', 'growth', 'business', 'enterprise'];
  }

  /**
   * Get available features for license generation
   */
  @Query(() => [String])
  @UseGuards(LicenseAdminGuard)
  async getAvailableFeatures(): Promise<string[]> {
    return [
      '*', // All features
      'remove_branding',
      'custom_themes',
      'advanced_analytics',
      'api_access',
      'webhooks',
      'sso',
      'audit_logs',
      'priority_support',
    ];
  }
}
