// Shared LoadingSpinner component for content editor

import { SpinnerIcon } from '@usertour-packages/icons';
import { memo } from 'react';

import { DEFAULT_SPINNER_SIZE } from '../constants/styles';

export interface LoadingSpinnerProps {
  size?: number;
}

export const LoadingSpinner = memo(({ size = DEFAULT_SPINNER_SIZE }: LoadingSpinnerProps) => (
  <div className="flex items-center justify-center" style={{ width: size, height: size }}>
    <SpinnerIcon className="animate-spin" style={{ width: size / 4, height: size / 4 }} />
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';
