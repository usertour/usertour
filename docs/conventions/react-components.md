# React component conventions

Lightweight code-style guide for React components in this repo. Not an
ADR — these are author-time conventions, not architectural decisions. If
you find yourself wanting to deviate, lean toward updating this doc
rather than forking the style for one file.

## Props definition: Radix-style

**Define a named `Props` interface and export it. Destructure inside the
function body, not in the parameter signature.**

```tsx
// ✅ Preferred — Radix-style
export interface NewItemButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Localised button text — usually `t('…newButton')` from i18n. */
  label: ReactNode;
}

export const NewItemButton = React.forwardRef<HTMLButtonElement, NewItemButtonProps>(
  (props, ref) => {
    const { label, ...rest } = props;
    return (
      <Button ref={ref} {...rest}>
        <RiAddLine className="mr-1 h-4 w-4 opacity-60" />
        {label}
      </Button>
    );
  },
);

NewItemButton.displayName = 'NewItemButton';
```

```tsx
// ❌ Avoid — inline anonymous type + signature destructure
export const NewItemButton = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    label: ReactNode;
  }
>(({ label, ...props }, ref) => (
  <Button ref={ref} {...props}>
    <RiAddLine className="mr-1 h-4 w-4 opacity-60" />
    {label}
  </Button>
));
```

### Why

- **Public API is explicit.** The named interface (e.g. `NewItemButtonProps`)
  is the contract; consumers can import it for `Omit<NewItemButtonProps,
  'foo'>` composition, wrap it in higher-level types, hover for IDE info,
  etc. Anonymous inline types are private by accident.
- **Function signatures stay scannable.** The signature shows only the
  parameter names — not 10 destructured prop names mixed with the type
  spread — so the entry point is uniform across the file.
- **Aligns with Radix UI and shadcn.** Both libraries we lean on use this
  shape across every primitive. Matching their style keeps cross-reading
  smooth.

### When migrating older files

Several legacy primitives (`LoadingButton`, `SettingsDialogForm`,
`SettingsFormSection`) still use the inline signature-destructure shape.
**Don't bulk-migrate** — touch them when you're already editing them for
another reason. Adding new components in the old style is what to avoid.

### `forwardRef` is not always required

If a primitive doesn't need to expose a `ref` (no DOM passthrough, no
focus management, etc.), drop the `forwardRef` wrapper — but keep the
named `Props` interface either way:

```tsx
export interface FooProps {
  label: ReactNode;
}

export const Foo = (props: FooProps) => {
  const { label } = props;
  return <span>{label}</span>;
};

Foo.displayName = 'Foo';
```
