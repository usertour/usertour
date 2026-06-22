import { RiFileCopyLine } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

export interface CodeBlockProps {
  code: string;
  language: 'javascript' | 'html';
  /** Localized toast shown after a successful copy. */
  copiedMessage: string;
}

/**
 * Read-only, syntax-highlighted code block via shiki (GitHub light/dark dual
 * theme; the .shiki color/background vars are mapped in index.css). A copy
 * button overlays the corner. Falls back to plain <pre> until shiki resolves.
 */
export const CodeBlock = (props: CodeBlockProps) => {
  const { code, language, copiedMessage } = props;
  const copy = useCopyWithToast();
  const [html, setHtml] = useState('');

  useEffect(() => {
    let active = true;
    codeToHtml(code, {
      lang: language,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
      .then((result) => {
        if (active) {
          setHtml(result);
        }
      })
      .catch(() => {
        if (active) {
          setHtml('');
        }
      });
    return () => {
      active = false;
    };
  }, [code, language]);

  return (
    <div className="group relative overflow-hidden rounded-lg border">
      {html ? (
        <div
          className="overflow-x-auto text-[13px] leading-relaxed [&_pre]:m-0 [&_pre]:p-4"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output of code we generate ourselves
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1.5 top-1.5 z-10 h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => copy(code, copiedMessage)}
      >
        <RiFileCopyLine className="h-4 w-4" />
      </Button>
    </div>
  );
};

CodeBlock.displayName = 'CodeBlock';
