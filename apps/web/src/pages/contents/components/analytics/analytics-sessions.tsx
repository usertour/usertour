import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { Button } from '@usertour-ui/button';

import { BizSessionsDataTable } from './data-table';
import { ExportDropdownMenu } from './export-dropmenu';
import { DownloadIcon } from 'lucide-react';

export const AnalyticsSessions = () => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow">Recent sessions</div>
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
