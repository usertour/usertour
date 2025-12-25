import { WsException } from '@nestjs/websockets';
import { WebSocketMessageValidationPipe } from './web-socket-message-validation.pipe';
import { ClientMessageKind, contentStartReason, ContentDataType } from '@usertour/types';
import { MAX_PAYLOAD_SIZE } from './payload-validators';

describe('WebSocketMessageValidationPipe', () => {
  let pipe: WebSocketMessageValidationPipe;

  beforeEach(() => {
    pipe = new WebSocketMessageValidationPipe();
  });

  describe('Basic message structure validation', () => {
    it('should reject non-object message', async () => {
      await expect(pipe.transform('string')).rejects.toThrow(WsException);
      await expect(pipe.transform(123)).rejects.toThrow(WsException);
      await expect(pipe.transform(null)).rejects.toThrow(WsException);
      await expect(pipe.transform(undefined)).rejects.toThrow(WsException);
    });

    it('should reject message without kind field', async () => {
      await expect(pipe.transform({ payload: {} })).rejects.toThrow(
        'Invalid message format: missing or invalid kind field',
      );
    });

    it('should reject message with non-string kind', async () => {
      await expect(pipe.transform({ kind: 123, payload: {} })).rejects.toThrow(
        'Invalid message format: missing or invalid kind field',
      );
    });

    it('should reject message with null payload', async () => {
      await expect(
        pipe.transform({ kind: ClientMessageKind.UPSERT_USER, payload: null }),
      ).rejects.toThrow('Invalid message format: payload must be an object');
    });

    it('should reject message with non-object payload', async () => {
      await expect(
        pipe.transform({ kind: ClientMessageKind.UPSERT_USER, payload: 'string' }),
      ).rejects.toThrow('Invalid message format: payload must be an object');
    });

    it('should reject message with non-string requestId', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.BEGIN_BATCH,
          payload: {},
          requestId: 123,
        }),
      ).rejects.toThrow('Invalid message format: requestId must be a string');
    });

    it('should accept valid message structure', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.BEGIN_BATCH,
        payload: {},
        requestId: 'req-123',
      });

      expect(result.kind).toBe(ClientMessageKind.BEGIN_BATCH);
      expect(result.requestId).toBe('req-123');
    });
  });

  describe('Payload size validation', () => {
    it('should reject oversized payload', async () => {
      const largePayload = {
        data: 'x'.repeat(MAX_PAYLOAD_SIZE + 1),
      };

      await expect(
        pipe.transform({
          kind: ClientMessageKind.TRACK_EVENT,
          payload: largePayload,
        }),
      ).rejects.toThrow('Payload size exceeds maximum allowed limit');
    });

    it('should accept payload within size limit', async () => {
      const payload = {
        eventName: 'test-event',
        sessionId: 'session-123',
        eventData: { key: 'value' },
      };

      const result = await pipe.transform({
        kind: ClientMessageKind.TRACK_EVENT,
        payload,
      });

      expect(result.kind).toBe(ClientMessageKind.TRACK_EVENT);
    });
  });

  describe('UpsertUser payload validation', () => {
    it('should reject missing externalUserId', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.UPSERT_USER,
          payload: { attributes: {} },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should reject non-string externalUserId', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.UPSERT_USER,
          payload: { externalUserId: 123 },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid UpsertUser payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.UPSERT_USER,
        payload: {
          externalUserId: 'user-123',
          attributes: { name: 'John' },
        },
      });

      expect(result.kind).toBe(ClientMessageKind.UPSERT_USER);
      expect(result.payload).toHaveProperty('externalUserId', 'user-123');
    });

    it('should accept UpsertUser without optional attributes', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.UPSERT_USER,
        payload: { externalUserId: 'user-123' },
      });

      expect(result.payload).toHaveProperty('externalUserId', 'user-123');
    });
  });

  describe('UpsertCompany payload validation', () => {
    it('should reject missing required fields', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.UPSERT_COMPANY,
          payload: { externalCompanyId: 'company-123' },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid UpsertCompany payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.UPSERT_COMPANY,
        payload: {
          externalCompanyId: 'company-123',
          externalUserId: 'user-123',
          attributes: { name: 'Acme' },
          membership: { role: 'admin' },
        },
      });

      expect(result.kind).toBe(ClientMessageKind.UPSERT_COMPANY);
    });
  });

  describe('StartContent payload validation', () => {
    it('should reject missing contentId', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.START_CONTENT,
          payload: { startReason: contentStartReason.START_FROM_MANUAL },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should reject invalid startReason enum', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.START_CONTENT,
          payload: {
            contentId: 'content-123',
            startReason: 'invalid_reason',
          },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid StartContent payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.START_CONTENT,
        payload: {
          contentId: 'content-123',
          startReason: contentStartReason.START_FROM_MANUAL,
          stepCvid: 'step-1',
          once: true,
          continue: false,
        },
      });

      expect(result.kind).toBe(ClientMessageKind.START_CONTENT);
      expect(result.payload).toHaveProperty('contentId', 'content-123');
    });
  });

  describe('EndContent payload validation', () => {
    it('should reject missing sessionId', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.END_CONTENT,
          payload: { endReason: 'user_closed' },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid EndContent payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.END_CONTENT,
        payload: {
          sessionId: 'session-123',
          endReason: 'user_closed',
        },
      });

      expect(result.kind).toBe(ClientMessageKind.END_CONTENT);
    });
  });

  describe('UpdateClientContext payload validation', () => {
    it('should reject missing required fields', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.UPDATE_CLIENT_CONTEXT,
          payload: { pageUrl: 'https://example.com' },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should reject non-number viewport dimensions', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.UPDATE_CLIENT_CONTEXT,
          payload: {
            pageUrl: 'https://example.com',
            viewportWidth: '1920',
            viewportHeight: 1080,
          },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid ClientContext payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.UPDATE_CLIENT_CONTEXT,
        payload: {
          pageUrl: 'https://example.com/page',
          viewportWidth: 1920,
          viewportHeight: 1080,
        },
      });

      expect(result.kind).toBe(ClientMessageKind.UPDATE_CLIENT_CONTEXT);
    });
  });

  describe('ToggleClientCondition payload validation', () => {
    it('should reject invalid contentType enum', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.TOGGLE_CLIENT_CONDITION,
          payload: {
            contentId: 'content-123',
            contentType: 'invalid_type',
            versionId: 'version-123',
            conditionId: 'condition-123',
          },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid ClientCondition payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.TOGGLE_CLIENT_CONDITION,
        payload: {
          contentId: 'content-123',
          contentType: ContentDataType.FLOW,
          versionId: 'version-123',
          conditionId: 'condition-123',
          isActive: true,
        },
      });

      expect(result.kind).toBe(ClientMessageKind.TOGGLE_CLIENT_CONDITION);
    });
  });

  describe('TrackEvent payload validation', () => {
    it('should reject missing eventData', async () => {
      await expect(
        pipe.transform({
          kind: ClientMessageKind.TRACK_EVENT,
          payload: {
            eventName: 'click',
            sessionId: 'session-123',
          },
        }),
      ).rejects.toThrow(WsException);
    });

    it('should accept valid TrackEvent payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.TRACK_EVENT,
        payload: {
          eventName: 'button_click',
          sessionId: 'session-123',
          eventData: { buttonId: 'submit' },
        },
      });

      expect(result.kind).toBe(ClientMessageKind.TRACK_EVENT);
    });
  });

  describe('GoToStep payload validation', () => {
    it('should accept valid GoToStep payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.GO_TO_STEP,
        payload: {
          sessionId: 'session-123',
          stepId: 'step-456',
        },
      });

      expect(result.kind).toBe(ClientMessageKind.GO_TO_STEP);
    });
  });

  describe('AnswerQuestion payload validation', () => {
    it('should accept valid AnswerQuestion with listAnswer', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.ANSWER_QUESTION,
        payload: {
          questionCvid: 'q-123',
          questionName: 'Satisfaction',
          questionType: 'multiple_choice',
          sessionId: 'session-123',
          listAnswer: ['option1', 'option2'],
        },
      });

      expect(result.kind).toBe(ClientMessageKind.ANSWER_QUESTION);
    });

    it('should accept valid AnswerQuestion with numberAnswer', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.ANSWER_QUESTION,
        payload: {
          questionCvid: 'q-123',
          questionName: 'Rating',
          questionType: 'rating',
          sessionId: 'session-123',
          numberAnswer: 5,
        },
      });

      expect(result.kind).toBe(ClientMessageKind.ANSWER_QUESTION);
    });

    it('should accept valid AnswerQuestion with textAnswer', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.ANSWER_QUESTION,
        payload: {
          questionCvid: 'q-123',
          questionName: 'Feedback',
          questionType: 'text',
          sessionId: 'session-123',
          textAnswer: 'Great product!',
        },
      });

      expect(result.kind).toBe(ClientMessageKind.ANSWER_QUESTION);
    });
  });

  describe('Session-only payload validation', () => {
    const sessionOnlyKinds = [
      ClientMessageKind.HIDE_CHECKLIST,
      ClientMessageKind.SHOW_CHECKLIST,
      ClientMessageKind.ACTIVATE_LAUNCHER,
    ];

    for (const kind of sessionOnlyKinds) {
      it(`should accept valid ${kind} payload`, async () => {
        const result = await pipe.transform({
          kind,
          payload: { sessionId: 'session-123' },
        });

        expect(result.kind).toBe(kind);
      });

      it(`should reject ${kind} without sessionId`, async () => {
        await expect(pipe.transform({ kind, payload: {} })).rejects.toThrow(WsException);
      });
    }
  });

  describe('DismissLauncher payload validation', () => {
    it('should accept valid DismissLauncher payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.DISMISS_LAUNCHER,
        payload: {
          sessionId: 'session-123',
          endReason: 'user_closed',
        },
      });

      expect(result.kind).toBe(ClientMessageKind.DISMISS_LAUNCHER);
    });
  });

  describe('Messages without payload validation', () => {
    const noPayloadKinds = [
      ClientMessageKind.BEGIN_BATCH,
      ClientMessageKind.END_BATCH,
      ClientMessageKind.END_ALL_CONTENT,
    ];

    for (const kind of noPayloadKinds) {
      it(`should accept ${kind} with any payload`, async () => {
        const result = await pipe.transform({
          kind,
          payload: { anyField: 'anyValue' },
        });

        expect(result.kind).toBe(kind);
      });

      it(`should accept ${kind} with empty payload`, async () => {
        const result = await pipe.transform({
          kind,
          payload: {},
        });

        expect(result.kind).toBe(kind);
      });

      it(`should accept ${kind} with undefined payload`, async () => {
        const result = await pipe.transform({
          kind,
          payload: undefined,
        });

        expect(result.kind).toBe(kind);
      });
    }
  });

  describe('Whitelist behavior', () => {
    it('should strip unknown fields from payload', async () => {
      const result = await pipe.transform({
        kind: ClientMessageKind.UPSERT_USER,
        payload: {
          externalUserId: 'user-123',
          unknownField: 'should be stripped',
          anotherUnknown: 123,
        },
      });

      expect(result.payload).toHaveProperty('externalUserId', 'user-123');
      expect(result.payload).not.toHaveProperty('unknownField');
      expect(result.payload).not.toHaveProperty('anotherUnknown');
    });
  });
});
