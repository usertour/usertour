import { extractQuestionData } from '@/utils/content-question';

import { ContentVersion, Question } from '../content/content.schema';
import { ApiObjectType } from '../shared/object-type';

type VersionNode = { id: string; sequence: number; updatedAt: Date; createdAt: Date };

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
 * Pure version -> API content-version for the versions endpoint. `questions` is
 * null unless the questions expand was requested (the service does that I/O and
 * passes the already-extracted questions in).
 */
export function mapVersion(version: VersionNode, questions: Question[] | null): ContentVersion {
  return {
    id: version.id,
    object: ApiObjectType.CONTENT_VERSION,
    number: version.sequence,
    questions,
    updatedAt: version.updatedAt.toISOString(),
    createdAt: version.createdAt.toISOString(),
  };
}
