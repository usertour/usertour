// Shared popover field components for text input editors (SingleLineText, MultiLineText)

import { BooleanField, TextField } from '@usertour/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

// Placeholder Field Component
interface PlaceholderFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const PlaceholderField = memo<PlaceholderFieldProps>(({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <TextField
      label={t('contentBuilder.editor.textInput.placeholder')}
      value={value || ''}
      onChange={onChange}
      placeholder={t('contentBuilder.editor.textInput.placeholderHint')}
    />
  );
});

PlaceholderField.displayName = 'PlaceholderField';

// Button Text Field Component
interface ButtonTextFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const ButtonTextField = memo<ButtonTextFieldProps>(({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <TextField
      label={t('contentBuilder.editor.textInput.buttonText')}
      value={value || ''}
      onChange={onChange}
      placeholder={t('contentBuilder.editor.textInput.buttonTextHint')}
    />
  );
});

ButtonTextField.displayName = 'ButtonTextField';

// Required Field Component
interface RequiredFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const RequiredField = memo<RequiredFieldProps>(({ checked, onCheckedChange }) => {
  const { t } = useTranslation();
  return (
    <BooleanField
      label={t('contentBuilder.editor.textInput.required')}
      checked={checked || false}
      onChange={onCheckedChange}
    />
  );
});

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
