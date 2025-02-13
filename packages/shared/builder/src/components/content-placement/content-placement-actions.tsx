import { EXTENSION_SELECT } from '@usertour-ui/constants';
import { Label } from '@usertour-ui/label';
import { ContentActions } from '@usertour-ui/shared-editor';
import { Attribute, Content, ContentVersion, Step } from '@usertour-ui/types';
import { useContentPlacement } from './content-placement-context';

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

  // Render custom children if provided
  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col space-y-2">
      <Label>When target element is clicked</Label>
      <ContentActions
        zIndex={zIndex + EXTENSION_SELECT}
        isShowIf={false}
        isShowLogic={false}
        currentStep={currentStep}
        currentVersion={currentVersion}
        onDataChange={(actions) => onTargetChange({ actions })}
        defaultConditions={target?.actions || []}
        attributes={attributeList}
        contents={contents}
        createStep={createStep}
      />
    </div>
  );
};
