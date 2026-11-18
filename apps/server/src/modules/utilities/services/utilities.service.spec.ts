import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { UtilitiesService } from './utilities.service';

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const EMPTY_ANSWER = { html: '', width: 0, height: 0 };

const build = (get: jest.Mock) => {
  const httpService = { axiosRef: { get } } as unknown as HttpService;
  return new UtilitiesService({} as any, httpService, {} as any, {} as any, {} as any);
};

const refusal = (status: number) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, null, {
    status,
    statusText: '',
    headers: {},
    config: {} as any,
    data: 'Not Found',
  });

describe('UtilitiesService.queryOembedInfo', () => {
  it("returns the provider's markup and pixel sizes", async () => {
    const get = jest.fn().mockResolvedValue({
      data: { html: '<iframe></iframe>', width: '640', height: 360 },
    });
    const service = build(get);

    await expect(service.queryOembedInfo(YOUTUBE_URL)).resolves.toEqual({
      html: '<iframe></iframe>',
      width: 640,
      height: 360,
    });
    expect(get).toHaveBeenCalledWith(expect.stringContaining('youtube.com/oembed'));
  });

  it('answers empty when the provider refuses the url', async () => {
    const service = build(jest.fn().mockRejectedValue(refusal(404)));

    await expect(service.queryOembedInfo(YOUTUBE_URL)).resolves.toEqual(EMPTY_ANSWER);
  });

  it('answers empty when the provider sends no markup', async () => {
    const service = build(jest.fn().mockResolvedValue({ data: { type: 'photo', url: 'x' } }));

    await expect(service.queryOembedInfo(YOUTUBE_URL)).resolves.toEqual(EMPTY_ANSWER);
  });

  it('answers empty without a lookup when no provider claims the url', async () => {
    const get = jest.fn();
    const service = build(get);

    await expect(service.queryOembedInfo('https://example.com/page')).resolves.toEqual(
      EMPTY_ANSWER,
    );
    expect(get).not.toHaveBeenCalled();
  });
});
