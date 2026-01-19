import { Button } from '@usertour-packages/button';
import { UserIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { memo, useCallback } from 'react';
import { useSlate } from 'slate-react';
import { insertUserAttributeBlock } from '../../lib/editorHelper';

interface UserAttrButtonProps {
  className?: string;
}

export const UserAttrButton = memo(({ className }: UserAttrButtonProps) => {
  const editor = useSlate();

  const handleClick = useCallback(() => {
    insertUserAttributeBlock(editor);
  }, [editor]);

  return (
    <Button variant="ghost" onClick={handleClick} className={cn('h-fit p-2', className)}>
      <UserIcon height={15} width={15} />
    </Button>
  );
});

UserAttrButton.displayName = 'UserAttrButton';
