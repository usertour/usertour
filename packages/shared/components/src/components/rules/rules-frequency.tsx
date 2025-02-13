import { ChevronDownIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Input } from '@usertour-ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import {
  ContentDataType,
  Frequency,
  FrequencyUnits,
  RulesFrequencyValue,
  RulesFrequencyValueAtLeast,
  RulesFrequencyValueEvery,
} from '@usertour-ui/types';
import { ChangeEvent, useEffect, useState } from 'react';
import { HelpTooltip } from '../common/help-tooltip';

const itemsMapping = [
  { key: Frequency.ONCE, value: 'Once per user' },
  { key: Frequency.MULTIPLE, value: 'Multiple times per user' },
  { key: Frequency.UNLIMITED, value: 'Unlimited times per user' },
];
const timesList = [
  FrequencyUnits.DAYES,
  FrequencyUnits.HOURS,
  FrequencyUnits.SECONDS,
  FrequencyUnits.MINUTES,
];

interface RulesFrequencyUnitsProps {
  frequency: Frequency;
  onChange?: (frequency: Frequency) => void;
  contentType: ContentDataType;
}
const RulesFrequencyUnits = (props: RulesFrequencyUnitsProps) => {
  const { frequency: _frequency, onChange, contentType } = props;

  const handleValueChange = (value: string) => {
    setFrequency(value as Frequency);
    if (onChange) {
      onChange(value as Frequency);
    }
  };
  const [frequency, setFrequency] = useState<Frequency>(_frequency);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-row items-center space-x-2">
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
            <span>{itemsMapping.find((item) => item.key === frequency)?.value}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-foreground text-background">
                Whether the {contentType} can auto-start for the same user just once, or many times.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={frequency} onValueChange={handleValueChange}>
          {itemsMapping.map((item) => (
            <DropdownMenuRadioItem value={item.key} key={item.key}>
              {item.value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface RulesFrequencyEveryProps {
  frequency: Frequency;
  defaultValue: RulesFrequencyValueEvery;
  onChange?: (value: RulesFrequencyValueEvery) => void;
  contentType: ContentDataType;
}
const RulesFrequencyEvery = (props: RulesFrequencyEveryProps) => {
  const { defaultValue, frequency, onChange, contentType } = props;
  const [data, setData] = useState<RulesFrequencyValueEvery>(defaultValue);

  const update = (params: Partial<RulesFrequencyValueEvery>) => {
    setData((pre) => {
      const v = { ...pre, ...params };
      if (onChange) {
        onChange(v);
      }
      return v;
    });
  };

  const handleTimesInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ times: Number.parseInt(e.target.value) });
  };
  const handleDurationInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ duration: Number.parseInt(e.target.value) });
  };
  const handleUnitOnChange = (value: string) => {
    update({ unit: value as FrequencyUnits });
  };

  const EveryTimes = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer">
            <span>{data.unit}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={data.unit} onValueChange={handleUnitOnChange}>
            {timesList.map((v) => (
              <DropdownMenuRadioItem value={v} key={v}>
                {v}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (frequency === Frequency.ONCE) {
    return <></>;
  }

  if (frequency === Frequency.MULTIPLE) {
    return (
      <div className="flex flex-row items-center space-x-2">
        <Input
          type="text"
          id={'border-width'}
          name={'Border width'}
          onChange={handleTimesInputOnChange}
          value={data.times}
          className="rounded-lg text-sm w-16 h-6 "
          placeholder={''}
        />
        <span className="text-sm">times, </span>
        <Input
          type="text"
          id={'border-width'}
          name={'Border width'}
          onChange={handleDurationInputOnChange}
          value={data.duration}
          className="rounded-lg text-sm w-16 h-6 "
          placeholder={''}
        />
        <EveryTimes />
        <span className="text-sm">apart </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <QuestionMarkCircledIcon />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-foreground text-background">
              <p>
                The {contentType} may auto-start up to {data.times} times, with at least{' '}
                {data.duration} {data.unit} passing in between.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
  return (
    <div className="flex flex-row items-center space-x-2">
      <span className="text-sm">Every </span>
      <Input
        type="text"
        id={'border-width'}
        name={'Border width'}
        onChange={handleDurationInputOnChange}
        value={data.duration}
        className="rounded-lg text-sm w-16 h-6 "
        placeholder={''}
      />
      <EveryTimes />
      <HelpTooltip>
        The {contentType} may auto-start unlimited times, with at least {data.duration} {data.unit}{' '}
        passing in between.
      </HelpTooltip>
    </div>
  );
};

interface RulesFrequencyAtLeastProps {
  defaultValue: RulesFrequencyValueAtLeast;
  onChange?: (value: RulesFrequencyValueAtLeast) => void;
  contentType: ContentDataType;
}

const RulesFrequencyAtLeast = (props: RulesFrequencyAtLeastProps) => {
  const { defaultValue, onChange, contentType } = props;
  const [data, setData] = useState<RulesFrequencyValueAtLeast>(defaultValue);

  const update = (params: Partial<RulesFrequencyValueAtLeast>) => {
    setData((pre) => {
      const v = { ...pre, ...params };
      if (onChange) {
        onChange(v);
      }
      return v;
    });
  };
  const handleInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ duration: Number.parseInt(e.target.value) });
  };
  const handleUnitOnChange = (value: string) => {
    update({ unit: value as FrequencyUnits });
  };

  return (
    <div className="flex flex-row items-center space-x-2">
      <span className="text-sm">At least</span>
      <Input
        type="text"
        id={'border-width'}
        name={'Border width'}
        onChange={handleInputOnChange}
        value={data.duration}
        className="rounded-lg text-sm w-16 h-6 "
        placeholder={''}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer">
            <span>{data.unit}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={data.unit} onValueChange={handleUnitOnChange}>
            {timesList.map((v) => (
              <DropdownMenuRadioItem value={v} key={v}>
                {v}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-sm">after any {contentType}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <QuestionMarkCircledIcon />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            If enabled, the {contentType} will only auto-start if no other {contentType} has shown
            in the period you pick. This is useful to make sure you don't overwhelm users with too
            much {contentType} at the same time.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const initialValue: RulesFrequencyValue = {
  frequency: Frequency.ONCE,
  every: {
    times: 0,
    duration: 0,
    unit: FrequencyUnits.DAYES,
  },
  atLeast: {
    duration: 0,
    unit: FrequencyUnits.DAYES,
  },
};

export interface RulesFrequencyProps {
  defaultValue?: RulesFrequencyValue;
  onChange: (value: RulesFrequencyValue) => void;
  showAtLeast?: boolean;
  contentType?: ContentDataType;
}
export const RulesFrequency = (props: RulesFrequencyProps) => {
  const { onChange, defaultValue, showAtLeast = true, contentType = ContentDataType.FLOW } = props;

  const initialData: RulesFrequencyValue = {
    ...(defaultValue || initialValue),
    atLeast: showAtLeast ? (defaultValue || initialValue).atLeast : undefined,
  };
  const [data, setData] = useState<RulesFrequencyValue>(initialData);

  useEffect(() => {
    if (!defaultValue) {
      onChange(initialData);
    }
  }, [defaultValue, initialData, onChange]);

  const update = (value: Partial<RulesFrequencyValue>) => {
    setData((pre) => {
      const v = { ...pre, ...value };
      onChange(v);
      return v;
    });
  };

  return (
    <>
      <RulesFrequencyUnits
        frequency={data.frequency}
        onChange={(v) => {
          update({ frequency: v });
        }}
        contentType={contentType}
      />
      <RulesFrequencyEvery
        frequency={data.frequency}
        defaultValue={data.every}
        onChange={(value) => {
          update({ every: value });
        }}
        contentType={contentType}
      />
      {showAtLeast && data.atLeast && (
        <RulesFrequencyAtLeast
          defaultValue={data.atLeast}
          onChange={(value) => {
            update({ atLeast: value });
          }}
          contentType={contentType}
        />
      )}
    </>
  );
};

RulesFrequency.displayName = 'RulesFrequency';
