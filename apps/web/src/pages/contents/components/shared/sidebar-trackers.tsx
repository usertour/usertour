import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-packages/button';
import { EventIcon2 } from '@usertour-packages/icons';
import { ContentTypeName } from '@usertour/types';
import { cn } from '@usertour-packages/utils';
import { useNavigate, useParams } from 'react-router-dom';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const sidebarNavItems = [
  {
    title: 'Trackers',
    items: [
      {
        title: 'Trackers event',
        icon: <EventIcon2 className="mr-2 h-4 w-4" />,
        contentType: ContentTypeName.TRACKERS,
      },
    ],
  },
];

export const TrackersSidebar = ({ className }: SidebarProps) => {
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
};

TrackersSidebar.displayName = 'TrackersSidebar';
