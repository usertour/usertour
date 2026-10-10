import { requestLocale, resolveMessageLocale } from './request-locale.util';

describe('resolveMessageLocale', () => {
  it('reads the first tag the catalogue speaks', () => {
    expect(resolveMessageLocale('zh-Hans')).toBe('zh-CN');
    expect(resolveMessageLocale('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh-CN');
    expect(resolveMessageLocale('en-US,en;q=0.9,zh-CN;q=0.8')).toBe('en');
    expect(resolveMessageLocale('fr-FR,zh-TW;q=0.5')).toBe('zh-CN');
    expect(resolveMessageLocale(['zh-Hans', 'en'])).toBe('zh-CN');
  });

  it('falls back to en when nothing matches or nothing was sent', () => {
    expect(resolveMessageLocale(undefined)).toBe('en');
    expect(resolveMessageLocale('')).toBe('en');
    expect(resolveMessageLocale('*')).toBe('en');
    expect(resolveMessageLocale('fr-FR')).toBe('en');
  });
});

describe('requestLocale', () => {
  it('is en outside a request and the entered locale inside one', async () => {
    expect(requestLocale.get()).toBe('en');
    await requestLocale.run('zh-CN', async () => {
      await Promise.resolve();
      expect(requestLocale.get()).toBe('zh-CN');
    });
    expect(requestLocale.get()).toBe('en');
  });
});
