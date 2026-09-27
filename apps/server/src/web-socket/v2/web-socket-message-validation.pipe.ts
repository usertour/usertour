import { PipeTransform, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ClientMessageKind } from '@usertour/types';
import { payloadValidatorMap, MAX_PAYLOAD_SIZE } from './payload-validators';
import { ClientMessageDto } from './web-socket-v2.dto';

/**
 * WebSocket message validation pipe
 * Validates the message structure and payload based on message kind
 *
 * This pipe performs:
 * 1. Basic message structure validation (kind, payload, requestId)
 * 2. Payload size validation to prevent DoS attacks
 * 3. Dynamic payload validation based on message kind
 */
@Injectable()
export class WebSocketMessageValidationPipe implements PipeTransform {
  private readonly logger = new Logger(WebSocketMessageValidationPipe.name);

  async transform(value: unknown): Promise<ClientMessageDto> {
    // Step 1: Validate basic message structure
    if (!value || typeof value !== 'object') {
      throw new WsException('Invalid message format: expected an object');
    }

    const message = value as Record<string, unknown>;

    // Validate required 'kind' field
    if (!message.kind || typeof message.kind !== 'string') {
      throw new WsException('Invalid message format: missing or invalid kind field');
    }

    // Validate 'payload' is an object (if present, and not null)
    if (
      message.payload !== undefined &&
      (message.payload === null || typeof message.payload !== 'object')
    ) {
      throw new WsException('Invalid message format: payload must be an object');
    }

    // Validate optional 'requestId' field
    if (message.requestId !== undefined && typeof message.requestId !== 'string') {
      throw new WsException('Invalid message format: requestId must be a string');
    }

    const kind = message.kind as string;
    const payload = message.payload;
    const requestId = message.requestId as string | undefined;

    // Step 2: Validate payload size
    if (!this.validatePayloadSize(payload)) {
      this.logger.warn(`Payload size exceeds limit for kind ${kind}`);
      throw new WsException('Payload size exceeds maximum allowed limit');
    }

    // Step 3: Validate payload structure based on message kind
    const validatedPayload = await this.validatePayload(kind, payload);

    return {
      kind,
      payload: validatedPayload,
      requestId,
    };
  }

  /**
   * Validate payload size to prevent DoS attacks
   */
  private validatePayloadSize(payload: unknown): boolean {
    if (payload === undefined || payload === null) {
      return true;
    }

    try {
      const payloadString = JSON.stringify(payload);
      return payloadString.length <= MAX_PAYLOAD_SIZE;
    } catch {
      return false;
    }
  }

  /**
   * Validate payload structure and types using class-validator
   */
  private async validatePayload(kind: string, payload: unknown): Promise<unknown> {
    const ValidatorClass = payloadValidatorMap.get(kind as ClientMessageKind);

    // No validator defined for this kind (e.g., BEGIN_BATCH, END_BATCH, END_ALL_CONTENT)
    if (!ValidatorClass) {
      return payload;
    }

    // Ensure payload is an object for kinds that require validation
    if (!payload || typeof payload !== 'object') {
      throw new WsException(`Payload is required for message kind: ${kind}`);
    }

    // The attribute maps are keyed by the host's own names, which may be
    // `constructor` or `toString`: class-transformer throws on the one and
    // drops the others. They are checked here as plain objects and passed
    // through untouched; the domain reads them by own key (ADR 0017 §8).
    const { attributes, membership, ...rest } = payload as Record<string, unknown>;
    for (const [field, map] of [
      ['attributes', attributes],
      ['membership', membership],
    ] as const) {
      if (map !== undefined && (map === null || typeof map !== 'object' || Array.isArray(map))) {
        throw new WsException(`Invalid payload for ${kind}: ${field} must be an object`);
      }
    }

    try {
      const instance = plainToInstance(ValidatorClass, rest);
      const errors = await validate(instance, {
        whitelist: true,
        forbidNonWhitelisted: false,
        forbidUnknownValues: false,
      });

      if (errors.length > 0) {
        const errorMessages = errors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
        this.logger.warn(`Payload validation failed for kind ${kind}: ${errorMessages}`);
        throw new WsException(`Invalid payload for ${kind}: ${errorMessages}`);
      }

      const validated = instance as Record<string, unknown>;
      if (attributes !== undefined) {
        validated.attributes = attributes;
      }
      if (membership !== undefined) {
        validated.membership = membership;
      }
      return validated;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      this.logger.warn(`Payload validation error for kind ${kind}: ${(error as Error).message}`);
      throw new WsException(`Payload validation failed for ${kind}`);
    }
  }
}
