import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { NoPermissionError } from '@/common/errors';

/**
 * Guard to protect license admin endpoints
 *
 * Access is granted if:
 * 1. User is authenticated (has valid JWT)
 * 2. LICENSE_ADMIN_ENABLED environment variable is set to 'true'
 * 3. Optionally, user email is in LICENSE_ADMIN_EMAILS list
 */
@Injectable()
export class LicenseAdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    // Check if user is authenticated
    const user = req.user;
    if (!user) {
      throw new NoPermissionError('Authentication required');
    }

    // Check if license admin is enabled
    const licenseAdminEnabled = this.configService.get<string>('LICENSE_ADMIN_ENABLED');
    if (licenseAdminEnabled !== 'true') {
      throw new NoPermissionError(
        'License admin is not enabled. Set LICENSE_ADMIN_ENABLED=true to enable.',
      );
    }

    // Check if user is in the allowed admin emails list (if configured)
    const adminEmails = this.configService.get<string>('LICENSE_ADMIN_EMAILS');
    if (adminEmails) {
      const allowedEmails = adminEmails.split(',').map((email) => email.trim().toLowerCase());
      const userEmail = user.email?.toLowerCase();

      if (!userEmail || !allowedEmails.includes(userEmail)) {
        throw new NoPermissionError('User is not authorized to access license admin');
      }
    }

    return true;
  }
}
