import { CopyIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { IntegrationSourceMark } from '@usertour/business-components';
import { Button, Card, CardContent, CardHeader, CardTitle, TruncatedText } from '@usertour/ui';
import { AttributeDataType } from '@usertour/types';
import { formatAttributeValue } from '@/utils/common';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import type { DerivedAttribute } from '@/hooks/use-derived-entity-attributes';

interface EntityAttributesCardProps {
  title: string;
  attributes: DerivedAttribute[];
}

// Right-column attributes card used by user-detail / company-detail.
// Renders one row per attribute with hover-revealed copy button. The
// derivation (name lookup + sort) lives in `useDerivedEntityAttributes`
// at the caller level so this component stays purely presentational.
export const EntityAttributesCard = ({ title, attributes }: EntityAttributesCardProps) => {
  const copyWithToast = useCopyWithToast();
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {attributes.map(({ name, value, dataType, source }, key) => {
          const formattedValue = formatAttributeValue(value, dataType);
          const isDateTime = dataType === AttributeDataType.DateTime;
          const textToCopy = String(isDateTime ? value : formattedValue);
          return (
            <div
              key={key}
              className="group flex min-w-0 flex-row gap-2 border-b text-sm last:border-0"
            >
              {/* Text wraps within the column; the provider mark is pinned to
                  the first line's end so it never drops to a line of its own. */}
              <div className="flex w-2/5 min-w-0 items-start gap-1.5 p-2 leading-6 font-medium">
                <span className="min-w-0 break-words">{name}</span>
                <IntegrationSourceMark
                  source={source}
                  labelFor={(provider) => t('attributes.syncedFrom', { provider })}
                  className="mt-1.5 h-3 w-3"
                />
              </div>
              <div className="w-3/5 min-w-0 break-words p-2 leading-6">
                {isDateTime ? (
                  <TruncatedText text={formattedValue} className="max-w-full" rawValue={value} />
                ) : (
                  formattedValue
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="m-2 h-6 w-6 rounded invisible flex-shrink-0 group-hover:visible"
                onClick={() => copyWithToast(textToCopy)}
              >
                <CopyIcon className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

EntityAttributesCard.displayName = 'EntityAttributesCard';
