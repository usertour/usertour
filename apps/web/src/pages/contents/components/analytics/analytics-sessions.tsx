import { Card, CardContent, CardHeader, CardTitle, Button, QuestionTooltip } from '@usertour/ui';

import { BizSessionsDataTable } from './data-table';
import { ExportDropdownMenu } from './export-dropmenu';
import { DownloadIcon } from 'lucide-react';

export const AnalyticsSessions = () => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow flex items-center gap-1">
              Sessions
              <QuestionTooltip>
                Each row is one user's engagement session with this content, showing when it started
                and its current state.
              </QuestionTooltip>
            </div>
            <ExportDropdownMenu>
              <Button variant="ghost" className="h-8 text-primary hover:text-primary">
                <DownloadIcon className="mr-1 w-4 h-4" />
                Export to CSV
              </Button>
            </ExportDropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BizSessionsDataTable />
        </CardContent>
      </Card>
    </>
  );
};

AnalyticsSessions.displayName = 'AnalyticsSessions';
