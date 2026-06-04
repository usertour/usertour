import {
  CompactDropdownMenu,
  CompactDropdownMenuContent,
  CompactDropdownMenuItem,
  CompactDropdownMenuTrigger,
  CompactPopoverTrigger,
  Label,
  QuestionTooltip,
} from '@usertour/ui';
import { RiArrowDownSLine } from '@usertour/icons';
import { useTranslation } from 'react-i18next';

interface SequenceSelectProps {
  value?: string;
  onChange: (value: string) => void;
  zIndex: number;
}

export const SequenceSelect = (props: SequenceSelectProps) => {
  const { value = '1st', onChange, zIndex } = props;
  const { t } = useTranslation();
  // The stored value key keeps its historical `${num}st` form; only the label
  // is resolved (with correct ordinals) through i18n.
  const options = [1, 2, 3, 4, 5].map((num) => ({
    value: `${num}st`,
    label: t(`contentBuilder.shared.selectElement.${num}`),
  }));
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-start items-center space-x-1">
        <Label>{t('contentBuilder.shared.ifMultipleMatches')}</Label>
        <QuestionTooltip>{t('contentBuilder.shared.ifMultipleMatchesTooltip')}</QuestionTooltip>
      </div>
      <CompactDropdownMenu>
        <CompactDropdownMenuTrigger asChild>
          <CompactPopoverTrigger className="justify-between">
            <span className="truncate">{current.label}</span>
            <RiArrowDownSLine className="ml-2 size-4 shrink-0 opacity-50" />
          </CompactPopoverTrigger>
        </CompactDropdownMenuTrigger>
        <CompactDropdownMenuContent
          align="start"
          style={{ zIndex }}
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {options.map((option) => (
            <CompactDropdownMenuItem key={option.value} onSelect={() => onChange(option.value)}>
              {option.label}
            </CompactDropdownMenuItem>
          ))}
        </CompactDropdownMenuContent>
      </CompactDropdownMenu>
    </div>
  );
};
