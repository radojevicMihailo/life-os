import { describe, it, expect } from 'vitest';
import { guardActionRequest } from '../../modules/finance/ui/actions/guard';
describe('single-user finance web access', () => {
  it('allows same-origin writes without a login cookie', async () => {
    await expect(guardActionRequest(new Headers({ origin: 'http://localhost:3000' }), { appOrigin: 'http://localhost:3000' })).resolves.toBeUndefined();
  });
  it('rejects a cross-origin write even without login', async () => {
    await expect(guardActionRequest(new Headers({ origin: 'https://other.example' }), { appOrigin: 'http://localhost:3000' })).rejects.toThrow();
  });
});
