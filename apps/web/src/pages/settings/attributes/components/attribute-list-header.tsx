import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { useState } from 'react';
import { AttributeCreateForm } from './attribute-create-form';
import { useAppContext } from '@/contexts/app-context';

export const AttributeListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useAttributeListContext();
  const { isViewOnly } = useAppContext();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">Attributes</h3>
            <Button onClick={handleCreate} disabled={isViewOnly}>
              New Attribute
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>You can send user/company attributes via the Usertour.js</p>
            <p>
              <a
                href="https://docs.usertour.io/developers/usertourjs-reference/overview/#attributes"
                className="text-primary  "
                target="_blank"
                rel="noreferrer"
              >
                <span>Read the Attributes guide</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
      <AttributeCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

AttributeListHeader.displayName = 'AttributeListHeader';
