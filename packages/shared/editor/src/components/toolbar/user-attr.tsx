import { Button } from '@usertour-ui/button';
import { UserIcon } from '@usertour-ui/icons';
import { cn } from '@usertour-ui/ui-utils';
import { useSlate } from 'slate-react';
import { inertUserAttributeBlock } from '../../lib/editorHelper';

export const UserAttrButton = ({ className }: { className: string }) => {
  const editor = useSlate();
  const handleOnClick = () => {
    inertUserAttributeBlock(editor);
  };
  return (
    <Button variant="ghost" onClick={handleOnClick} className={cn('h-fit p-2', className)}>
      <UserIcon height={15} width={15} />
    </Button>
  );
};
