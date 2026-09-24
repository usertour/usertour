import { JWTLicenseValidator } from '@usertour/license';
import { LicenseService } from './license.service';

// Regression test for the bug where `LicenseService.hasFeature` passed
// `checkExpiration: false`, causing expired license tokens that carried a
// feature flag to still report the feature as enabled. Every downstream
// caller (2FA gating, instance enforcement, license-scoped cache) silently
// inherited the bug.

describe('LicenseService.hasFeature', () => {
  let service: LicenseService;

  beforeEach(() => {
    service = new LicenseService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards to JWTLicenseValidator with expiration checking enabled', async () => {
    const spy = jest.spyOn(JWTLicenseValidator, 'validateLicense').mockReturnValue({
      isValid: true,
      hasFeature: () => true,
    } as any);

    await service.hasFeature('any.jwt.token', 'two_factor_auth');

    // The fix is "do not pass `{ checkExpiration: false }`" — accept either
    // no options argument, or any options object that does NOT disable the check.
    const [, , options] = spy.mock.calls[0];
    if (options) {
      expect((options as { checkExpiration?: boolean }).checkExpiration).not.toBe(false);
    }
  });

  it('returns false when the license signature does not validate', async () => {
    jest.spyOn(JWTLicenseValidator, 'validateLicense').mockReturnValue({
      isValid: false,
    } as any);

    await expect(service.hasFeature('bad.token', 'two_factor_auth')).resolves.toBe(false);
  });

  it('returns false when the license is expired (validator marks it invalid)', async () => {
    // With `checkExpiration: true` (the default), an expired token comes
    // back with isValid=false, so the feature path is never reached.
    jest.spyOn(JWTLicenseValidator, 'validateLicense').mockReturnValue({
      isValid: false,
      isExpired: true,
    } as any);

    await expect(service.hasFeature('expired.token', 'two_factor_auth')).resolves.toBe(false);
  });

  it('returns true only for a valid license that lists the feature', async () => {
    jest.spyOn(JWTLicenseValidator, 'validateLicense').mockReturnValue({
      isValid: true,
      hasFeature: (f: string) => f === 'two_factor_auth',
    } as any);

    await expect(service.hasFeature('good.token', 'two_factor_auth')).resolves.toBe(true);
    await expect(service.hasFeature('good.token', 'other_feature')).resolves.toBe(false);
  });

  it('swallows validator exceptions as a closed-door default', async () => {
    jest.spyOn(JWTLicenseValidator, 'validateLicense').mockImplementation(() => {
      throw new Error('malformed');
    });

    await expect(service.hasFeature('garbage', 'two_factor_auth')).resolves.toBe(false);
  });
});
