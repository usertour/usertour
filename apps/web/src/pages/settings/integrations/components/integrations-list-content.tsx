import { Button } from '@usertour-ui/button';

export const IntegrationsListContent = () => {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
      <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
        <div className="flex items-center justify-between">
          <img
            className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
            src="https://forms.b-cdn.net/apps/airtable.png"
          />
          <Button variant="secondary" size="sm">
            <div className="flex w-full items-center justify-center gap-x-2" data-slot="button">
              Connect
            </div>
          </Button>
        </div>
        <div className="mt-2 font-medium">Airtable</div>
        <div className="mt-1 ">Send form submissions straight to Airtable.</div>
      </li>
      <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
        <div className="flex items-center justify-between">
          <img
            className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
            src="https://forms.b-cdn.net/apps/airtable.png"
          />
          <Button variant="secondary" size="sm">
            <div className="flex w-full items-center justify-center gap-x-2" data-slot="button">
              Connect
            </div>
          </Button>
        </div>
        <div className="mt-2 font-medium">Airtable</div>
        <div className="mt-1 ">Send form submissions straight to Airtable.</div>
      </li>
      <li className="cursor-default rounded-lg border border-input px-4 py-6 text-sm">
        <div className="flex items-center justify-between">
          <img
            className="bg-accent object-cover data-[loaded]:bg-transparent h-8 w-8 rounded-lg border border-accent-light"
            src="https://forms.b-cdn.net/apps/airtable.png"
          />
          <Button variant="secondary" size="sm">
            <div className="flex w-full items-center justify-center gap-x-2" data-slot="button">
              Connect
            </div>
          </Button>
        </div>
        <div className="mt-2 font-medium">Airtable</div>
        <div className="mt-1 ">Send form submissions straight to Airtable.</div>
      </li>
    </ul>
  );
};
