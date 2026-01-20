import { cn } from '../tw-merge';

describe('cn (tailwind-merge with SDK custom classes)', () => {
  describe('Basic functionality', () => {
    test('should merge multiple class strings', () => {
      expect(cn('p-4', 'm-2')).toBe('p-4 m-2');
    });

    test('should handle conditional classes with clsx', () => {
      expect(cn('p-4', true && 'm-2', false && 'hidden')).toBe('p-4 m-2');
    });

    test('should handle array inputs', () => {
      expect(cn(['p-4', 'm-2'])).toBe('p-4 m-2');
    });

    test('should handle object inputs', () => {
      expect(cn({ 'p-4': true, 'm-2': true, hidden: false })).toBe('p-4 m-2');
    });

    test('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn(null, undefined)).toBe('');
    });
  });

  describe('Standard Tailwind class conflicts', () => {
    test('should resolve padding conflicts (later wins)', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    test('should resolve margin conflicts (later wins)', () => {
      expect(cn('m-4', 'm-2')).toBe('m-2');
    });

    test('should resolve text size conflicts (later wins)', () => {
      expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    });

    test('should resolve text color conflicts (later wins)', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    test('should resolve background color conflicts (later wins)', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    test('should not conflict between different utilities', () => {
      expect(cn('p-4', 'm-4', 'text-lg')).toBe('p-4 m-4 text-lg');
    });
  });

  describe('SDK minWidth classes', () => {
    test('should resolve min-w-sdk-button vs min-w-0 conflict', () => {
      expect(cn('min-w-sdk-button', 'min-w-0')).toBe('min-w-0');
    });

    test('should resolve min-w-0 vs min-w-sdk-button conflict', () => {
      expect(cn('min-w-0', 'min-w-sdk-button')).toBe('min-w-sdk-button');
    });

    test('should resolve min-w-sdk-button vs min-w-full conflict', () => {
      expect(cn('min-w-sdk-button', 'min-w-full')).toBe('min-w-full');
    });
  });

  describe('SDK height classes', () => {
    test('should resolve h-sdk-button vs h-10 conflict', () => {
      expect(cn('h-sdk-button', 'h-10')).toBe('h-10');
    });

    test('should resolve h-sdk-progress vs h-4 conflict', () => {
      expect(cn('h-sdk-progress', 'h-4')).toBe('h-4');
    });

    test('should resolve h-sdk-line-height vs h-6 conflict', () => {
      expect(cn('h-6', 'h-sdk-line-height')).toBe('h-sdk-line-height');
    });
  });

  describe('SDK width classes', () => {
    test('should resolve w-sdk-rounded-progress vs w-full conflict', () => {
      expect(cn('w-sdk-rounded-progress', 'w-full')).toBe('w-full');
    });

    test('should resolve w-10 vs w-sdk-squared-progress conflict', () => {
      expect(cn('w-10', 'w-sdk-squared-progress')).toBe('w-sdk-squared-progress');
    });
  });

  describe('SDK borderRadius classes', () => {
    test('should resolve rounded-sdk-button vs rounded-md conflict', () => {
      expect(cn('rounded-sdk-button', 'rounded-md')).toBe('rounded-md');
    });

    test('should resolve rounded-lg vs rounded-sdk-lg conflict', () => {
      expect(cn('rounded-lg', 'rounded-sdk-lg')).toBe('rounded-sdk-lg');
    });

    test('should resolve rounded-sdk-popper vs rounded-none conflict', () => {
      expect(cn('rounded-sdk-popper', 'rounded-none')).toBe('rounded-none');
    });
  });

  describe('SDK fontSize classes (text-sdk-*)', () => {
    test('should resolve text-sdk-base vs text-lg conflict', () => {
      expect(cn('text-sdk-base', 'text-lg')).toBe('text-lg');
    });

    test('should resolve text-base vs text-sdk-xs conflict', () => {
      expect(cn('text-base', 'text-sdk-xs')).toBe('text-sdk-xs');
    });

    test('should resolve text-sdk-h1 vs text-xl conflict', () => {
      expect(cn('text-sdk-h1', 'text-xl')).toBe('text-xl');
    });

    test('should resolve text-sm vs text-sdk-numbered-progress conflict', () => {
      expect(cn('text-sm', 'text-sdk-numbered-progress')).toBe('text-sdk-numbered-progress');
    });
  });

  describe('SDK color classes - Critical: fontSize vs textColor separation', () => {
    test('should NOT conflict text-sdk-xs (fontSize) with text-sdk-progress (color)', () => {
      // This is the critical bug we fixed today!
      // text-sdk-xs is a font size, text-sdk-progress is a color
      // They should both be preserved
      const result = cn('text-sdk-xs', 'text-sdk-progress');
      expect(result).toContain('text-sdk-xs');
      expect(result).toContain('text-sdk-progress');
    });

    test('should NOT conflict text-sdk-base (fontSize) with text-sdk-foreground (color)', () => {
      const result = cn('text-sdk-base', 'text-sdk-foreground');
      expect(result).toContain('text-sdk-base');
      expect(result).toContain('text-sdk-foreground');
    });

    test('should NOT conflict text-sdk-h1 (fontSize) with text-sdk-background (color)', () => {
      const result = cn('text-sdk-h1', 'text-sdk-background');
      expect(result).toContain('text-sdk-h1');
      expect(result).toContain('text-sdk-background');
    });

    test('should resolve text-sdk-progress vs text-red-500 color conflict', () => {
      expect(cn('text-sdk-progress', 'text-red-500')).toBe('text-red-500');
    });

    test('should resolve text-blue-500 vs text-sdk-foreground color conflict', () => {
      expect(cn('text-blue-500', 'text-sdk-foreground')).toBe('text-sdk-foreground');
    });
  });

  describe('SDK background color classes', () => {
    test('should resolve bg-sdk-background vs bg-white conflict', () => {
      expect(cn('bg-sdk-background', 'bg-white')).toBe('bg-white');
    });

    test('should resolve bg-red-500 vs bg-sdk-progress conflict', () => {
      expect(cn('bg-red-500', 'bg-sdk-progress')).toBe('bg-sdk-progress');
    });

    test('should resolve bg-sdk-background vs bg-sdk-hover conflict', () => {
      expect(cn('bg-sdk-background', 'bg-sdk-hover')).toBe('bg-sdk-hover');
    });
  });

  describe('SDK border color classes', () => {
    test('should resolve border-sdk-border vs border-gray-300 conflict', () => {
      expect(cn('border-sdk-border', 'border-gray-300')).toBe('border-gray-300');
    });

    test('should resolve border-red-500 vs border-sdk-progress conflict', () => {
      expect(cn('border-red-500', 'border-sdk-progress')).toBe('border-sdk-progress');
    });
  });

  describe('SDK ring color classes', () => {
    test('should resolve ring-sdk-ring vs ring-blue-500 conflict', () => {
      expect(cn('ring-sdk-ring', 'ring-blue-500')).toBe('ring-blue-500');
    });
  });

  describe('SDK fill and stroke classes', () => {
    test('should resolve fill-sdk-foreground vs fill-current conflict', () => {
      expect(cn('fill-sdk-foreground', 'fill-current')).toBe('fill-current');
    });

    test('should resolve fill-current vs fill-sdk-background conflict', () => {
      expect(cn('fill-current', 'fill-sdk-background')).toBe('fill-sdk-background');
    });

    test('should resolve fill-sdk-progress vs fill-sdk-foreground conflict', () => {
      expect(cn('fill-sdk-progress', 'fill-sdk-foreground')).toBe('fill-sdk-foreground');
    });

    test('should resolve fill-none vs fill-sdk-question conflict', () => {
      expect(cn('fill-none', 'fill-sdk-question')).toBe('fill-sdk-question');
    });

    test('should resolve stroke-sdk-border vs stroke-black conflict', () => {
      expect(cn('stroke-sdk-border', 'stroke-black')).toBe('stroke-black');
    });

    test('should resolve stroke-current vs stroke-sdk-foreground conflict', () => {
      expect(cn('stroke-current', 'stroke-sdk-foreground')).toBe('stroke-sdk-foreground');
    });

    test('should resolve stroke-sdk-progress vs stroke-sdk-border conflict', () => {
      expect(cn('stroke-sdk-progress', 'stroke-sdk-border')).toBe('stroke-sdk-border');
    });

    test('should resolve stroke-none vs stroke-sdk-ring conflict', () => {
      expect(cn('stroke-none', 'stroke-sdk-ring')).toBe('stroke-sdk-ring');
    });

    test('should NOT conflict fill-sdk-* with stroke-sdk-* (different utilities)', () => {
      const result = cn('fill-sdk-foreground', 'stroke-sdk-border');
      expect(result).toContain('fill-sdk-foreground');
      expect(result).toContain('stroke-sdk-border');
    });
  });

  describe('SDK fontWeight classes', () => {
    test('should resolve font-sdk-bold vs font-normal conflict', () => {
      expect(cn('font-sdk-bold', 'font-normal')).toBe('font-normal');
    });

    test('should resolve font-bold vs font-sdk-primary conflict', () => {
      expect(cn('font-bold', 'font-sdk-primary')).toBe('font-sdk-primary');
    });

    test('should resolve font-sdk-normal vs font-sdk-bold conflict', () => {
      expect(cn('font-sdk-normal', 'font-sdk-bold')).toBe('font-sdk-bold');
    });
  });

  describe('SDK fontFamily classes', () => {
    test('should resolve font-sdk vs font-sans conflict', () => {
      expect(cn('font-sdk', 'font-sans')).toBe('font-sans');
    });

    test('should resolve font-mono vs font-sdk conflict', () => {
      expect(cn('font-mono', 'font-sdk')).toBe('font-sdk');
    });
  });

  describe('SDK lineHeight behavior', () => {
    // text-sdk-base includes line-height via fontSize config.
    // Use leading-none to override if line-height is not needed.

    test('leading-none should override text-sdk-base line-height', () => {
      // For buttons and other elements that don't need line-height
      const result = cn('text-sdk-base', 'leading-none');
      expect(result).toContain('text-sdk-base');
      expect(result).toContain('leading-none');
    });

    test('text-sdk-base can coexist with other leading classes', () => {
      // Custom leading can override the default line-height
      const result = cn('text-sdk-base', 'leading-6');
      expect(result).toContain('text-sdk-base');
      expect(result).toContain('leading-6');
    });
  });

  describe('SDK padding classes', () => {
    test('should resolve px-sdk-button-x vs px-4 conflict', () => {
      expect(cn('px-sdk-button-x', 'px-4')).toBe('px-4');
    });

    test('should resolve px-2 vs px-sdk-button-x conflict', () => {
      expect(cn('px-2', 'px-sdk-button-x')).toBe('px-sdk-button-x');
    });
  });

  describe('SDK borderWidth classes', () => {
    // Note: sdk-btn-primary and sdk-btn-secondary are also colors (in sdkColors),
    // so border-sdk-btn-primary is treated as border color by tailwind-merge.
    // This is expected behavior - they serve dual purpose for styling buttons.
    test('border-sdk-btn-primary should coexist with border-2 (different purposes)', () => {
      // border-sdk-btn-primary = color, border-2 = width, no conflict
      const result = cn('border-sdk-btn-primary', 'border-2');
      expect(result).toContain('border-sdk-btn-primary');
      expect(result).toContain('border-2');
    });

    test('border-sdk-btn-secondary should coexist with border (different purposes)', () => {
      // border-sdk-btn-secondary = color, border = width, no conflict
      const result = cn('border', 'border-sdk-btn-secondary');
      expect(result).toContain('border');
      expect(result).toContain('border-sdk-btn-secondary');
    });
  });

  describe('Complex real-world scenarios', () => {
    test('should handle checklist progress bar classes', () => {
      // This is the exact scenario from checklist.tsx
      const result = cn(
        'font-medium px-2 rounded-l-full text-left',
        'transition-all duration-200 ease-out',
        'text-sdk-xs',
        'text-sdk-progress',
      );
      expect(result).toContain('text-sdk-xs');
      expect(result).toContain('text-sdk-progress');
      expect(result).toContain('font-medium');
      expect(result).toContain('px-2');
    });

    test('should handle input field classes with text-sdk-base', () => {
      // text-sdk-base includes line-height via fontSize config
      const result = cn(
        'h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sdk-base shadow-xs',
        'border-sdk-question bg-sdk-background text-sdk-question',
      );
      expect(result).toContain('text-sdk-base');
      expect(result).toContain('text-sdk-question');
      expect(result).toContain('border-sdk-question');
      expect(result).toContain('bg-sdk-background');
    });

    test('should handle SVG icon classes with fill and stroke', () => {
      const result = cn(
        'w-4 h-4',
        'fill-sdk-foreground stroke-sdk-border',
        'hover:fill-sdk-progress hover:stroke-sdk-ring',
      );
      expect(result).toContain('fill-sdk-foreground');
      expect(result).toContain('stroke-sdk-border');
      expect(result).toContain('hover:fill-sdk-progress');
      expect(result).toContain('hover:stroke-sdk-ring');
    });

    test('should handle button variant classes', () => {
      const result = cn(
        'min-w-sdk-button px-sdk-button-x bg-sdk-btn-primary text-sdk-btn-primary-foreground',
        'min-w-0', // override
      );
      expect(result).toBe(
        'px-sdk-button-x bg-sdk-btn-primary text-sdk-btn-primary-foreground min-w-0',
      );
    });

    test('should handle conditional styling', () => {
      const isActive = true;
      const isCompleted = false;
      const result = cn(
        'text-sdk-base',
        isActive && 'bg-sdk-active',
        isCompleted && 'text-sdk-question',
        !isCompleted && 'text-sdk-foreground',
      );
      expect(result).toContain('text-sdk-base');
      expect(result).toContain('bg-sdk-active');
      expect(result).toContain('text-sdk-foreground');
      expect(result).not.toContain('text-sdk-question');
    });

    test('should handle NPS button classes with override', () => {
      const baseClasses =
        'inline-flex items-center justify-center min-w-sdk-button px-sdk-button-x bg-sdk-btn-primary';
      const overrideClasses = 'min-w-0 bg-sdk-question/10';
      const result = cn(baseClasses, overrideClasses);
      expect(result).toContain('min-w-0');
      expect(result).not.toContain('min-w-sdk-button');
      expect(result).toContain('bg-sdk-question/10');
      expect(result).not.toContain('bg-sdk-btn-primary');
    });
  });

  describe('Edge cases', () => {
    test('should handle duplicate classes', () => {
      expect(cn('p-4', 'p-4')).toBe('p-4');
    });

    test('should handle classes with opacity modifiers', () => {
      expect(cn('bg-sdk-foreground/50', 'bg-sdk-foreground/80')).toBe('bg-sdk-foreground/80');
    });

    test('should handle classes with arbitrary values', () => {
      expect(cn('p-[10px]', 'p-[20px]')).toBe('p-[20px]');
    });

    test('should handle mixed standard and SDK classes without conflicts', () => {
      const result = cn(
        'p-4 m-2',
        'text-sdk-base text-sdk-foreground',
        'bg-sdk-background',
        'rounded-sdk-button',
      );
      expect(result).toBe(
        'p-4 m-2 text-sdk-base text-sdk-foreground bg-sdk-background rounded-sdk-button',
      );
    });

    test('should handle responsive prefixes', () => {
      expect(cn('md:p-4', 'md:p-6')).toBe('md:p-6');
    });

    test('should handle state prefixes', () => {
      expect(cn('hover:bg-sdk-hover', 'hover:bg-red-500')).toBe('hover:bg-red-500');
    });
  });
});
