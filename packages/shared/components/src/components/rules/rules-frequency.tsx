import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { RulesZIndexOffset, WebZIndex } from '@usertour-packages/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Input } from '@usertour-packages/input';
import {
  ContentDataType,
  Frequency,
  FrequencyUnits,
  RulesFrequencyValue,
  RulesFrequencyValueAtLeast,
  RulesFrequencyValueEvery,
} from '@usertour/types';
import { ChangeEvent, useEffect, useState } from 'react';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';

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
  disabled?: boolean;
}
const RulesFrequencyUnits = (props: RulesFrequencyUnitsProps) => {
  const { frequency: _frequency, onChange, contentType, disabled = false } = props;

  const handleValueChange = (value: string) => {
    setFrequency(value as Frequency);
    if (onChange) {
      onChange(value as Frequency);
    }
  };
  const [frequency, setFrequency] = useState<Frequency>(_frequency);

  return (
    <div className="flex flex-row items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button variant="ghost" className="text-primary h-auto p-0">
            <span>{itemsMapping.find((item) => item.key === frequency)?.value}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
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
      <QuestionTooltip>
        Whether the {contentType} can auto-start for the same user just once, or many times.
      </QuestionTooltip>
    </div>
  );
};

interface RulesFrequencyEveryProps {
  frequency: Frequency;
  defaultValue: RulesFrequencyValueEvery;
  onChange?: (value: RulesFrequencyValueEvery) => void;
  contentType: ContentDataType;
  disabled?: boolean;
}

const RulesFrequencyEvery = (props: RulesFrequencyEveryProps) => {
  const { defaultValue, frequency, onChange, contentType, disabled = false } = props;
  const [data, setData] = useState<RulesFrequencyValueEvery>(defaultValue);
  const [openError, setOpenError] = useState(false);

  const errorZIndex = WebZIndex.RULES + RulesZIndexOffset.ERROR;

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
    const value = Number.parseInt(e.target.value) || 0;
    if (frequency === Frequency.MULTIPLE && value < 2) {
      // Only update local state without propagating invalid value to parent
      setData((pre) => ({ ...pre, times: value }));
      setOpenError(true);
    } else {
      setOpenError(false);
      update({ times: value });
    }
  };
  const handleDurationInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ duration: Number.parseInt(e.target.value) || 0 });
  };
  const handleUnitOnChange = (value: string) => {
    update({ unit: value as FrequencyUnits });
  };

  const EveryTimes = (props: { disabled?: boolean }) => {
    const { disabled = false } = props;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button variant="ghost" className="text-primary h-auto p-0">
            <span>{data.unit}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
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
        <RulesError open={openError}>
          <RulesErrorAnchor asChild>
            <Input
              type="text"
              id={'times-input'}
              name={'Times'}
              onChange={handleTimesInputOnChange}
              value={data.times}
              disabled={disabled}
              className="rounded-lg text-sm w-16 h-6"
              placeholder={''}
            />
          </RulesErrorAnchor>
          <RulesErrorContent zIndex={errorZIndex}>Must be at least 2</RulesErrorContent>
        </RulesError>
        <span className="text-sm">times, </span>
        <Input
          type="text"
          id={'duration-input'}
          name={'Duration'}
          onChange={handleDurationInputOnChange}
          value={data.duration}
          disabled={disabled}
          className="rounded-lg text-sm w-16 h-6"
          placeholder={''}
        />
        <EveryTimes disabled={disabled} />
        <span className="text-sm">apart </span>
        <QuestionTooltip>
          <p>
            The {contentType} may auto-start up to {data.times} times, with at least {data.duration}{' '}
            {data.unit} passing in between.
            <br />
            <br />
            Note that manual and programmatic starts are included in the limit.
          </p>
        </QuestionTooltip>
      </div>
    );
  }
  return (
    <div className="flex flex-row items-center space-x-2">
      <span className="text-sm">Every </span>
      <Input
        type="text"
        id={'duration-input'}
        name={'Duration'}
        onChange={handleDurationInputOnChange}
        value={data.duration}
        className="rounded-lg text-sm w-16 h-6"
        placeholder={''}
      />
      <EveryTimes />
      <QuestionTooltip>
        The {contentType} may auto-start unlimited times, with at least {data.duration} {data.unit}{' '}
        passing in between.
      </QuestionTooltip>
    </div>
  );
};

interface RulesFrequencyAtLeastProps {
  defaultValue: RulesFrequencyValueAtLeast;
  onChange?: (value: RulesFrequencyValueAtLeast) => void;
  contentType: ContentDataType;
  disabled?: boolean;
}

const RulesFrequencyAtLeast = (props: RulesFrequencyAtLeastProps) => {
  const { defaultValue, onChange, contentType, disabled = false } = props;
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
    update({ duration: Number.parseInt(e.target.value) || 0 });
  };
  const handleUnitOnChange = (value: string) => {
    update({ unit: value as FrequencyUnits });
  };

  return (
    <div className="flex flex-row items-center space-x-2">
      <span className="text-sm">At least</span>
      <Input
        type="text"
        id={'at-least-duration-input'}
        name={'At least duration'}
        onChange={handleInputOnChange}
        disabled={disabled}
        value={data.duration}
        className="rounded-lg text-sm w-16 h-6"
        placeholder={''}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button variant="ghost" className="text-primary h-auto p-0">
            <span>{data.unit}</span>
            <ChevronDownIcon width={16} height={16} className="ml-2" />
          </Button>
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
      <QuestionTooltip>
        If enabled, the {contentType} will only auto-start if no other {contentType} has shown in
        the period you pick. This is useful to make sure you don't overwhelm users with too much{' '}
        {contentType} at the same time.
      </QuestionTooltip>
    </div>
  );
};

const initialValue: RulesFrequencyValue = {
  frequency: Frequency.ONCE,
  every: {
    times: 2,
    duration: 1,
    unit: FrequencyUnits.DAYES,
  },
  atLeast: {
    duration: 0,
    unit: FrequencyUnits.MINUTES,
  },
};

export interface RulesFrequencyProps {
  defaultValue?: RulesFrequencyValue;
  onChange: (value: RulesFrequencyValue) => void;
  showAtLeast?: boolean;
  contentType?: ContentDataType;
  disabled?: boolean;
}

export const RulesFrequency = (props: RulesFrequencyProps) => {
  const {
    onChange,
    defaultValue,
    showAtLeast = true,
    contentType = ContentDataType.FLOW,
    disabled = false,
  } = props;

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
        disabled={disabled}
      />
      <RulesFrequencyEvery
        frequency={data.frequency}
        defaultValue={data.every}
        onChange={(value) => {
          update({ every: value });
        }}
        contentType={contentType}
        disabled={disabled}
      />
      {showAtLeast && data.atLeast && (
        <RulesFrequencyAtLeast
          defaultValue={data.atLeast}
          onChange={(value) => {
            update({ atLeast: value });
          }}
          contentType={contentType}
          disabled={disabled}
        />
      )}
    </>
  );
};

RulesFrequency.displayName = 'RulesFrequency';
