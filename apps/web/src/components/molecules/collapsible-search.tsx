'use client';

import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour-packages/tailwind';
import { KeyboardEvent, MouseEvent, useCallback, useRef, useState } from 'react';

interface CollapsibleSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  expandedWidthClassName?: string;
}

export const CollapsibleSearch = ({
  value,
  onChange,
  placeholder,
  className,
  expandedWidthClassName = 'w-[250px]',
}: CollapsibleSearchProps) => {
  const [expanded, setExpanded] = useState(value !== '');
  const inputRef = useRef<HTMLInputElement>(null);

  const expand = useCallback(() => {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleContainerClick = useCallback(() => {
    if (!expanded) expand();
  }, [expanded, expand]);

  const handleContainerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (expanded) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        expand();
      }
    },
    [expanded, expand],
  );

  const handleBlur = useCallback(() => {
    if (value === '') setExpanded(false);
  }, [value]);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onChange('');
        setExpanded(false);
        inputRef.current?.blur();
      }
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onChange('');
      inputRef.current?.focus();
    },
    [onChange],
  );

  return (
    <div
      role={expanded ? undefined : 'button'}
      tabIndex={expanded ? undefined : 0}
      aria-label={expanded ? undefined : placeholder}
      onClick={handleContainerClick}
      onKeyDown={handleContainerKeyDown}
      className={cn(
        'flex h-8 items-center overflow-hidden rounded-md transition-[width] duration-200',
        expanded
          ? cn(
              expandedWidthClassName,
              'border border-input bg-background focus-within:ring-2 focus-within:ring-ring/50',
            )
          : 'w-8 cursor-pointer hover:bg-accent',
        className,
      )}
    >
      <MagnifyingGlassIcon className="mx-2 h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        tabIndex={expanded ? 0 : -1}
        aria-hidden={!expanded}
        className={cn(
          'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          !expanded && 'pointer-events-none',
        )}
      />
      {expanded && value !== '' && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="mr-2 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
