import { createHmac } from 'node:crypto';
import { PrismaService } from 'nestjs-prisma';
import { ClientMessageKind, ServerMessageKind } from '@usertour/types';

import { ProjectCacheService } from '@/modules/common/services/project-cache.service';
import { initialization } from '@/modules/projects/utils/project-initialization.util';
import { EncryptionService } from '@/modules/common/services/encryption.service';
import {
  buildContent,
  buildEnvironment,
  buildProject,
  buildSegment,
  buildStep,
  buildVersion,
  publishVersion,
} from '../factories';
import { teardownProject } from '../gql/_support';
import {
  WebSocketTestApp,
  connectExpectingError,
  connectWebSocketClient,
  createWebSocketTestApp,
} from './_support';

/**
 * Three remaining behavioral contracts, each in its own environment because
 * flows are singletons per user — auto-start contents in a shared environment
 * would steal each other's session slot:
 *
 * - The client-condition loop: element conditions can't be evaluated
 *   server-side, so EndBatch announces them via TrackClientCondition; the SDK
 *   reports back through ToggleClientCondition and only then does the next
 *   EndBatch start the flow.
 * - Frequency ONCE: a dismissed auto-start flow must not start again.
 * - Identity verification (ADR 0008/0009): with requireIdentityVerification
 *   enabled, the handshake requires an HS256 identity token whose `sub`
 *   matches the claimed externalUserId.
 */
describe('WebSocket v2 client conditions, frequency and identity (e2e)', () => {
  let harness: WebSocketTestApp;
  let prisma: PrismaService;
  let projectId: string;

  beforeAll(async () => {
    harness = await createWebSocketTestApp();
    prisma = harness.app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'ws-conditions-identity' });
    projectId = project.id;
    await initialization(prisma, projectId);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
    }
    await harness?.close();
  });

  describe('client-condition tracking loop', () => {
    const externalUserId = `ws-element-user-${Date.now()}`;
    const elementConditionId = 'element-condition-1';
    let environmentToken: string;
    let flowContentId: string;
    let flowVersionId: string;

    beforeAll(async () => {
      const environment = await buildEnvironment(prisma, { projectId });
      environmentToken = environment.token;

      const flowContent = await buildContent(prisma, {
        projectId,
        environmentId: environment.id,
        name: 'ws-element-flow',
        type: 'flow',
      });
      flowContentId = flowContent.id;
      const flowVersion = await buildVersion(prisma, {
        contentId: flowContent.id,
        sequence: 1,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [
            {
              id: elementConditionId,
              type: 'element',
              operators: 'and',
              data: { logic: 'present', elementData: { precision: 'strict' } },
            },
          ],
          autoStartRulesSetting: { wait: 0 },
        },
        data: [],
      });
      flowVersionId = flowVersion.id;
      await buildStep(prisma, {
        versionId: flowVersion.id,
        sequence: 0,
        name: 'Element Step',
        data: [],
      });
      await publishVersion(prisma, {
        environmentId: environment.id,
        contentId: flowContent.id,
        versionId: flowVersion.id,
      });
    }, 60000);

    it('announces the condition, honors the SDK report, then starts the flow', async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
      });

      const findFlowSession = () =>
        prisma.bizSession.findFirst({
          where: {
            contentId: flowContentId,
            bizUser: { externalId: externalUserId },
            deleted: false,
          },
        });

      // First batch: the server can't evaluate the element condition, so it
      // asks the SDK to track it instead of starting the flow.
      const firstBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
      expect(firstBatchAck).toBe(true);
      const trackMessage = await client.waitForServerMessage(
        ServerMessageKind.TRACK_CLIENT_CONDITION,
      );
      expect(trackMessage.payload?.conditionId ?? trackMessage.payload?.condition?.id).toBeTruthy();
      expect(await findFlowSession()).toBeNull();

      // SDK reports the element as present.
      const toggleAck = await client.sendClientMessage(ClientMessageKind.TOGGLE_CLIENT_CONDITION, {
        contentId: flowContentId,
        contentType: 'flow',
        versionId: flowVersionId,
        conditionId: elementConditionId,
        isActive: true,
      });
      expect(toggleAck).toBe(true);

      const secondBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
      expect(secondBatchAck).toBe(true);

      const flowSession = await findFlowSession();
      expect(flowSession).not.toBeNull();
      expect(flowSession?.state).toBe(0);

      client.disconnect();
    });
  });

  describe('an embed whose show rule is a browser condition', () => {
    const externalUserId = `ws-embed-element-user-${Date.now()}`;
    const elementConditionId = 'embed-element-condition-1';
    let environmentToken: string;
    let embedContentId: string;
    let embedVersionId: string;

    beforeAll(async () => {
      const environment = await buildEnvironment(prisma, { projectId });
      environmentToken = environment.token;

      const embedContent = await buildContent(prisma, {
        projectId,
        environmentId: environment.id,
        name: 'ws-element-embed',
        type: 'embed',
      });
      embedContentId = embedContent.id;
      const embedVersion = await buildVersion(prisma, {
        contentId: embedContent.id,
        sequence: 1,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [
            {
              id: elementConditionId,
              type: 'element',
              operators: 'and',
              data: { logic: 'present', elementData: { precision: 'strict' } },
            },
          ],
          autoStartRulesSetting: {
            wait: 0,
            frequency: { frequency: 'once', every: { duration: 0, unit: 'days' } },
          },
        },
        data: {},
      });
      embedVersionId = embedVersion.id;
      await buildStep(prisma, {
        versionId: embedVersion.id,
        type: 'inline',
        sequence: 0,
        name: 'Card',
        data: [],
      });
      await publishVersion(prisma, {
        environmentId: environment.id,
        contentId: embedContent.id,
        versionId: embedVersion.id,
      });
    }, 60000);

    // One page load: the SDK is asked to track the condition, reports the
    // element present, and is handed the embed.
    const loadPage = async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
        capabilities: ['embed'],
      });
      const embeds = () =>
        client.serverMessages.filter(
          (message) =>
            message.kind === ServerMessageKind.ADD_EMBED &&
            message.payload?.content?.id === embedContentId,
        );
      const until = async (condition: () => boolean, what: string) => {
        const startedAt = Date.now();
        while (!condition()) {
          if (Date.now() - startedAt > 5_000) {
            throw new Error(`Timed out waiting for ${what}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      };

      expect(await client.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);
      await until(
        () =>
          client.serverMessages.some(
            (message) => message.kind === ServerMessageKind.TRACK_CLIENT_CONDITION,
          ),
        'the condition to be handed to the SDK',
      );
      expect(embeds()).toHaveLength(0);

      const toggleAck = await client.sendClientMessage(ClientMessageKind.TOGGLE_CLIENT_CONDITION, {
        contentId: embedContentId,
        contentType: 'embed',
        versionId: embedVersionId,
        conditionId: elementConditionId,
        isActive: true,
      });
      expect(toggleAck).toBe(true);
      expect(await client.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);
      await until(() => embeds().length > 0, 'the embed to be delivered');
      return { client, embeds };
    };

    it('is tracked again on the next page load while the `once` session runs', async () => {
      const first = await loadPage();
      try {
        // The SDK found the target: the session starts and counts against `once`.
        const startAck = await first.client.sendClientMessage(ClientMessageKind.START_CONTENT, {
          contentId: embedContentId,
          startReason: 'start_from_condition',
        });
        expect(startAck).toBe(true);
      } finally {
        first.client.disconnect();
      }
      const session = await prisma.bizSession.findFirst({
        where: { contentId: embedContentId, bizUser: { externalId: externalUserId }, state: 0 },
      });
      expect(session).not.toBeNull();

      // The next page load: the running session is still shown, so its
      // condition has to reach the SDK again.
      const second = await loadPage();
      try {
        expect(second.embeds().at(-1)?.payload?.id).toBe(session?.id);
      } finally {
        second.client.disconnect();
      }
    });
  });

  describe('an embed republished while its session rests on a later step', () => {
    const externalUserId = `ws-embed-republish-user-${Date.now()}`;
    const stepCvids = ['embed-step-a', 'embed-step-b'];
    let environmentId: string;
    let environmentToken: string;
    let embedContentId: string;
    let config: Record<string, unknown>;
    let liveSteps: { id: string }[];

    const buildEmbedVersion = async (sequence: number, cvids: string[] = stepCvids) => {
      const version = await buildVersion(prisma, {
        contentId: embedContentId,
        sequence,
        config: config as never,
        data: {},
      });
      const steps = [];
      for (const [index, cvid] of cvids.entries()) {
        steps.push(
          await buildStep(prisma, {
            versionId: version.id,
            type: 'inline',
            sequence: index,
            name: `Step ${index + 1}`,
            cvid,
            data: [],
          }),
        );
      }
      return { version, steps };
    };

    beforeAll(async () => {
      const environment = await buildEnvironment(prisma, { projectId });
      environmentId = environment.id;
      environmentToken = environment.token;
      const allUsersSegment = await buildSegment(prisma, {
        projectId,
        environmentId,
        bizType: 1,
        dataType: 1,
      });
      config = {
        enabledAutoStartRules: true,
        autoStartRules: [
          {
            type: 'segment',
            operators: 'and',
            data: { segmentId: allUsersSegment.id, logic: 'is' },
          },
        ],
        autoStartRulesSetting: {
          wait: 0,
          frequency: { frequency: 'once', every: { duration: 0, unit: 'days' } },
        },
      };
      const embedContent = await buildContent(prisma, {
        projectId,
        environmentId,
        name: 'ws-republished-embed',
        type: 'embed',
      });
      embedContentId = embedContent.id;
      const first = await buildEmbedVersion(1);
      liveSteps = first.steps;
      await publishVersion(prisma, {
        environmentId,
        contentId: embedContentId,
        versionId: first.version.id,
      });
    }, 60000);

    const loadPage = async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
        capabilities: ['embed'],
      });
      const embeds = () =>
        client.serverMessages.filter(
          (message) =>
            message.kind === ServerMessageKind.ADD_EMBED &&
            message.payload?.content?.id === embedContentId,
        );
      const until = async (condition: () => boolean, what: string) => {
        const startedAt = Date.now();
        while (!condition()) {
          if (Date.now() - startedAt > 5_000) {
            throw new Error(`Timed out waiting for ${what}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      };
      expect(await client.sendClientMessage(ClientMessageKind.END_BATCH, {})).toBe(true);
      await until(() => embeds().length > 0, 'the embed to be delivered');
      return { client, embeds, until };
    };

    /** Makes `built` the published version, as a publish does. */
    const goLive = async (built: Awaited<ReturnType<typeof buildEmbedVersion>>) => {
      await prisma.content.update({
        where: { id: embedContentId },
        data: { publishedVersionId: built.version.id },
      });
      await prisma.contentOnEnvironment.updateMany({
        where: { contentId: embedContentId, environmentId },
        data: { publishedVersionId: built.version.id },
      });
      const cache = harness.app.get(ProjectCacheService);
      await cache.invalidate([
        ...cache.envContentKeys(environmentId),
        cache.keys.publishedVersionId(environmentId, embedContentId),
      ]);
      liveSteps = built.steps;
    };

    it('reopens on the step it was on, found by its cvid in the new version', async () => {
      const first = await loadPage();
      let sessionId: string;
      try {
        const startAck = await first.client.sendClientMessage(ClientMessageKind.START_CONTENT, {
          contentId: embedContentId,
          startReason: 'start_from_condition',
        });
        expect(startAck).toBe(true);
        await first.until(() => !!first.embeds().at(-1)?.payload?.id, 'the session to start');
        sessionId = first.embeds().at(-1)?.payload?.id;
        // The user pages to the second step.
        const stepAck = await first.client.sendClientMessage(ClientMessageKind.GO_TO_STEP, {
          sessionId,
          stepId: liveSteps[1].id,
        });
        expect(stepAck).toBe(true);
      } finally {
        first.client.disconnect();
      }

      // A new version with the same steps (other rows, same cvids) goes live.
      const second = await buildEmbedVersion(2);
      await goLive(second);

      const next = await loadPage();
      try {
        const delivered = next.embeds().at(-1)?.payload;
        expect(delivered?.id).toBe(sessionId);
        expect(delivered?.version?.id).toBe(second.version.id);
        expect(delivered?.currentStep?.cvid).toBe(stepCvids[1]);
      } finally {
        next.client.disconnect();
      }
    });

    it('reopens on the first step when the new version no longer has the step it was on', async () => {
      const first = await loadPage();
      let sessionId: string;
      try {
        sessionId = first.embeds().at(-1)?.payload?.id;
        expect(sessionId).toBeTruthy();
        // The session rests on the second step.
        const stepAck = await first.client.sendClientMessage(ClientMessageKind.GO_TO_STEP, {
          sessionId,
          stepId: liveSteps[1].id,
        });
        expect(stepAck).toBe(true);
      } finally {
        first.client.disconnect();
      }

      // The next version drops that step.
      const trimmed = await buildEmbedVersion(3, [stepCvids[0]]);
      await goLive(trimmed);

      const next = await loadPage();
      try {
        const delivered = next.embeds().at(-1)?.payload;
        expect(delivered?.id).toBe(sessionId);
        expect(delivered?.version?.id).toBe(trimmed.version.id);
        expect(delivered?.currentStep?.cvid).toBe(stepCvids[0]);
      } finally {
        next.client.disconnect();
      }
    });
  });

  describe('auto-start frequency ONCE', () => {
    const externalUserId = `ws-frequency-user-${Date.now()}`;
    let environmentToken: string;
    let flowContentId: string;

    beforeAll(async () => {
      const environment = await buildEnvironment(prisma, { projectId });
      environmentToken = environment.token;

      const allUsersSegment = await buildSegment(prisma, {
        projectId,
        environmentId: environment.id,
        bizType: 1,
        dataType: 1,
      });
      const flowContent = await buildContent(prisma, {
        projectId,
        environmentId: environment.id,
        name: 'ws-once-flow',
        type: 'flow',
      });
      flowContentId = flowContent.id;
      const flowVersion = await buildVersion(prisma, {
        contentId: flowContent.id,
        sequence: 1,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [
            {
              type: 'segment',
              operators: 'and',
              data: { segmentId: allUsersSegment.id, logic: 'is' },
            },
          ],
          autoStartRulesSetting: {
            wait: 0,
            frequency: { frequency: 'once', every: { duration: 0, unit: 'days' } },
          },
        },
        data: [],
      });
      await buildStep(prisma, {
        versionId: flowVersion.id,
        sequence: 0,
        name: 'Once Step',
        data: [],
      });
      await publishVersion(prisma, {
        environmentId: environment.id,
        contentId: flowContent.id,
        versionId: flowVersion.id,
      });
    }, 60000);

    it('does not restart a dismissed flow whose frequency is once', async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
      });

      const findFlowSessions = () =>
        prisma.bizSession.findMany({
          where: {
            contentId: flowContentId,
            bizUser: { externalId: externalUserId },
            deleted: false,
          },
        });

      const firstBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
      expect(firstBatchAck).toBe(true);
      const sessionsAfterFirstBatch = await findFlowSessions();
      expect(sessionsAfterFirstBatch).toHaveLength(1);

      const endAck = await client.sendClientMessage(ClientMessageKind.END_CONTENT, {
        sessionId: sessionsAfterFirstBatch[0].id,
        endReason: 'user_closed',
      });
      expect(endAck).toBe(true);

      const secondBatchAck = await client.sendClientMessage(ClientMessageKind.END_BATCH, {});
      expect(secondBatchAck).toBe(true);

      const sessionsAfterSecondBatch = await findFlowSessions();
      expect(sessionsAfterSecondBatch).toHaveLength(1);

      client.disconnect();
    });
  });

  describe('identity verification handshake', () => {
    const externalUserId = `ws-identity-user-${Date.now()}`;
    const signingSecretValue = 'utv_e2e_signing_secret';
    let environmentToken: string;

    const base64Url = (input: string | Buffer): string => Buffer.from(input).toString('base64url');

    const signIdentityToken = (payload: Record<string, unknown>, secret: string): string => {
      const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const body = base64Url(JSON.stringify(payload));
      const signature = createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
      return `${header}.${body}.${signature}`;
    };

    beforeAll(async () => {
      const environment = await buildEnvironment(prisma, {
        projectId,
        requireIdentityVerification: true,
      });
      environmentToken = environment.token;

      // Secrets are stored AES-256-GCM encrypted; the signing key the
      // customer holds is the raw utv_ string.
      const encryptionService = harness.app.get(EncryptionService);
      await prisma.environmentSigningSecret.create({
        data: {
          environmentId: environment.id,
          secret: encryptionService.encrypt(signingSecretValue) as string,
        },
      });
    }, 60000);

    it('accepts a handshake with a valid identity token', async () => {
      const client = await connectWebSocketClient(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
        identityToken: signIdentityToken({ sub: externalUserId }, signingSecretValue),
      });
      expect(client.socket.connected).toBe(true);
      client.disconnect();
    });

    it('rejects a handshake without an identity token', async () => {
      const error = await connectExpectingError(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
      });
      expect(error).toBeInstanceOf(Error);
    });

    it('rejects a token whose sub does not match the claimed user', async () => {
      const error = await connectExpectingError(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
        identityToken: signIdentityToken({ sub: 'someone-else' }, signingSecretValue),
      });
      expect(error).toBeInstanceOf(Error);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const error = await connectExpectingError(harness.baseUrl, {
        token: environmentToken,
        externalUserId,
        identityToken: signIdentityToken({ sub: externalUserId }, 'utv_wrong_secret'),
      });
      expect(error).toBeInstanceOf(Error);
    });
  });
});
