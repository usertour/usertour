import { Fragment } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { Badge } from '@usertour-packages/badge';
import { BizEvent } from '@usertour/types';
import { ContentEditorElementType, contentTypesConfig } from '@usertour-packages/shared-editor';
import { cn } from '@usertour-packages/tailwind';
import { QuestionStarRating } from './question';
import type { QuestionWithAnswer } from '@/utils/session';

// Get color based on score and type
const getDarkBarColor = (score: number, type: 'NPS' | 'SCALE') => {
  if (type === 'NPS') {
    if (score <= 6) return 'bg-red-500';
    if (score <= 8) return 'bg-yellow-500';
    return 'bg-green-500';
  }
  return 'bg-blue-700';
};

const ScaleAnswer = ({ value, type }: { value: number; type: 'NPS' | 'SCALE' }) => (
  <div className="flex items-center justify-start">
    <div
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-white',
        getDarkBarColor(value, type),
      )}
    >
      {value}
    </div>
  </div>
);

const MultipleChoiceAnswer = ({ answers }: { answers: string[] | string }) => {
  const answerList = Array.isArray(answers) ? answers : [answers];
  return (
    <ul className="list-disc pl-4">
      {answerList.map((answer: string, index: number) => (
        <li key={index}>{answer}</li>
      ))}
    </ul>
  );
};

const TextAnswer = ({ text }: { text: string }) => (
  <div className="whitespace-pre-line">{text}</div>
);

const NotAnswered = () => null;

/**
 * Renders the answer value based on question type
 * Used for displaying answers in both SessionResponse and activity feed
 */
const QuestionAnswer = ({ answerEvent }: { answerEvent: BizEvent }) => {
  switch (answerEvent.data.question_type) {
    case ContentEditorElementType.STAR_RATING:
      return (
        <div className="flex flex-row gap-0.5 items-center">
          <span className="pr-2">{answerEvent.data.number_answer}</span>
          <QuestionStarRating
            maxLength={answerEvent.data.number_answer}
            score={answerEvent.data.number_answer}
          />
        </div>
      );
    case ContentEditorElementType.SCALE:
      return <ScaleAnswer value={answerEvent.data.number_answer} type="SCALE" />;
    case ContentEditorElementType.NPS:
      return <ScaleAnswer value={answerEvent.data.number_answer} type="NPS" />;
    case ContentEditorElementType.MULTIPLE_CHOICE:
      return (
        <MultipleChoiceAnswer
          answers={answerEvent.data.text_answer || answerEvent.data.list_answer}
        />
      );
    case ContentEditorElementType.MULTI_LINE_TEXT:
      return <TextAnswer text={answerEvent.data.text_answer} />;
    default:
      return <TextAnswer text={answerEvent.data.text_answer} />;
  }
};

QuestionAnswer.displayName = 'QuestionAnswer';

interface SessionResponseProps {
  questions: QuestionWithAnswer[];
}

/**
 * Displays a table of questions with their answers
 * Questions are ordered by step sequence, showing both answered and unanswered questions
 */
const SessionResponse = ({ questions }: SessionResponseProps) => {
  return (
    <div className="flex flex-col items-center w-full h-full justify-center">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Question</TableHead>
            <TableHead className="w-1/2">Answer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.length > 0 ? (
            questions.map((item) => (
              <Fragment key={item.question.cvid}>
                <TableRow className="h-10">
                  <TableCell>
                    <div className="flex flex-row gap-2 items-center">
                      <span>{item.question.name}</span>
                      <Badge variant="secondary">
                        {
                          contentTypesConfig.find(
                            (config) => config.element.type === item.question.type,
                          )?.name
                        }
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.isAnswered && item.answer ? (
                      <QuestionAnswer answerEvent={item.answer} />
                    ) : (
                      <NotAnswered />
                    )}
                  </TableCell>
                </TableRow>
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={2} className="h-24 text-center">
                No questions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

SessionResponse.displayName = 'SessionResponse';

export { SessionResponse, QuestionAnswer };
