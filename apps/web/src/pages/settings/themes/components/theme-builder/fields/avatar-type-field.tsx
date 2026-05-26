import type { AvatarType } from '@usertour/types';
import { useBuilderContext } from '../builder-context';
import { AvatarTypeSelector } from '../widgets/avatar-type';

export interface AvatarTypeFieldProps {
  basePath: string;
}

interface AvatarShape {
  type: AvatarType;
  name?: string;
  url?: string;
}

export function AvatarTypeField(props: AvatarTypeFieldProps) {
  const { basePath } = props;
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<AvatarShape>(basePath);
  return (
    <AvatarTypeSelector
      type={value?.type as AvatarType}
      name={value?.name}
      url={value?.url}
      disabled={isReadOnly}
      onChange={(updates) => {
        setField(`${basePath}.type`, updates.type);
        setField(`${basePath}.name`, updates.name ?? '');
        setField(`${basePath}.url`, updates.url ?? '');
      }}
    />
  );
}
