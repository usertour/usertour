import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { Button } from '@usertour-ui/button';
import { DotsVerticalIcon } from '@radix-ui/react-icons';

import { BizSessionsDataTable } from './data-table';
import { ExportDropdownMenu } from './export-dropmenu';

export const AnalyticsSessions = () => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow">Recent sessions</div>
            <ExportDropdownMenu>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsVerticalIcon className="h-4 w-4 " />
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
