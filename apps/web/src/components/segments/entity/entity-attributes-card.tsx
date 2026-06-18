import { CopyIcon } from '@radix-ui/react-icons';
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
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {attributes.map(({ name, value, dataType }, key) => {
          const formattedValue = formatAttributeValue(value, dataType);
          const isDateTime = dataType === AttributeDataType.DateTime;
          const textToCopy = String(isDateTime ? value : formattedValue);
          return (
            <div
              key={key}
              className="group flex min-w-0 flex-row gap-2 border-b text-sm last:border-0"
            >
              <div className="w-2/5 min-w-0 break-words p-2 leading-6 font-medium">{name}</div>
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
