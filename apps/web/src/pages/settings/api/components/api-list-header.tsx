import { Button } from '@usertour-ui/button';
import { OpenInNewWindowIcon, PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { ApiCreateForm } from './api-create-form';
import { useAppContext } from '@/contexts/app-context';

export const ApiListHeader = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const { environment } = useAppContext();

  return (
    <div className="relative ">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between ">
          <h3 className="text-2xl font-semibold tracking-tight">
            API keys for {environment?.name}
          </h3>
          <Button variant="default" onClick={() => setIsCreateModalVisible(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New API key
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          The API key is used to authenticate your backend application via Usertour's REST API,
          which can be used to update user properties and track events.
          <br />
          Please note that API keys are environment-specific — you are currently viewing the{' '}
          <span className="font-bold text-foreground">{environment?.name}</span> environment. <br />
          You can switch environments using the menu with your company name in the top-left corner.
          <br />
          <a
            href="https://docs.usertour.io/api-reference/introduction"
            className="text-primary  "
            target="_blank"
            rel="noreferrer"
          >
            <span>Read the API documentation.</span>
            <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
          </a>
        </div>
        <ApiCreateForm
          visible={isCreateModalVisible}
          onClose={() => setIsCreateModalVisible(false)}
        />
      </div>
    </div>
  );
};
