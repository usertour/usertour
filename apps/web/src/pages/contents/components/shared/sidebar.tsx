import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-packages/button';
import {
  BannerIcon,
  ChecklistIcon,
  FlowIcon,
  LauncherIcon,
  NpsIcon,
  SurveyIcon,
} from '@usertour-packages/icons';
import { ContentTypeName } from '@usertour/types';
import { cn } from '@usertour-packages/utils';
import { useNavigate, useParams } from 'react-router-dom';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const sidebarNavItems = [
  {
    title: 'Engagement Layer',
    items: [
      {
        title: 'Flows',
        disabled: false,
        icon: <FlowIcon className="mr-2 h-4 w-4" />,
        contentType: ContentTypeName.FLOWS,
      },
      {
        title: 'Launchers',
        disabled: false,
        icon: <LauncherIcon className="mr-2 h-4 w-4" />,
        contentType: ContentTypeName.LAUNCHERS,
      },
      {
        title: 'Checklists',
        disabled: false,
        icon: <ChecklistIcon className="mr-2 h-4 w-4" />,
        contentType: ContentTypeName.CHECKLISTS,
      },
      {
        title: 'Banners',
        disabled: false,
        icon: <BannerIcon className="mr-2 h-4 w-4" />,
        contentType: ContentTypeName.BANNERS,
      },
    ],
  },
  {
    title: 'User Feedback',
    items: [
      {
        title: 'NPS',
        disabled: false,
        icon: <NpsIcon className="mr-2 h-4 w-4 scale-125" />,
        contentType: ContentTypeName.NPS,
      },
      {
        title: 'Surveys',
        disabled: false,
        icon: <SurveyIcon className="mr-2 h-4 w-4" />,
        contentType: ContentTypeName.SURVEYS,
      },
    ],
  },
];

export function Sidebar({ className }: SidebarProps) {
  const { contentType } = useParams();
  const navigate = useNavigate();
  const { environment } = useAppContext();

  return (
    <div className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        {sidebarNavItems.map((item, index) => (
          <div className="px-3 py-2" key={index}>
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">{item.title}</h2>
            <div className="space-y-1">
              {item.items.map((subItems, subIndex) => (
                <Button
                  key={`${index}-${subIndex}`}
                  disabled={subItems.disabled}
                  onClick={() => {
                    navigate(`/env/${environment?.id}/${subItems.contentType}`);
                  }}
                  variant={contentType === subItems.contentType ? 'secondary' : 'ghost'}
                  className={`w-full justify-start ${
                    contentType === subItems.contentType ? 'bg-indigo-100 hover:bg-[none]' : ''
                  }`}
                >
                  {subItems.icon}
                  {subItems.title}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
