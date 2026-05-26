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

## Declaration shape: `const` over `function`

**Default to `export const Foo = (props: FooProps) => { … }`. Only use
`export function Foo` for generic components (`function Foo<T>(…)`),
where the const form forces the TSX `<T,>` comma trick.**

```tsx
// ✅ Preferred — const arrow
export const Foo = (props: FooProps) => {
  const { label } = props;
  return <span>{label}</span>;
};

Foo.displayName = 'Foo';

// ✅ Allowed — generic component
export function ResourceTable<T>(props: ResourceTableProps<T>) {
  const { columns, rows, getRowKey } = props;
  // …
}
```

```tsx
// ❌ Avoid — plain function declaration for a non-generic component
export function Foo(props: FooProps) {
  const { label } = props;
  return <span>{label}</span>;
}
```

### Why

- **One shape across the file.** `forwardRef` and `memo` return values
  you have to assign to a binding (`const Foo = forwardRef(…)`). Mixing
  `function Foo` for plain components with `const Bar = forwardRef(…)`
  for ref'd ones in the same file is worse for scanning than picking
  `const` everywhere.
- **Aligns with Radix UI and shadcn.** Same reason as the props-style
  rule above — the libraries we cross-read use `const` uniformly.
- **No hoisting surprises.** `const` declarations evaluate in source
  order, which matches how files read top-to-bottom.

The stack-trace and devtools-name arguments for `function` are myths on
modern toolchains — named `const` bindings resolve fine in React
devtools and error stacks.

### Generic-component exception

TypeScript needs `<T,>` (with a trailing comma) inside TSX to
disambiguate type parameters from JSX tags when using arrow functions.
`function Foo<T>(…)` sidesteps that noise:

```tsx
// ✅ function declaration keeps the generic readable
export function ResourceTable<T>(props: ResourceTableProps<T>) {
  // …
}

// ❌ const arrow form needs the comma trick — avoid for generics
export const ResourceTable = <T,>(props: ResourceTableProps<T>) => {
  // …
};
```

### When migrating older files

The same incremental rule applies: don't bulk-migrate working files just
to swap `function` for `const`. Convert when you're already editing the
file for another reason. New components should land in `const` shape
from the start.
