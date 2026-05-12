// Shared popover field components for text input editors (SingleLineText, MultiLineText)

import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import { memo, useCallback } from 'react';

// Placeholder Field Component
interface PlaceholderFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export const PlaceholderField = memo<PlaceholderFieldProps>(
  ({ value, onChange, id = 'placeholder', placeholder = 'Enter placeholder text' }) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>Placeholder</Label>
        <Input id={id} value={value || ''} onChange={handleChange} placeholder={placeholder} />
      </div>
    );
  },
);

PlaceholderField.displayName = 'PlaceholderField';

// Button Text Field Component
interface ButtonTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  label?: string;
}

export const ButtonTextField = memo<ButtonTextFieldProps>(
  ({
    value,
    onChange,
    id = 'button-text',
    placeholder = 'Enter button text',
    label = 'Button text',
  }) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange],
    );

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} value={value || ''} onChange={handleChange} placeholder={placeholder} />
      </div>
    );
  },
);

ButtonTextField.displayName = 'ButtonTextField';

// Required Field Component
interface RequiredFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label?: string;
}

export const RequiredField = memo<RequiredFieldProps>(
  ({ checked, onCheckedChange, id = 'required', label = 'Required' }) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>{label}</Label>
      <Switch
        id={id}
        className="data-[state=unchecked]:bg-muted"
        checked={checked || false}
        onCheckedChange={onCheckedChange}
      />
    </div>
  ),
);

RequiredField.displayName = 'RequiredField';

// Combined Text Input Fields Component
interface TextInputPopoverFieldsProps {
  placeholder: string;
  buttonText: string;
  required: boolean;
  onPlaceholderChange: (value: string) => void;
  onButtonTextChange: (value: string) => void;
  onRequiredChange: (checked: boolean) => void;
}

export const TextInputPopoverFields = memo<TextInputPopoverFieldsProps>(
  ({
    placeholder,
    buttonText,
    required,
    onPlaceholderChange,
    onButtonTextChange,
    onRequiredChange,
  }) => (
    <>
      <PlaceholderField value={placeholder} onChange={onPlaceholderChange} />
      <ButtonTextField value={buttonText} onChange={onButtonTextChange} />
      <RequiredField checked={required} onCheckedChange={onRequiredChange} />
    </>
  ),
);

TextInputPopoverFields.displayName = 'TextInputPopoverFields';
