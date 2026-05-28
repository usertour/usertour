import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useAppContext } from '@/contexts/app-context';
import { AttributeCreateForm } from '@usertour/editor';
import { CompanyIcon, EventIcon2, UserIcon, UserIcon2 } from '@usertour/icons';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  NewItemButton,
  SettingsPage,
} from '@usertour/ui';
import { AttributeBizTypes } from '@usertour/types';
import { AttributeListContent } from './components/attribute-list-content';

const ATTRIBUTES_DOCS_HREF =
  'https://docs.usertour.io/developers/usertourjs-reference/overview/#attributes';

// Tab value → AttributeBizTypes mapping. Drives both AttributeListContent
// (which expects a bizType number) and the New attribute dialog's
// initial `bizType` default — clicking "New attribute" from the Company
// tab pre-selects Company in the dialog, etc.
const TAB_TO_BIZ_TYPE = {
  user: AttributeBizTypes.User,
  company: AttributeBizTypes.Company,
  membership: AttributeBizTypes.Membership,
  event: AttributeBizTypes.Event,
} as const;
type AttributeTab = keyof typeof TAB_TO_BIZ_TYPE;

interface NewAttributeButtonProps {
  bizType: AttributeBizTypes;
  onSuccess: () => void;
}

const NewAttributeButton = (props: NewAttributeButtonProps) => {
  const { bizType, onSuccess } = props;
  const { isViewOnly, project } = useAppContext();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <NewItemButton
        onClick={() => setOpen(true)}
        disabled={isViewOnly}
        label={t('settings.attributes.newButton')}
      />
      {project?.id ? (
        <AttributeCreateForm
          isOpen={open}
          onOpenChange={setOpen}
          onSuccess={() => {
            setOpen(false);
            onSuccess();
          }}
          projectId={project.id}
          // Pre-select the bizType matching the active tab so the
          // dialog picks up "where the user clicked from" instead of
          // always defaulting to User.
          defaultValues={{ bizType: String(bizType) }}
        />
      ) : null}
    </>
  );
};

export const SettingsAttributeList = () => {
  const { refetch } = useAttributeListContext();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AttributeTab>('user');

  return (
    <SettingsPage
      title={t('settings.attributes.title')}
      actions={<NewAttributeButton bizType={TAB_TO_BIZ_TYPE[activeTab]} onSuccess={refetch} />}
      description={<p>{t('settings.attributes.description')}</p>}
      docs={{
        href: ATTRIBUTES_DOCS_HREF,
        label: t('settings.common.readGuide', { topic: t('settings.attributes.title') }),
      }}
    >
      <Tabs
        value={activeTab}
        onValueChange={(next) => setActiveTab(next as AttributeTab)}
        className="h-full space-y-6"
      >
        <div className="space-between flex items-center">
          <TabsList>
            <TabsTrigger value="user" className="relative">
              <UserIcon width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.user')}
            </TabsTrigger>
            <TabsTrigger value="company">
              <CompanyIcon width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.company')}
            </TabsTrigger>
            <TabsTrigger value="membership">
              <UserIcon2 width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.membership')}
            </TabsTrigger>
            <TabsTrigger value="event">
              <EventIcon2 width={16} height={16} className="mr-1" />
              {t('settings.attributes.tabs.event')}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="user" className="border-none p-0 outline-none">
          <AttributeListContent bizType={1} />
        </TabsContent>
        <TabsContent
          value="company"
          className="h-full flex-col border-none p-0 data-[state=active]:flex"
        >
          <AttributeListContent bizType={2} />
        </TabsContent>
        <TabsContent
          value="membership"
          className="h-full flex-col border-none p-0 data-[state=active]:flex"
        >
          <AttributeListContent bizType={3} />
        </TabsContent>
        <TabsContent
          value="event"
          className="h-full flex-col border-none p-0 data-[state=active]:flex"
        >
          <AttributeListContent bizType={4} />
        </TabsContent>
      </Tabs>
    </SettingsPage>
  );
};

SettingsAttributeList.displayName = 'SettingsAttributeList';
