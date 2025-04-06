import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { EXTENSION_SELECT } from '@usertour-ui/constants';
import { Alert, AlertDescription, AlertTitle } from '@usertour-ui/alert';
import { EyeNoneIcon, ModelIcon, TooltipIcon } from '@usertour-ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour-ui/select';

interface ContentTypeProps {
  type: string;
  onChange: (value: string) => void;
  zIndex: number;
}

export const ContentType = ({ onChange, zIndex, type }: ContentTypeProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">Step type</h1>
      </div>

      <Select value={type} onValueChange={onChange}>
        <SelectTrigger className="h-8 justify-start">
          {type === 'tooltip' && <TooltipIcon className="w-4 h-4 mr-2 mt-0.5 flex-none" />}
          {type === 'modal' && <ModelIcon className="w-4 h-4 mr-2 mt-0.5 flex-none" />}
          {type === 'hidden' && <EyeNoneIcon className="w-4 h-4 mr-2 flex-none" />}

          <div className="grow text-left">
            <SelectValue asChild>
              <div className="capitalize">{type}</div>
            </SelectValue>
          </div>
        </SelectTrigger>

        <SelectContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
          <SelectItem value="tooltip">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <TooltipIcon width={16} height={16} className="mt-0.5" />
                <span className="text-xs">Tooltip</span>
              </div>
              <p className="text-xs max-w-60">
                A tooltip anchored to an element you select. Well-suited for steps that request
                users to click a specific element.
              </p>
            </div>
          </SelectItem>

          <SelectItem value="modal">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <ModelIcon width={16} height={16} className="mt-0.5" />
                <span className="text-xs">Modal</span>
              </div>
              <p className="text-xs max-w-60">
                A modal dialog appearing in the center of the screen. A semi-transparent backdrop
                will cover your app.
              </p>
            </div>
          </SelectItem>
          <SelectItem value="hidden">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <EyeNoneIcon width={16} height={16} />
                <span className="text-xs">Hidden</span>
              </div>
              <p className="text-xs max-w-60">
                No Usertour UI is displayed at this step. Use triggers that wait for the user to
                perform an action before proceeding to the next step.
              </p>
            </div>
          </SelectItem>
        </SelectContent>

        {type === 'hidden' && (
          <Alert variant="warning">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Take caution with hidden steps</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>
                Hidden steps MUST include a trigger that eventually matches and either directs the
                user to a non-hidden step, initiates another flow, or dismisses the current flow.
              </span>
              <span>
                Without such a trigger, the user could be stuck on a hidden step indefinitely,
                potentially blocking other content from being displayed.
              </span>
              <span>Whenever possible, avoid using hidden steps altogether.</span>
            </AlertDescription>
          </Alert>
        )}
      </Select>
    </div>
  );
};
ContentType.displayName = 'ContentType';
