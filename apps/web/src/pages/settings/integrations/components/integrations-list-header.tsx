import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { useAppContext } from '@/contexts/app-context';

export const IntegrationsListHeader = () => {
  const { environment } = useAppContext();

  return (
    <div className="relative ">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between ">
          <h3 className="text-2xl font-semibold tracking-tight">
            Integrations for {environment?.name}
          </h3>
        </div>
        <div className="text-sm text-muted-foreground">
          With integrations, you can stream Usertour-generated events to other external providers.{' '}
          <br />
          Note that integrations are tied to a single environment - you are currently looking at{' '}
          <span className="font-bold text-foreground">{environment?.name}</span> environment. <br />
          <a
            href="https://docs.usertour.io/api-reference/introduction"
            className="text-primary  "
            target="_blank"
            rel="noreferrer"
          >
            <span>Read the Integrations documentation.</span>
            <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
