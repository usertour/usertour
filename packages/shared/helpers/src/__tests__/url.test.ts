import { RulesCondition } from '@usertour/types';
import { evaluateUrlCondition, isMatchUrlPattern } from '../conditions/url';

describe('URL Condition Evaluation', () => {
  describe('evaluateUrlCondition', () => {
    test('should return true when URL matches include pattern and no excludes', () => {
      const rules: RulesCondition = {
        id: 'condition-1',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard'],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should return false when URL does not match include pattern', () => {
      const rules: RulesCondition = {
        id: 'condition-2',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard'],
          excludes: [],
        },
      };

      const url = 'https://example.com/profile';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    test('should return false when URL matches exclude pattern', () => {
      const rules: RulesCondition = {
        id: 'condition-3',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/*'],
          excludes: ['https://example.com/admin'],
        },
      };

      const url = 'https://example.com/admin';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    test('should return true when URL matches include but not exclude', () => {
      const rules: RulesCondition = {
        id: 'condition-4',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/*'],
          excludes: ['https://example.com/admin'],
        },
      };

      const url = 'https://example.com/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should return true when no includes specified (matches all)', () => {
      const rules: RulesCondition = {
        id: 'condition-5',
        type: 'condition',
        operators: 'and',
        data: {
          includes: [],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should return false when URL matches exclude even with no includes', () => {
      const rules: RulesCondition = {
        id: 'condition-6',
        type: 'condition',
        operators: 'and',
        data: {
          includes: [],
          excludes: ['https://example.com/admin'],
        },
      };

      const url = 'https://example.com/admin';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });
  });

  describe('isMatchUrlPattern', () => {
    test('should match exact URL', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should match wildcard pattern', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should match multiple include patterns', () => {
      const url = 'https://example.com/dashboard';
      const includes = [
        'https://example.com/profile',
        'https://example.com/dashboard',
        'https://example.com/settings',
      ];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should not match when no includes match', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/profile', 'https://example.com/settings'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should not match when URL is excluded', () => {
      const url = 'https://example.com/admin';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should match when URL matches include but not exclude', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle empty includes (matches all)', () => {
      const url = 'https://example.com/dashboard';
      const includes: string[] = [];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle empty excludes', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle complex URL patterns with query parameters', () => {
      const url = 'https://example.com/dashboard?tab=overview&user=123';
      const includes = ['https://example.com/dashboard?tab=*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URL patterns with path parameters', () => {
      const url = 'https://example.com/users/123/profile';
      const includes = ['https://example.com/users/*/profile'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URL patterns with fragments', () => {
      const url = 'https://example.com/dashboard#overview';
      const includes = ['https://example.com/dashboard#*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs without protocol', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with different protocols', () => {
      const url = 'http://example.com/dashboard';
      const includes = ['https://example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle invalid URL patterns gracefully', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['invalid-url-pattern'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle empty URL', () => {
      const url = '';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle multiple exclude patterns', () => {
      const url = 'https://example.com/admin';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin', 'https://example.com/settings'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should match when URL matches include but not any exclude', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin', 'https://example.com/settings'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });
  });
});
