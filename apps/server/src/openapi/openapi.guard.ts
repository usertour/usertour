import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { InvalidApiKeyError, MissingApiKeyError } from '@/common/errors/errors';

@Injectable()
export class OpenAPIKeyGuard implements CanActivate {
  private readonly logger = new Logger(OpenAPIKeyGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKeyFromHeader(request);

    if (!apiKey) {
      throw new MissingApiKeyError();
    }

    // Remove the 'ak_' prefix if present
    const cleanApiKey = apiKey.startsWith('ak_') ? apiKey.slice(3) : apiKey;

    const accessToken = await this.prisma.accessToken.findUnique({
      where: { accessToken: cleanApiKey },
      include: { environment: true },
    });

    if (!accessToken) {
      throw new InvalidApiKeyError();
    }

    if (!accessToken.isActive) {
      throw new InvalidApiKeyError();
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
