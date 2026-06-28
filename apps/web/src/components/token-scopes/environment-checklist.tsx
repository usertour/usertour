import { Checkbox, Label } from '@usertour/ui';

interface EnvironmentChecklistProps {
  environments: { id: string; name: string }[];
  /** Selected environment ids. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * "Which environments may this token act on" checklist, shared by the personal-key dialog and
 * the OAuth consent screen. None pre-selected by callers (safe-first).
 */
export const EnvironmentChecklist = ({
  environments,
  value,
  onChange,
}: EnvironmentChecklistProps) => (
  <div className="space-y-2">
    {environments.map((environment) => (
      <div key={environment.id} className="flex items-center gap-2">
        <Checkbox
          id={`env-${environment.id}`}
          checked={value.includes(environment.id)}
          onCheckedChange={(checked) =>
            onChange(
              checked === true
                ? [...value, environment.id]
                : value.filter((id) => id !== environment.id),
            )
          }
        />
        <Label htmlFor={`env-${environment.id}`} className="cursor-pointer font-normal">
          {environment.name}
        </Label>
      </div>
    ))}
  </div>
);

EnvironmentChecklist.displayName = 'EnvironmentChecklist';
