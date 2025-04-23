import { OpenInNewWindowIcon } from '@radix-ui/react-icons';

export const IntegrationListHeader = () => {
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">Integrations</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              With integrations, you can enable seamless data flow by sending event data (like user
              actions, flow progress, or content interactions) to below analytics tools. This helps
              you centralize analytics, monitor performance, and gain insights without duplicating
              efforts or disrupting your existing workflows.
            </p>
            <p>
              <a
                href="https://docs.usertour.io/how-to-guides/integrations/"
                className="text-primary  "
                target="_blank"
                rel="noreferrer"
              >
                <span>Read the Integrations guide</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

IntegrationListHeader.displayName = 'IntegrationListHeader';
