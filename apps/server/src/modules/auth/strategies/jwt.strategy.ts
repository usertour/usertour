import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../services/auth.service';
import type { JwtClaims } from '../types/jwt-claims.type';
import type { User } from '@prisma/client';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '@/utils/cookie';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return this.extractTokenFromRequest(request);
        },
      ]),
      secretOrKey: configService.get('auth.jwt.secret'),
    });
  }

  async validate(
    payload: JwtClaims & { tokenType?: string; purpose?: string },
  ): Promise<User | null> {
    // Session tokens carry only userId/iat/exp. Every other token this server
    // signs with the same secret (2FA challenge, SSO and CRM transactions)
    // declares what it is, and none of them is a session.
    if (payload.tokenType || payload.purpose) {
      return null;
    }
    return await this.authService.validateUser(payload.userId);
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    // Try to get token from Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }

    // Try to get token from cookie
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (token) {
      return token;
    }

    return undefined;
  }
}
