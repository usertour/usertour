import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { useContentPlacement } from './content-placement-context';

export const ContentPlacementTabs = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { target, onTargetChange } = useContentPlacement();

  return (
    <Tabs
      defaultValue={target?.type ?? 'auto'}
      onValueChange={(value) => onTargetChange({ type: value })}
    >
      <TabsList className="grid w-full grid-cols-2 bg-background-700">
        <TabsTrigger value="auto">Auto</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
        {children}
      </div>
    </Tabs>
  );
};

ContentPlacementTabs.displayName = 'ContentPlacementTabs';

export const ContentPlacementTabsContent = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) => {
  return <TabsContent value={value}>{children}</TabsContent>;
};

ContentPlacementTabsContent.displayName = 'ContentPlacementTabsContent';
