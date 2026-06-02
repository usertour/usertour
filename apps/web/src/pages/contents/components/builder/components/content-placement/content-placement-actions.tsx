import { EXTENSION_SELECT } from '@usertour/constants';
import { Label } from '@usertour/ui';
import { Actions } from '@usertour/editor';
import { Attribute, Content, ContentVersion, Step } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useContentPlacement } from '@/pages/contents/components/builder/components/content-placement/content-placement-context';

interface ContentPlacementActionsProps {
  children?: React.ReactNode;
  currentStep?: Step;
  currentVersion?: ContentVersion;
  attributeList?: Attribute[];
  contents?: Content[];
  createStep?: (currentVersion: ContentVersion, sequence: number) => Promise<Step | undefined>;
}

export const ContentPlacementActions = ({
  children,
  currentStep,
  currentVersion,
  attributeList,
  contents,
  createStep,
}: ContentPlacementActionsProps) => {
  const { target, zIndex, onTargetChange } = useContentPlacement();
  const { t } = useTranslation();

  // Render custom children if provided
  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col space-y-2">
      <Label>When target element is clicked</Label>
      <Actions
        baseZIndex={zIndex + EXTENSION_SELECT}
        currentStep={currentStep}
        currentVersion={currentVersion}
        conditions={target?.actions || []}
        onChange={(actions) => onTargetChange({ actions })}
        attributes={attributeList}
        contents={contents}
        createStep={createStep}
        t={t}
      />
    </div>
  );
};
