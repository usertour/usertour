import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LanguageModel } from 'ai';

import { AiNotConfiguredError } from '@/common/errors';

/**
 * Instance-level AI provider access (the AI_* environment variables) — the
 * single place that turns provider configuration into an AI SDK model
 * instance. Feature modules (machine translation today) consume this and own
 * their prompts, chunking and billing gates.
 */
@Injectable()
export class AiService {
  private model: LanguageModel | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Whether the instance has a usable AI provider, judged by the same
   * requirement getModel enforces per provider: anthropic (the default)
   * needs an API key, openai-compatible needs a base URL (gateways may be
   * keyless), and selecting bedrock is enough — it can authenticate
   * keylessly through the AWS default credential chain. Single source for
   * the capability: the globalConfig flag (button rendering) and the
   * feature gates both read it, so the buttons never advertise a provider
   * getModel would reject.
   */
  isConfigured(): boolean {
    const provider = this.configService.get<string>('ai.provider');
    if (provider === 'openai-compatible') {
      return Boolean(this.configService.get<string>('ai.baseUrl'));
    }
    if (provider === 'bedrock') {
      return true;
    }
    return Boolean(this.configService.get<string>('ai.apiKey'));
  }

  getModel(): LanguageModel {
    if (this.model) {
      return this.model;
    }
    const provider = this.configService.get<string>('ai.provider');
    const apiKey = this.configService.get<string>('ai.apiKey');
    const modelId = this.configService.get<string>('ai.model');
    const baseUrl = this.configService.get<string>('ai.baseUrl');

    if (provider === 'openai-compatible') {
      if (!baseUrl) {
        throw new AiNotConfiguredError();
      }
      const compatible = createOpenAICompatible({
        name: 'usertour-ai',
        apiKey,
        baseURL: baseUrl,
      });
      this.model = compatible(modelId);
      return this.model;
    }

    if (provider === 'bedrock') {
      const region = this.configService.get<string>('ai.awsRegion');
      const awsAccessKeyId = this.configService.get<string>('ai.awsAccessKeyId');
      const awsSecretAccessKey = this.configService.get<string>('ai.awsSecretAccessKey');
      // Three auth shapes, most explicit wins: a Bedrock API key (Bearer,
      // reuses AI_API_KEY), an explicit SigV4 key pair, else the AWS default
      // credential chain (env vars, profile, EC2/EKS instance role) so
      // deployments on AWS run keyless.
      let credentialSettings: Parameters<typeof createAmazonBedrock>[0];
      if (apiKey) {
        credentialSettings = { apiKey };
      } else if (awsAccessKeyId && awsSecretAccessKey) {
        credentialSettings = {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        };
      } else {
        const chain = fromNodeProviderChain(region ? { clientConfig: { region } } : {});
        credentialSettings = {
          // The chain resolves extra fields (expiration) the provider's
          // credential type doesn't accept — pick the three it does.
          credentialProvider: async () => {
            const credentials = await chain();
            return {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
            };
          },
        };
      }
      // Region falls back to the AWS_REGION environment variable when unset.
      const bedrock = createAmazonBedrock({
        ...(region ? { region } : {}),
        ...credentialSettings,
      });
      this.model = bedrock(modelId);
      return this.model;
    }

    const anthropic = createAnthropic({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
    this.model = anthropic(modelId);
    return this.model;
  }
}
