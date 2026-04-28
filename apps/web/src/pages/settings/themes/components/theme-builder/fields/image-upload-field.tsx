import { useBuilderContext } from '../builder-context';
import { ImageUploadWidget } from '../widgets/upload/image-upload';

interface Props {
  path: string;
  label: string;
  description?: string;
  maxSizeBytes?: number;
  previewAspect?: 'square' | 'wide';
}

export function ImageUploadField({ path, label, description, maxSizeBytes, previewAspect }: Props) {
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<string>(path);
  return (
    <div className="space-y-1.5">
      {label && <h4 className="text-xs font-semibold text-foreground">{label}</h4>}
      <ImageUploadWidget
        value={value}
        onChange={(url) => setField(path, url)}
        description={description}
        maxSizeBytes={maxSizeBytes}
        previewAspect={previewAspect}
        disabled={isReadOnly}
      />
    </div>
  );
}
