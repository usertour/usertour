import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmbedData } from '@usertour/types';
import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import {
  embedTypeConfig,
  type EmbedTargetDraft,
  type EmbedUIState,
} from '@/pages/contents/components/builder/embed/embed-config';

// Embed-flavoured editor over useTypeEditor for the shell data. Step editing
// goes through useFlowEditor, which shares the same draft.
//
// Adds the target sub-view's pieces: the draft accessor pair over the shared
// UI slot, and the navigation helpers that move the descendant router. The
// URL owns which view is open; the draft is seeded on the sub-view's mount
// (see EmbedTarget), not here.
export interface UseEmbedEditorReturn {
  data: EmbedData;
  updateData: (updates: Partial<EmbedData>) => void;
  targetDraft: EmbedTargetDraft | undefined;
  setTargetDraft: Dispatch<SetStateAction<EmbedTargetDraft | undefined>>;
  gotoTarget: () => void;
  backToOverview: () => void;
  isLoading: boolean;
}

export const useEmbedEditor = (): UseEmbedEditorReturn => {
  const editor = useTypeEditor(embedTypeConfig);
  const navigate = useNavigate();
  const { uiState, setUIState } = editor;

  const setTargetDraft = useCallback<Dispatch<SetStateAction<EmbedTargetDraft | undefined>>>(
    (value) => {
      setUIState((previous: EmbedUIState) => ({
        ...previous,
        target:
          typeof value === 'function'
            ? (value as (draft: EmbedTargetDraft | undefined) => EmbedTargetDraft | undefined)(
                previous.target,
              )
            : value,
      }));
    },
    [setUIState],
  );

  const gotoTarget = useCallback(() => {
    navigate('target');
  }, [navigate]);

  const backToOverview = useCallback(() => {
    navigate('..');
  }, [navigate]);

  return {
    data: editor.data,
    updateData: editor.updateData,
    targetDraft: uiState.target,
    setTargetDraft,
    gotoTarget,
    backToOverview,
    isLoading: editor.isLoading,
  };
};
