import { Button } from '@usertour-ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { ApiCreateForm } from './api-create-form';

export const ApiListHeader = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-semibold">API Tokens</h1>
      <Button variant="default" onClick={() => setIsCreateModalVisible(true)}>
        <PlusIcon className="mr-2 h-4 w-4" />
        Create Token
      </Button>
      <ApiCreateForm
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
      />
    </div>
  );
};
