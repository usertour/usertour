import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MACHINE_TRANSLATION_UNITS_PER_BATCH } from '@usertour/constants';
import { PlanType } from '@usertour/types';
import { generateObject, jsonSchema, type LanguageModel } from 'ai';
import { PrismaService } from 'nestjs-prisma';

import { AiService } from '@/ai/ai.service';
import {
  AiNotConfiguredError,
  MachineTranslationFailedError,
  MachineTranslationRequiresPaidPlanError,
  ParamsError,
} from '@/common/errors';

import type { TranslateLocalizationUnitsInput } from './dto/localization.input';

/**
 * Hard cap per mutation, defensive only: the editor batches by
 * MACHINE_TRANSLATION_UNITS_PER_BATCH and never approaches it.
 */
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

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  isEnabled(): boolean {
    return this.aiService.isConfigured();
  }

  async translateUnits(
    input: TranslateLocalizationUnitsInput,
  ): Promise<{ path: string; translatedText: string }[]> {
    const { versionId, localizationId, units } = input;
    if (!this.isEnabled()) {
      throw new AiNotConfiguredError();
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

    const model = this.aiService.getModel();
    const translated: { path: string; translatedText: string }[] = [];
    for (let offset = 0; offset < units.length; offset += MACHINE_TRANSLATION_UNITS_PER_BATCH) {
      const chunk = units.slice(offset, offset + MACHINE_TRANSLATION_UNITS_PER_BATCH);
      let texts: Map<number, string>;
      try {
        texts = await this.translateChunk(
          model,
          chunk.map((unit) => unit.sourceText),
          localization.name,
          localization.code,
        );
      } catch (error) {
        // Finished chunks are already paid for — return them instead of
        // discarding. The caller sees fewer results than it sent units and
        // resumes from what's still untranslated.
        if (translated.length === 0) {
          throw error;
        }
        break;
      }
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
