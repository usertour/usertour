import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import {
  ContentIcon,
  ElementIcon,
  EventIcon,
  GroupIcon,
  PagesIcon,
  SegmentIcon,
  TextFillIcon,
  TextInputIcon,
  TimeIcon,
  UserIcon,
} from '@usertour-ui/icons';
import { ReactNode } from 'react';
import { RulesContent } from './rules-content';
import { RulesCurrentTime } from './rules-current-time';
import { RulesElement } from './rules-element';
import { RulesGroup } from './rules-group';
import { RulesSegment } from './rules-segment';
import { RulesTextInput } from './rules-text-input';
import { RulesUrlPattern } from './rules-url-pattern';
import { RulesUserAttribute } from './rules-user-attribute';
import { RulesUserFills } from './rules-user-fills';

const RULES_ITEMS = [
  {
    type: 'user-attr',
    text: 'Attribute',
    IconElement: UserIcon,
    RulesElement: RulesUserAttribute,
  },
  {
    type: 'current-page',
    text: 'Current page(Url)',
    IconElement: PagesIcon,
    RulesElement: RulesUrlPattern,
  },
  {
    type: 'event',
    text: 'Event',
    IconElement: EventIcon,
  },
  {
    type: 'segment',
    text: 'Segment',
    IconElement: SegmentIcon,
    RulesElement: RulesSegment,
  },
  {
    type: 'content',
    text: 'Flow',
    IconElement: ContentIcon,
    RulesElement: RulesContent,
  },
  {
    type: 'element',
    text: 'Element (present, clicked, disabled)',
    IconElement: ElementIcon,
    RulesElement: RulesElement,
  },
  {
    type: 'text-input',
    text: 'Text input value',
    IconElement: TextInputIcon,
    RulesElement: RulesTextInput,
  },
  {
    type: 'text-fill',
    text: 'User fills in input',
    IconElement: TextFillIcon,
    RulesElement: RulesUserFills,
  },
  {
    type: 'time',
    text: 'Current time',
    IconElement: TimeIcon,
    RulesElement: RulesCurrentTime,
  },
  {
    type: 'group',
    text: 'Logic group (and, or)',
    IconElement: GroupIcon,
    RulesElement: RulesGroup,
  },
];

interface RulesAddDropdownProps {
  children: ReactNode;
  onSelect: (type: string) => void;
}
export const RulesAddDropdown = (props: RulesAddDropdownProps) => {
  const { children, onSelect } = props;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {RULES_ITEMS.map(({ type, text, IconElement }, index) => (
          <DropdownMenuItem
            key={index}
            className="cursor-pointer"
            onSelect={() => {
              onSelect(type);
            }}
          >
            <IconElement width={16} height={16} className="mx-1" />
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

RulesAddDropdown.displayName = 'RulesAddDropdown';
