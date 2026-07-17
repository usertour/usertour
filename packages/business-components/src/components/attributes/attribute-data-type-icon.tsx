import {
  RiCalendarLine,
  RiCheckboxLine,
  RiHashtag,
  RiListUnordered,
  RiShuffleLine,
  RiText,
} from '@usertour/icons';
import { AttributeDataType } from '@usertour/types';

export interface AttributeDataTypeIconProps {
  dataType: number;
  className?: string;
}

/**
 * The product-wide icon vocabulary for attribute data types — shared between
 * the attribute pickers (icon-only rows) and the settings/attributes list
 * (icon + label), so users learn the mapping where it is spelled out and can
 * read it where it is not.
 */
export const AttributeDataTypeIcon = (props: AttributeDataTypeIconProps) => {
  const { dataType, className } = props;
  switch (dataType) {
    case AttributeDataType.Number:
      return <RiHashtag className={className} />;
    case AttributeDataType.Boolean:
      return <RiCheckboxLine className={className} />;
    case AttributeDataType.List:
      return <RiListUnordered className={className} />;
    case AttributeDataType.DateTime:
      return <RiCalendarLine className={className} />;
    case AttributeDataType.RandomAB:
    case AttributeDataType.RandomNumber:
      return <RiShuffleLine className={className} />;
    default:
      return <RiText className={className} />;
  }
};
