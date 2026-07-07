import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanType } from '@usertour/types';
import { generateObject, jsonSchema, type LanguageModel } from 'ai';
import { PrismaService } from 'nestjs-prisma';

import {
  MachineTranslationFailedError,
  MachineTranslationNotConfiguredError,
  MachineTranslationRequiresPaidPlanError,
  ParamsError,
} from '@/common/errors';

import type { TranslateLocalizationUnitsInput } from './dto/localization.input';

/** One LLM request translates at most this many units. */
const UNITS_PER_REQUEST = 40;
/** Hard cap per mutation — the editor sends a whole version's untranslated units. */
const MAX_UNITS_PER_CALL = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

// The translator returns items by id so responses can't misalign with input
// order; the schema keeps the output machine-parseable across providers.
const TRANSLATIONS_SCHEMA = jsonSchema<{ translations: { id: number; text: string }[] }>({
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          text: { type: 'string' },
        },
        required: ['id', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
});

const SYSTEM_PROMPT = [
  'You translate user interface copy for in-app product onboarding — flows, checklists, launchers, banners and announcements.',
  'Rules:',
  '- Preserve placeholder tokens like {{user.name}} exactly as written; never translate or reformat what is inside the braces.',
  '- Keep translations concise and natural for UI copy; match the tone and approximate length of the source.',
  '- Do not translate URLs, email addresses or code.',
  '- Return a translation for every item, keyed by its id.',
].join('\n');

@Injectable()
export class MachineTranslationService {
  private readonly logger = new Logger(MachineTranslationService.name);
  private model: LanguageModel | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.configService.get<string>('machineTranslation.apiKey'));
  }

  async translateUnits(
    input: TranslateLocalizationUnitsInput,
  ): Promise<{ path: string; translatedText: string }[]> {
    const { versionId, localizationId, units } = input;
    if (!this.isEnabled()) {
      throw new MachineTranslationNotConfiguredError();
    }
    if (units.length === 0) {
      return [];
    }
    if (units.length > MAX_UNITS_PER_CALL) {
      throw new ParamsError();
    }

    await this.assertPaidPlanOnCloud(versionId);

    const localization = await this.prisma.localization.findUnique({
      where: { id: localizationId },
    });
    if (!localization) {
      throw new ParamsError();
    }

    const model = this.getModel();
    const translated: { path: string; translatedText: string }[] = [];
    for (let offset = 0; offset < units.length; offset += UNITS_PER_REQUEST) {
      const chunk = units.slice(offset, offset + UNITS_PER_REQUEST);
      const texts = await this.translateChunk(
        model,
        chunk.map((unit) => unit.sourceText),
        localization.name,
        localization.code,
      );
      chunk.forEach((unit, index) => {
        const text = texts.get(index);
        if (typeof text === 'string' && text.trim() !== '') {
          translated.push({ path: unit.path, translatedText: text });
        }
      });
    }
    return translated;
  }

  /**
   * Machine translation is free wherever the operator brings their own key
   * (self-hosted); on cloud it ships with every paid plan — the platform key
   * pays for the tokens, so the free tier is excluded.
   */
  private async assertPaidPlanOnCloud(versionId: string): Promise<void> {
    if (this.configService.get<boolean>('globalConfig.isSelfHostedMode')) {
      return;
    }
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { content: { select: { project: { select: { subscriptionId: true } } } } },
    });
    const subscriptionId = version?.content?.project?.subscriptionId;
    if (!subscriptionId) {
      throw new MachineTranslationRequiresPaidPlanError();
    }
    const subscription = await this.prisma.subscription.findUnique({
      where: { subscriptionId },
      select: { planType: true },
    });
    if (!subscription || subscription.planType === PlanType.HOBBY) {
      throw new MachineTranslationRequiresPaidPlanError();
    }
  }

  private getModel(): LanguageModel {
    if (this.model) {
      return this.model;
    }
    const provider = this.configService.get<string>('machineTranslation.provider');
    const apiKey = this.configService.get<string>('machineTranslation.apiKey');
    const modelId = this.configService.get<string>('machineTranslation.model');
    const baseUrl = this.configService.get<string>('machineTranslation.baseUrl');

    if (provider === 'openai-compatible') {
      if (!baseUrl) {
        throw new MachineTranslationNotConfiguredError();
      }
      const compatible = createOpenAICompatible({
        name: 'machine-translation',
        apiKey,
        baseURL: baseUrl,
      });
      this.model = compatible(modelId);
      return this.model;
    }

    const anthropic = createAnthropic({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
    this.model = anthropic(modelId);
    return this.model;
  }

  private async translateChunk(
    model: LanguageModel,
    sourceTexts: string[],
    languageName: string,
    localeCode: string,
  ): Promise<Map<number, string>> {
    const payload = {
      targetLanguage: languageName,
      targetLocale: localeCode,
      items: sourceTexts.map((text, id) => ({ id, text })),
    };
    try {
      const result = await generateObject({
        model,
        schema: TRANSLATIONS_SCHEMA,
        system: SYSTEM_PROMPT,
        prompt: JSON.stringify(payload),
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return new Map(
        result.object.translations.map((translation) => [translation.id, translation.text]),
      );
    } catch (error) {
      this.logger.error({ message: 'Machine translation request failed', error: `${error}` });
      throw new MachineTranslationFailedError();
    }
  }
}
