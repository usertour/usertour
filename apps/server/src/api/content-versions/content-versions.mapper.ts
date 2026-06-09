import { extractQuestionData } from '@/utils/content-question';

import {
  AuthoringHideRules,
  AuthoringStartRules,
  AuthoringStep,
} from '../content/authoring.schema';
import { ContentVersion, Question } from '../content/content.schema';
import { ApiObjectType } from '../shared/object-type';

type VersionNode = {
  id: string;
  sequence: number;
  themeId: string | null;
  updatedAt: Date;
  createdAt: Date;
};

/** Pure: extract the API questions from a version's steps (mirrors the v1 mapping). */
export function mapQuestions(steps: { data: unknown }[]): Question[] {
  const questions: Question[] = [];
  for (const step of steps) {
    const questionData = extractQuestionData(step.data as any);
    const question = questionData[0];
    if (question) {
      questions.push({
        object: ApiObjectType.QUESTION,
        cvid: question.data.cvid,
        name: question.data.name,
        type: question.type,
      });
    }
  }
  return questions;
}

/**
 * Pure version -> API content-version for the versions endpoint. `questions` and
 * `steps` are populated only when their expand was requested (the service does
 * that I/O and passes the already-extracted/decompiled values in).
 */
export function mapVersion(
  version: VersionNode,
  questions: Question[] | null,
  steps?: AuthoringStep[],
  rules?: { startRules?: AuthoringStartRules; hideRules?: AuthoringHideRules },
): ContentVersion {
  return {
    id: version.id,
    object: ApiObjectType.CONTENT_VERSION,
    number: version.sequence,
    themeId: version.themeId ?? null,
    questions,
    ...(steps ? { steps } : {}),
    ...(rules?.startRules ? { startRules: rules.startRules } : {}),
    ...(rules?.hideRules ? { hideRules: rules.hideRules } : {}),
    updatedAt: version.updatedAt.toISOString(),
    createdAt: version.createdAt.toISOString(),
  };
}
