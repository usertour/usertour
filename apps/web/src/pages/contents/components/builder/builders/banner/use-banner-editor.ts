import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import { bannerTypeConfig } from '@/pages/contents/components/builder/builders/banner/banner-config';

// Banner-flavoured wrapper over useTypeEditor. Hides the config
// import + binds TData so consumers get `{ data: BannerData | undefined,
// updateData: (Partial<BannerData>) => void, isLoading }`.

export const useBannerEditor = () => useTypeEditor(bannerTypeConfig);
