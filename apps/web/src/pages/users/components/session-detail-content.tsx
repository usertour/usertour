import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { UserIcon } from '@usertour-ui/icons';
import { useNavigate } from 'react-router-dom';

interface SessionDetailContentProps {
  environmentId: string;
  sessionId: string;
}

export function SessionDetailContent(props: SessionDetailContentProps) {
  const { environmentId, sessionId } = props;
  const navigator = useNavigate();

  console.log('sessionId', sessionId);

  return (
    <>
      <div className="border-b bg-white flex-col md:flex w-full fixed">
        <div className="flex h-16 items-center px-4">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/users`);
            }}
          />
          <span>Session Detail</span>
        </div>
      </div>
      <div className="flex flex-row p-14 mt-12 space-x-8 justify-center ">
        <div className="flex flex-col w-[550px] flex-none space-y-4">
          <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <UserIcon width={18} height={18} className="mr-2" />
              User details
            </div>
            <div className="flex flex-col space-y-2 text-sm py-2">
              <div>User: {}</div>
              <div>createdAt: {}</div>
              <div>Email: {}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-[800px]">
          <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <UserIcon width={18} height={18} className="mr-2" />
              Activity feed
            </div>
            <div className="flex flex-col items-center w-full h-full justify-center">
              <img src="/images/rocket.png" />
              <div className="text-muted-foreground text-base	">Coming soon!</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

SessionDetailContent.displayName = 'SessionDetailContent';
