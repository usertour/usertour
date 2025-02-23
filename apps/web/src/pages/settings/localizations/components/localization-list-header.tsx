import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { useState } from 'react';
import { LocalizationCreateForm } from './localization-create-form';

export const LocalizationListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useLocalizationListContext();
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
            <h3 className="text-2xl font-semibold tracking-tight">Localization</h3>
            <Button onClick={handleCreate} className="flex-none">
              New Localization
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              Localization enables you to tailor your Usertour content to align with your users'
              language and regional preferences. A locale defines the user's specific language and
              region settings. By including the user's locale through the <b>locale_code</b>{' '}
              attribute in your app's Usertour.js setup, you ensure that Usertour delivers content
              in the appropriate language seamlessly.
            </p>
            <p>
              <a
                href="https://docs.usertour.io/building-experiences/creating-your-first-flow/"
                className="text-primary  "
                target="_blank"
                rel="noreferrer"
              >
                <span>Read the Localization guide</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
      <LocalizationCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

LocalizationListHeader.displayName = 'LocalizationListHeader';
