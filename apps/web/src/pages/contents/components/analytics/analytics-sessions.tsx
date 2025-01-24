import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";

import { BizSessionsDataTable } from "./data-table";

export const AnalyticsSessions = () => {

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow	">
              Recent sessions
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BizSessionsDataTable />
        </CardContent>
      </Card>
    </>
  );
};

AnalyticsSessions.displayName = "AnalyticsSessions";
