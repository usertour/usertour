import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class OpenapiGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKeyFromHeader(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Remove the 'ak_' prefix if present
    const cleanApiKey = apiKey.startsWith('ak_') ? apiKey.slice(3) : apiKey;

    const accessToken = await this.prisma.accessToken.findUnique({
      where: { accessToken: cleanApiKey },
      include: { environment: true },
    });

    if (!accessToken) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!accessToken.isActive) {
      throw new UnauthorizedException('API key is inactive');
    }

    // Attach the environment to the request for later use
    request.environment = accessToken.environment;

    return true;
  }

  private extractApiKeyFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      return null;
    }

    return token;
  }
}
