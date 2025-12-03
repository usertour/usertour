# @usertour/license

JWT license signing and validation utilities for UserTour.

## Features

- 🔐 **JWT License Signing**: Generate secure JWT-based licenses with RSA signatures
- ✅ **License Validation**: Validate JWT licenses with comprehensive checks
- 🎯 **Feature Management**: Control feature access through license-based feature flags
- ⏰ **Expiration Handling**: Built-in expiration checks and validation
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @usertour/license
# or
yarn add @usertour/license
# or
pnpm add @usertour/license
```

## Quick Start

### Signing Licenses

```typescript
import { JWTLicenseSigner } from '@usertour/license';

const signer = new JWTLicenseSigner({
  privateKeyPath: './path/to/private-key.pem',
  issuer: 'https://your-company.com',
  algorithm: 'RS256'
});

const license = signer.generateLicense({
  plan: 'pro',
  subject: 'My Project',
  projectId: 'project-123',
  expiresInDays: 365,
  features: ['analytics', 'custom-themes', '*'], // '*' means all features
});

console.log('Generated license:', license);
```

### Validating Licenses

```typescript
import { JWTLicenseValidator } from '@usertour/license';

const publicKey = `-----BEGIN PUBLIC KEY-----
...your RSA public key...
-----END PUBLIC KEY-----`;

const result = JWTLicenseValidator.validateLicense(
  license,
  publicKey,
  {
    checkExpiration: true,
    currentTime: new Date(),
  }
);

if (result.isValid) {
  console.log('License is valid!');
  console.log('Plan:', result.payload?.plan);
  console.log('Project ID:', result.payload?.projectId);
  
  // Check if license has specific features
  const hasAnalytics = result.hasFeature?.('analytics');
  const hasCustomThemes = result.hasFeature?.('custom-themes');
} else {
  console.error('License validation failed:', result.error);
  if (result.isExpired) {
    console.error('License has expired');
  }
}
```

## API Reference

### JWTLicenseSigner

#### Constructor Options

```typescript
interface JWTLicenseSignerOptions {
  privateKeyPath: string;  // Path to RSA private key file
  issuer?: string;         // JWT issuer (default: 'https://www.usertour.io')
  algorithm?: jwt.Algorithm; // JWT algorithm (default: 'RS256')
}
```

#### Methods

- `generateLicense(options: GenerateLicenseOptions): string` - Generate a JWT license token
- `generateLicenseWithInfo(options: GenerateLicenseOptions)` - Generate license with additional info
- `decodeToken(token: string): JWTLicensePayload | null` - Decode token without verification
- `getTokenInfo(token: string)` - Get complete token information

### JWTLicenseValidator

#### Static Methods

- `validateLicense(license, publicKey, options?)` - Validate a JWT license
- `validateRequiredFields(payload)` - Validate payload structure
- `checkExpiration(payload, currentTime?)` - Check if license is expired
- `hasFeature(payload, feature)` - Check if license has specific feature
- `getExpirationInfo(payload, currentTime?)` - Get expiration details
- `decodeLicense(license)` - Decode license without verification

## Types

### JWTLicensePayload

```typescript
interface JWTLicensePayload {
  plan: string;           // License plan type
  sub: string;            // Subject (project name)
  projectId: string;      // Project identifier
  iat: number;            // Issued at timestamp
  exp: number;            // Expiration timestamp
  issuer: string;         // JWT issuer
  features: string[];     // Array of enabled features
}
```

### JWTLicenseValidationResult

```typescript
interface JWTLicenseValidationResult {
  isValid: boolean;
  error?: string;
  payload?: JWTLicensePayload;
  isExpired?: boolean;
  hasFeature?: (feature: string) => boolean;
}
```

## Examples

### Feature-based Access Control

```typescript
// Check if license allows specific features
const result = JWTLicenseValidator.validateLicense(license, publicKey);

if (result.isValid && result.hasFeature) {
  const canUseAnalytics = result.hasFeature('analytics');
  const canUseCustomThemes = result.hasFeature('custom-themes');
  const hasAllFeatures = result.hasFeature('*');
  
  // Enable/disable features based on license
  if (canUseAnalytics) {
    enableAnalyticsModule();
  }
  
  if (canUseCustomThemes) {
    enableCustomThemes();
  }
}
```

### License Expiration Handling

```typescript
const result = JWTLicenseValidator.validateLicense(license, publicKey);

if (result.payload) {
  const expirationInfo = JWTLicenseValidator.getExpirationInfo(result.payload);
  
  console.log('Expires at:', expirationInfo.expiresAt);
  console.log('Days until expiration:', expirationInfo.daysUntilExpiration);
  
  if (expirationInfo.daysUntilExpiration <= 30) {
    showRenewalWarning();
  }
}
```

### Generating Licenses with Custom Data

```typescript
const licenseInfo = signer.generateLicenseWithInfo({
  plan: 'enterprise',
  subject: 'Acme Corp Project',
  projectId: 'acme-proj-456',
  expiresInDays: 730, // 2 years
  features: ['*'], // All features
  issuer: 'https://acme-licensing.com',
});

console.log('Token:', licenseInfo.token);
console.log('Expires at:', licenseInfo.expiresAt);
console.log('Payload:', licenseInfo.payload);
```

## Security Considerations

1. **Private Key Security**: Keep your RSA private keys secure and never expose them in client-side code
2. **Public Key Distribution**: Distribute public keys securely to validation endpoints
3. **Token Storage**: Store JWT tokens securely and consider token rotation policies
4. **Validation**: Always validate licenses on the server side for security-critical operations

## License

AGPL-3.0 - see [LICENSE](../../LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## Support

- 📚 [Documentation](https://docs.usertour.io)
- 💬 [Discord Community](https://discord.gg/WPVJPX8fJh)
- 🐛 [Issue Tracker](https://github.com/usertour/usertour/issues)
