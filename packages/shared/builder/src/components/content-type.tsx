import { CubeIcon } from "@radix-ui/react-icons";
import { EXTENSION_SELECT } from "@usertour-ui/constants";
import { ModelIcon, TooltipIcon } from "@usertour-ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usertour-ui/select";

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
          <CubeIcon className="mr-2 flex-none" />
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
                <TooltipIcon width={16} height={16} className="mt-1" />
                <span className="text-xs">Tooltip</span>
              </div>
              <p className="text-xs max-w-60">
                A tooltip anchored to an element you select. Well-suited for
                steps that request users to click a specific element.
              </p>
            </div>
          </SelectItem>

          <SelectItem value="modal">
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <ModelIcon width={16} height={16} className="mt-1" />
                <span className="text-xs">Modal</span>
              </div>
              <p className="text-xs max-w-60">
                A modal dialog appearing in the center of the screen. A
                semi-transparent backdrop will cover your app.
              </p>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
ContentType.displayName = "ContentType";
