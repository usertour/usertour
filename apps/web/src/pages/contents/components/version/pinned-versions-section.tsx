import { useContentDetailContext } from '@/contexts/content-detail-context';
import { Separator } from '@usertour-packages/separator';
import { ContentVersion } from '@usertour/types';
import { VersionRow, VersionRowChip } from './version-row';

type PinnedEntry = {
  version: ContentVersion;
  chips: VersionRowChip[];
};

const collectPinnedEntries = (
  editedVersion: ContentVersion | undefined,
  publishedMap: Map<string, { version: ContentVersion; chips: VersionRowChip[] }>,
): PinnedEntry[] => {
  const map = new Map<string, PinnedEntry>();

  if (editedVersion) {
    map.set(editedVersion.id, {
      version: editedVersion,
      chips: [{ kind: 'draft' }],
    });
  }

  for (const [versionId, { version, chips }] of publishedMap) {
    const existing = map.get(versionId);
    if (existing) {
      existing.chips.push(...chips);
    } else {
      map.set(versionId, { version, chips: [...chips] });
    }
  }

  return Array.from(map.values());
};

export const PinnedVersionsSection = () => {
  const { content } = useContentDetailContext();

  const editedVersion = content?.editedVersion;
  const publishedMap = new Map<string, { version: ContentVersion; chips: VersionRowChip[] }>();

  for (const coe of content?.contentOnEnvironments ?? []) {
    if (!coe.published || !coe.publishedVersion) continue;
    const versionId = coe.publishedVersion.id;
    const chip: VersionRowChip = {
      kind: 'live',
      environmentName: coe.environment?.name ?? 'Unknown',
      publishedAt: coe.publishedAt,
    };
    const existing = publishedMap.get(versionId);
    if (existing) {
      existing.chips.push(chip);
    } else {
      publishedMap.set(versionId, { version: coe.publishedVersion, chips: [chip] });
    }
  }

  const entries = collectPinnedEntries(editedVersion, publishedMap).sort(
    (a, b) => b.version.sequence - a.version.sequence,
  );

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-4 w-full">
      <h3 className="text-lg font-medium">Active</h3>
      <Separator />
      <div className="flex flex-col divide-y divide-border/60">
        {entries.map(({ version, chips }) => (
          <VersionRow key={version.id} version={version} chips={chips} />
        ))}
      </div>
    </div>
  );
};

PinnedVersionsSection.displayName = 'PinnedVersionsSection';
