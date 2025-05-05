import { Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { Badge } from '@usertour-ui/badge';
import { BizEvent } from '@usertour-ui/types';
import { ContentEditorElementType, contentTypesConfig } from '@usertour-ui/shared-editor';
import { cn } from '@usertour-ui/ui-utils';
import { QuestionStarRating } from './question';

// Add color utility functions from analytics-nps.tsx
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

const QuestionAnswer = ({ answerEvent }: { answerEvent: BizEvent }) => {
  switch (answerEvent.data.question_type) {
    case ContentEditorElementType.STAR_RATING:
      return (
        <div className="flex flex-row gap-0.5">
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
  answerEvents: BizEvent[];
}

const SessionResponse = ({ answerEvents }: SessionResponseProps) => {
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
          {answerEvents ? (
            answerEvents.map((answerEvent: BizEvent) => (
              <Fragment key={`${answerEvent.id}`}>
                <TableRow className="h-10">
                  <TableCell>
                    <div className="flex flex-row gap-2 items-center">
                      <span>{answerEvent.data.question_name}</span>
                      <Badge variant="secondary">
                        {
                          contentTypesConfig.find(
                            (config) => config.element.type === answerEvent.data.question_type,
                          )?.name
                        }
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <QuestionAnswer answerEvent={answerEvent} />
                  </TableCell>
                </TableRow>
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell className="h-24 text-center">No results.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

SessionResponse.displayName = 'SessionResponse';

export { SessionResponse, QuestionAnswer };
