import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  QuestionTooltip,
} from '@usertour/ui';
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

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-start items-center space-x-1">
        <Label>{t('contentBuilder.shared.ifMultipleMatches')}</Label>
        <QuestionTooltip>{t('contentBuilder.shared.ifMultipleMatchesTooltip')}</QuestionTooltip>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger variant="compact">
          <SelectValue placeholder={t('contentBuilder.shared.selectSequencePlaceholder')} />
        </SelectTrigger>
        <SelectContent style={{ zIndex }}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
