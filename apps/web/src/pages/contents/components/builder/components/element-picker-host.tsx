import { createOpenpicker, OpenpickerError } from '@openpicker/sdk';
import { ElementPickerProvider, type PickElementFunction } from '@usertour/business-components';
import { useUpdateContentMutation } from '@usertour/hooks';
import { SpinnerIcon } from '@usertour/icons';
import {
  Button,
  Dialog,
  DialogContentSimple,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  Input,
  useToast,
} from '@usertour/ui';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderStore } from '@/pages/contents/components/builder/core';

const EXTENSION_INSTALL_URL =
  'https://chromewebstore.google.com/detail/openpicker/iflipcihgpkellfpebibkmlklembmjph';

// Module-level singleton: the SDK is a stateless postMessage client, and a
// single instance serves every pick in the session.
const openpicker = createOpenpicker({ appName: 'Usertour' });

// The pick URL is an entry point, not the element's exact address — the
// picker survives in-tab navigation, so any page of the app works. Accept
// scheme-less input ("app.example.com") by defaulting to https.
const normalizeUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).href;
  } catch {
    return null;
  }
};

export interface ElementPickerHostProps {
  children?: ReactNode;
}

// The single place that talks to the element-picker browser extension.
// Provides a PickElementFunction to the builder tree (placement inputs and
// condition editors render their pick buttons off it) and owns the UX
// around it: asking for a build URL when the content has none (and saving
// it back as the team-shared default), the install prompt when the
// extension is missing, and error toasts. Picking happens in a separate
// tab on the content's buildUrl; the user can navigate within that tab
// before picking, so the URL only needs to reach the app.
export const ElementPickerHost = (props: ElementPickerHostProps) => {
  const { children } = props;
  const { t } = useTranslation();
  const { toast } = useToast();
  const currentContent = useBuilderStore((state) => state.currentContent);
  const setCurrentContent = useBuilderStore((state) => state.setCurrentContent);
  const { invoke: updateContent } = useUpdateContentMutation();
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [hasUrlError, setHasUrlError] = useState(false);
  // Resolver for the pick currently waiting on the URL dialog. Settled with
  // the entered URL on confirm, or null on dismiss.
  const urlResolverRef = useRef<((url: string | null) => void) | null>(null);
  // Resolver for the pick currently waiting on the install dialog. The
  // extension injects into already-open tabs on install, so while the
  // dialog is open we poll isAvailable() — the moment it turns true the
  // dialog closes and the original pick resumes; dismissing settles false.
  const installResolverRef = useRef<((installed: boolean) => void) | null>(null);

  // Settle pending pick flows if the builder unmounts mid-dialog so their
  // poll loops and awaiting callers don't outlive the host.
  useEffect(() => {
    return () => {
      urlResolverRef.current?.(null);
      urlResolverRef.current = null;
      installResolverRef.current?.(false);
      installResolverRef.current = null;
    };
  }, []);

  const requestBuildUrl = useCallback((initialUrl: string): Promise<string | null> => {
    setUrlValue(initialUrl);
    setHasUrlError(false);
    setIsUrlDialogOpen(true);
    return new Promise((resolve) => {
      urlResolverRef.current = resolve;
    });
  }, []);

  const settleUrlDialog = useCallback((url: string | null) => {
    urlResolverRef.current?.(url);
    urlResolverRef.current = null;
    setIsUrlDialogOpen(false);
  }, []);

  const handleUrlConfirm = useCallback(() => {
    const normalized = normalizeUrl(urlValue);
    if (!normalized) {
      setHasUrlError(true);
      return;
    }
    settleUrlDialog(normalized);
  }, [urlValue, settleUrlDialog]);

  const settleInstallDialog = useCallback((installed: boolean) => {
    installResolverRef.current?.(installed);
    installResolverRef.current = null;
    setIsInstallDialogOpen(false);
  }, []);

  const waitForExtensionInstall = useCallback((): Promise<boolean> => {
    setIsInstallDialogOpen(true);
    return new Promise((resolve) => {
      installResolverRef.current = resolve;
      const poll = async () => {
        // Each isAvailable() is itself a ping with a timeout, so this
        // loop settles into a ~2s cadence. It exits when the dialog is
        // settled (the ref no longer points at this pick's resolver).
        while (installResolverRef.current === resolve) {
          if (await openpicker.isAvailable()) {
            if (installResolverRef.current === resolve) {
              installResolverRef.current = null;
              setIsInstallDialogOpen(false);
              resolve(true);
            }
            return;
          }
          await new Promise((delay) => setTimeout(delay, 500));
        }
      };
      void poll();
    });
  }, []);

  const pickElement = useCallback<PickElementFunction>(
    async (options) => {
      if (!(await openpicker.isAvailable())) {
        const installed = await waitForExtensionInstall();
        if (!installed) {
          return null;
        }
      }
      let url = currentContent?.buildUrl;
      // When no target tab is open, this pick will open one — give the user
      // a chance to adjust the URL first (prefilled with the saved build
      // URL). With a target tab already open the extension reuses it and
      // never re-navigates, so the URL is moot and the dialog would only be
      // in the way. Older extensions without isTargetOpen count as "not
      // open" and fall back to showing the dialog.
      const isTargetOpen = await openpicker.isTargetOpen().catch(() => false);
      if (!isTargetOpen || !url) {
        const entered = await requestBuildUrl(url ?? '');
        if (!entered) {
          return null;
        }
        // Persist as the content's shared build URL so the whole team gets
        // it prefilled from now on. Best-effort: a failed save must not
        // block the pick the user just asked for.
        if (entered !== url && currentContent?.id) {
          try {
            await updateContent(currentContent.id, { buildUrl: entered });
            setCurrentContent({ ...currentContent, buildUrl: entered });
          } catch {
            // Keep picking with the entered URL; the save can be retried
            // on the next pick.
          }
        }
        url = entered;
      }
      try {
        const result = await openpicker.pick({
          url,
          screenshot: 'none',
          mustMatch: options?.mustMatch,
        });
        // Picking focused the target tab — bring the builder back to front.
        // Best-effort: older extension versions may not support it.
        await openpicker.activateSelf().catch(() => undefined);
        return { selector: result.selector, matchCount: result.matchCount };
      } catch (error) {
        if (error instanceof OpenpickerError) {
          if (error.code === 'cancelled') {
            return null;
          }
          if (error.code === 'extension_not_installed') {
            // Rare race: the extension disappeared between the availability
            // check and the pick. Reopen the waiting dialog; the user
            // re-triggers the pick once it's back.
            setIsInstallDialogOpen(true);
            return null;
          }
        }
        toast({
          variant: 'destructive',
          title: t('contentBuilder.elementPicker.pickFailed'),
        });
        return null;
      }
    },
    [
      currentContent,
      requestBuildUrl,
      waitForExtensionInstall,
      updateContent,
      setCurrentContent,
      t,
      toast,
    ],
  );

  return (
    <ElementPickerProvider value={pickElement}>
      {children}
      <Dialog
        open={isUrlDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            settleUrlDialog(null);
          }
        }}
      >
        {/* Composed portal + overlay + content (instead of DialogContent)
            so both layers can sit above the builder's preview widgets
            (canvas z = 10900); matches AlertDialog's builder-safe tier. */}
        <DialogPortal>
          <DialogOverlay className="z-[100000]" />
          <DialogContentSimple className="z-[100000]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleUrlConfirm();
              }}
            >
              <DialogHeader>
                <DialogTitle>{t('contentBuilder.elementPicker.urlDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('contentBuilder.elementPicker.urlDialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-4">
                <Input
                  value={urlValue}
                  onChange={(event) => {
                    setUrlValue(event.target.value);
                    setHasUrlError(false);
                  }}
                  placeholder={t('contentBuilder.elementPicker.urlPlaceholder')}
                  autoFocus
                />
                {hasUrlError && (
                  <p className="text-sm text-destructive">
                    {t('contentBuilder.elementPicker.urlInvalid')}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => settleUrlDialog(null)}>
                  {t('contentBuilder.elementPicker.urlCancel')}
                </Button>
                <Button type="submit">{t('contentBuilder.elementPicker.urlConfirm')}</Button>
              </DialogFooter>
            </form>
          </DialogContentSimple>
        </DialogPortal>
      </Dialog>
      <Dialog
        open={isInstallDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            settleInstallDialog(false);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay className="z-[100000]" />
          <DialogContentSimple className="z-[100000]">
            <DialogHeader>
              <DialogTitle>{t('contentBuilder.elementPicker.installTitle')}</DialogTitle>
              <DialogDescription>
                {t('contentBuilder.elementPicker.installDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              {t('contentBuilder.elementPicker.installWaiting')}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => settleInstallDialog(false)}>
                {t('contentBuilder.elementPicker.installDismiss')}
              </Button>
              <Button asChild>
                <a href={EXTENSION_INSTALL_URL} target="_blank" rel="noreferrer">
                  {t('contentBuilder.elementPicker.installAction')}
                </a>
              </Button>
            </DialogFooter>
          </DialogContentSimple>
        </DialogPortal>
      </Dialog>
    </ElementPickerProvider>
  );
};

ElementPickerHost.displayName = 'ElementPickerHost';
