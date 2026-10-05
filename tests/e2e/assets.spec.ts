import { test, expect } from './fixtures';

test.describe('deployed files', () => {
  for (const file of ['resume/quentin-lecler-cv-en.pdf', 'resume/quentin-lecler-cv-fr.pdf']) {
    test(`${file} is served as a real PDF`, async ({ request }) => {
      const res = await request.get(`/${file}`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toBe('application/pdf');
      expect((await res.body()).subarray(0, 4).toString()).toBe('%PDF');
    });
  }

  for (const file of ['CNAME', 'og.jpg', 'i18n/en.json', 'i18n/fr.json', 'vendor/i18next.min.js']) {
    test(`${file} is deployed`, async ({ request }) => {
      expect((await request.get(`/${file}`)).status()).toBe(200);
    });
  }

  test('the CNAME is lecler.dev', async ({ request }) => {
    expect((await (await request.get('/CNAME')).text()).trim()).toBe('lecler.dev');
  });
});
