import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { BizSession } from '@usertour-ui/types';
import { SessionActionDropdownMenu } from '@/components/molecules/session-action-dropmenu';

type AnalyticsActionProps = {
  session: BizSession;
};
export const AnalyticsAction = (props: AnalyticsActionProps) => {
  const { session } = props;

  return (
    <>
      <SessionActionDropdownMenu session={session}>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <DotsHorizontalIcon className="h-4 w-4" />
        </Button>
      </SessionActionDropdownMenu>
    </>
  );
};

AnalyticsAction.displayName = ' AnalyticsAction';
