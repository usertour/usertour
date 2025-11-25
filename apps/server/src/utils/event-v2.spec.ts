import { calculateStepProgress } from './event-v2';
import { StepSettings } from '@usertour/types';
import type { Step } from '@/common/types/schema';

describe('calculateStepProgress', () => {
  // Helper function to create a mock step
  const createStep = (id: string, sequence: number, explicitCompletionStep = false): Step =>
    ({
      id,
      name: `Step ${id}`,
      type: 'tooltip',
      sequence,
      setting: {
        width: 300,
        height: 200,
        skippable: false,
        enabledBackdrop: true,
        enabledBlockTarget: false,
        explicitCompletionStep,
        align: 'center',
        side: 'bottom',
        alignType: 'auto',
        sideOffset: 0,
        alignOffset: 0,
        position: 'absolute',
        positionOffsetX: 0,
        positionOffsetY: 0,
      } as StepSettings,
    }) as unknown as Step;

  describe('Input validation', () => {
    it('should return -1 for empty steps array', () => {
      expect(calculateStepProgress([], 0)).toBe(-1);
    });

    it('should return -1 for null/undefined steps', () => {
      expect(calculateStepProgress(null as any, 0)).toBe(-1);
      expect(calculateStepProgress(undefined as any, 0)).toBe(-1);
    });

    it('should return -1 for negative stepIndex', () => {
      const steps = [createStep('step-1', 0)];
      expect(calculateStepProgress(steps, -1)).toBe(-1);
    });

    it('should return -1 for stepIndex >= steps.length', () => {
      const steps = [createStep('step-1', 0), createStep('step-2', 1)];
      expect(calculateStepProgress(steps, 2)).toBe(-1);
      expect(calculateStepProgress(steps, 3)).toBe(-1);
    });
  });

  describe('Single step scenarios', () => {
    it('should return 100% for single step at index 0', () => {
      const steps = [createStep('step-1', 0)];
      expect(calculateStepProgress(steps, 0)).toBe(100);
    });

    it('should return 100% for single step with explicitCompletionStep', () => {
      const steps = [createStep('step-1', 0, true)];
      expect(calculateStepProgress(steps, 0)).toBe(100);
    });
  });

  describe('Multiple steps without explicitCompletionStep', () => {
    it('should return 0% for first step', () => {
      const steps = [createStep('step-1', 0), createStep('step-2', 1), createStep('step-3', 2)];
      expect(calculateStepProgress(steps, 0)).toBe(0);
    });

    it('should return 50% for middle step (2 steps)', () => {
      const steps = [createStep('step-1', 0), createStep('step-2', 1)];
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 1)).toBe(100);
    });

    it('should return 50% for middle step (3 steps)', () => {
      const steps = [createStep('step-1', 0), createStep('step-2', 1), createStep('step-3', 2)];
      expect(calculateStepProgress(steps, 1)).toBe(50);
    });

    it('should return 100% for last step', () => {
      const steps = [createStep('step-1', 0), createStep('step-2', 1), createStep('step-3', 2)];
      expect(calculateStepProgress(steps, 2)).toBe(100);
    });

    it('should calculate progress correctly for 5 steps', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1),
        createStep('step-3', 2),
        createStep('step-4', 3),
        createStep('step-5', 4),
      ];
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 1)).toBe(25);
      expect(calculateStepProgress(steps, 2)).toBe(50);
      expect(calculateStepProgress(steps, 3)).toBe(75);
      expect(calculateStepProgress(steps, 4)).toBe(100);
    });
  });

  describe('Steps with explicitCompletionStep', () => {
    it('should return 100% when current step is explicitCompletionStep', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1, true),
        createStep('step-3', 2),
      ];
      expect(calculateStepProgress(steps, 1)).toBe(100);
    });

    it('should use first explicitCompletionStep as completion point', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1, true),
        createStep('step-3', 2, true), // Second explicitCompletionStep should be ignored
        createStep('step-4', 3),
      ];
      // Total should be 2 (first explicitCompletionStep at index 1 + 1)
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 1)).toBe(100);
    });

    it('should return -1 for steps after explicitCompletionStep', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1, true),
        createStep('step-3', 2),
        createStep('step-4', 3),
      ];
      expect(calculateStepProgress(steps, 2)).toBe(-1);
      expect(calculateStepProgress(steps, 3)).toBe(-1);
    });

    it('should calculate progress correctly before explicitCompletionStep', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1),
        createStep('step-3', 2, true),
        createStep('step-4', 3),
      ];
      // Total should be 3 (explicitCompletionStep at index 2 + 1)
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 1)).toBe(50);
      expect(calculateStepProgress(steps, 2)).toBe(100);
      expect(calculateStepProgress(steps, 3)).toBe(-1);
    });

    it('should handle explicitCompletionStep at first step', () => {
      const steps = [
        createStep('step-1', 0, true),
        createStep('step-2', 1),
        createStep('step-3', 2),
      ];
      // Total should be 1 (explicitCompletionStep at index 0 + 1)
      expect(calculateStepProgress(steps, 0)).toBe(100);
      expect(calculateStepProgress(steps, 1)).toBe(-1);
      expect(calculateStepProgress(steps, 2)).toBe(-1);
    });
  });

  describe('Progress calculation edge cases', () => {
    it('should round progress correctly', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1),
        createStep('step-3', 2),
        createStep('step-4', 3),
      ];
      // stepIndex 1 out of 3 steps (0, 1, 2, 3) = 1/3 * 100 = 33.33... -> 33
      expect(calculateStepProgress(steps, 1)).toBe(33);
    });

    it('should handle large number of steps', () => {
      const steps = Array.from({ length: 10 }, (_, i) => createStep(`step-${i + 1}`, i));
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 5)).toBe(56); // 5/9 * 100 = 55.56 -> 56
      expect(calculateStepProgress(steps, 9)).toBe(100);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed explicitCompletionStep and regular steps', () => {
      const steps = [
        createStep('step-1', 0),
        createStep('step-2', 1),
        createStep('step-3', 2, true),
        createStep('step-4', 3),
        createStep('step-5', 4),
      ];
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 1)).toBe(50);
      expect(calculateStepProgress(steps, 2)).toBe(100);
      expect(calculateStepProgress(steps, 3)).toBe(-1);
      expect(calculateStepProgress(steps, 4)).toBe(-1);
    });

    it('should handle steps with undefined explicitCompletionStep', () => {
      const step2 = createStep('step-2', 1);
      const steps = [
        createStep('step-1', 0),
        {
          ...step2,
          setting: {
            ...(step2.setting as StepSettings),
            explicitCompletionStep: undefined,
          } as StepSettings,
        } as Step,
        createStep('step-3', 2),
      ];
      // Should treat undefined as false
      expect(calculateStepProgress(steps, 0)).toBe(0);
      expect(calculateStepProgress(steps, 1)).toBe(50);
      expect(calculateStepProgress(steps, 2)).toBe(100);
    });
  });
});
