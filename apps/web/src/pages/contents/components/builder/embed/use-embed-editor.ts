import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import { embedTypeConfig } from '@/pages/contents/components/builder/embed/embed-config';

// Embed-flavoured wrapper over useTypeEditor for the shell data. Consumers get
// `{ data: EmbedData, updateData: (Partial<EmbedData>) => void, isLoading }`.
// Step editing goes through useFlowEditor, which shares the same draft.
export const useEmbedEditor = () => useTypeEditor(embedTypeConfig);
