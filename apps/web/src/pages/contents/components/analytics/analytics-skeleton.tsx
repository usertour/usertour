import { Skeleton } from '@usertour-ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { Tabs, TabsContent } from '@usertour-ui/tabs';

// AnalyticsHeader skeleton
export const AnalyticsHeaderSkeleton = () => {
  return (
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-32" />
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  );
};

// AnalyticsViews skeleton - shows 4 metric cards
export const AnalyticsViewsSkeleton = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// AnalyticsDays skeleton - shows chart with tabs
export const AnalyticsDaysSkeleton = () => {
  return (
    <Tabs defaultValue="views">
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row items-center">
            <Skeleton className="h-6 w-24" />
          </CardTitle>
        </CardHeader>
        <TabsContent value="views" className="border-none p-0 outline-none">
          <div className="p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </TabsContent>
        <TabsContent value="rate" className="border-none p-0 outline-none">
          <div className="p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </TabsContent>
      </Card>
    </Tabs>
  );
};

// AnalyticsSteps skeleton - shows table with progress bars
export const AnalyticsStepsSkeleton = () => {
  // Different widths for progress bars to simulate varying completion rates
  const progressWidths = ['w-1/4', 'w-2/3', 'w-1/2', 'w-3/4', 'w-1/3'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <Skeleton className="h-6 w-24" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="w-24">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-3/5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, index) => (
              <TableRow key={index}>
                <TableCell className="py-[1px]">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="py-[1px]">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="py-[1px]">
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell className="py-[1px] px-0">
                  <Skeleton className={`h-10 ${progressWidths[index]}`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// AnalyticsTasks skeleton - similar to steps but for tasks
export const AnalyticsTasksSkeleton = () => {
  // Different widths for progress bars to simulate varying completion rates
  const progressWidths = ['w-1/3', 'w-1/2', 'w-2/5', 'w-3/4', 'w-1/4'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <Skeleton className="h-6 w-28" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="w-3/5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, index) => (
              <TableRow key={index}>
                <TableCell className="py-[1px]">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="py-[1px]">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="py-[1px]">
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell className="py-[1px] px-0">
                  <Skeleton className={`h-10 ${progressWidths[index]}`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// AnalyticsQuestion skeleton - shows question analysis table
export const AnalyticsQuestionSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <Skeleton className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-12" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// AnalyticsSessions skeleton - shows data table
export const AnalyticsSessionsSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="space-between flex flex-row items-center">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9 rounded" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
