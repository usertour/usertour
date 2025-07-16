import { Attribute, ThemeVariation } from '@usertour-ui/types';
import { Button } from '@usertour-ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { SubThemeModal } from './sub-theme-modal';
import { QuestionTooltip } from '@usertour-ui/tooltip';

interface ConditionalVariationsPanelProps {
  variations: ThemeVariation[];
  onVariationsChange?: (variations: ThemeVariation[]) => void;
  attributeList?: Attribute[];
}

export const ConditionalVariationsPanel = ({
  variations,
  onVariationsChange,
  attributeList,
}: ConditionalVariationsPanelProps) => {
  const [openModal, setOpenModal] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ThemeVariation | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  const handleAddVariation = () => {
    setEditingVariation(null);
    setEditingIndex(-1);
    setOpenModal(true);
  };

  const handleEditVariation = (variation: ThemeVariation, index: number) => {
    setEditingVariation(variation);
    setEditingIndex(index);
    setOpenModal(true);
  };

  const handleSaveVariation = (variation: ThemeVariation) => {
    if (onVariationsChange) {
      const newVariations = [...variations];
      if (editingIndex >= 0) {
        // Edit existing variation
        newVariations[editingIndex] = variation;
      } else {
        // Add new variation
        newVariations.push(variation);
      }
      onVariationsChange(newVariations);
    }
    setOpenModal(false);
    setEditingVariation(null);
    setEditingIndex(-1);
  };

  const handleDeleteVariation = (index: number) => {
    if (onVariationsChange) {
      const newVariations = variations.filter((_, i) => i !== index);
      onVariationsChange(newVariations);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Conditional variations</span>
          <QuestionTooltip>
            Create theme variations that automatically apply based on user attributes. All matching
            variations will be applied in the order shown below. Examples: • Apply dark theme when
            user has dark mode enabled • Show different avatars based on assigned customer success
            manager • Use premium colors for paid users
          </QuestionTooltip>
        </div>

        {variations.length > 0 && (
          <div className="space-y-2">
            {variations.map((variation, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">Variation {index + 1}</div>
                  <div className="text-xs text-gray-500">
                    {variation.conditions.length} condition
                    {variation.conditions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditVariation(variation, index)}
                  >
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteVariation(index)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="link"
          size="sm"
          onClick={handleAddVariation}
          className="gap-2 hover:no-underline w-fit p-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Conditional Variation
        </Button>
      </div>

      {openModal && (
        <SubThemeModal
          isOpen={openModal}
          onOpenChange={setOpenModal}
          initialVariation={editingVariation}
          onSave={handleSaveVariation}
          attributeList={attributeList}
        />
      )}
    </div>
  );
};
