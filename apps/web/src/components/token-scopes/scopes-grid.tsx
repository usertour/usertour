import {
  Checkbox,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { useTranslation } from 'react-i18next';
import { type ScopeResource, SCOPE_RESOURCES, levelOf, setLevel } from './scopes';

interface ScopesGridProps {
  /** Selected capability strings. */
  value: string[];
  onChange: (next: string[]) => void;
  /**
   * Optional cap — only these capabilities may be granted (a level whose capabilities aren't
   * all available is disabled). Used by OAuth consent (= requested ∩ role); omit for the
   * personal-key dialog (granting is bounded by the owner's role server-side).
   */
  available?: string[];
}

/**
 * Per-resource Read / Write scope picker shared by the personal-key dialog and the OAuth
 * consent screen. Renders the access level (`levelOf`) and toggles it (`setLevel`).
 */
export const ScopesGrid = ({ value, onChange, available }: ScopesGridProps) => {
  const { t } = useTranslation();
  const isAvailable = (cap: string) => !available || available.includes(cap);
  const readAvailableFor = (r: ScopeResource) => r.read.every(isAvailable);
  const writeAvailableFor = (r: ScopeResource) =>
    (r.write?.every(isAvailable) ?? false) && readAvailableFor(r);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {SCOPE_RESOURCES.map((resource) => {
          const level = levelOf(value, resource);
          const readChecked = level !== 'none';
          const writeChecked = level === 'write';
          const readDisabled = !readAvailableFor(resource);
          const writeNoApi = resource.write === null;
          const writeDisabled = writeNoApi || !writeAvailableFor(resource);
          return (
            <div key={resource.key} className="flex items-center justify-between gap-4">
              <Label className="font-normal">{t(resource.labelKey)}</Label>
              <div className="flex items-center">
                <div className="flex w-24 items-center gap-2">
                  <Checkbox
                    id={`scope-${resource.key}-read`}
                    checked={readChecked}
                    disabled={readDisabled}
                    onCheckedChange={(checked) =>
                      onChange(
                        setLevel(
                          value,
                          resource,
                          checked === true ? (level === 'none' ? 'read' : level) : 'none',
                        ),
                      )
                    }
                  />
                  <Label
                    htmlFor={`scope-${resource.key}-read`}
                    className="cursor-pointer font-normal"
                  >
                    {t('settings.personalApiKeys.scopeLevels.read')}
                  </Label>
                </div>
                {writeNoApi ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex w-24 cursor-not-allowed items-center gap-2 opacity-40">
                        <Checkbox id={`scope-${resource.key}-write`} checked={false} disabled />
                        <Label htmlFor={`scope-${resource.key}-write`} className="font-normal">
                          {t('settings.personalApiKeys.scopeLevels.write')}
                        </Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t('settings.personalApiKeys.scopeNoWrite')}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex w-24 items-center gap-2">
                    <Checkbox
                      id={`scope-${resource.key}-write`}
                      checked={writeChecked}
                      disabled={writeDisabled}
                      onCheckedChange={(checked) =>
                        onChange(setLevel(value, resource, checked === true ? 'write' : 'read'))
                      }
                    />
                    <Label
                      htmlFor={`scope-${resource.key}-write`}
                      className="cursor-pointer font-normal"
                    >
                      {t('settings.personalApiKeys.scopeLevels.write')}
                    </Label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

ScopesGrid.displayName = 'ScopesGrid';
