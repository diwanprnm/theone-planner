import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('melaporkan status ok beserta waktu', () => {
    const result = new HealthController().check();

    expect(result.status).toBe('ok');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
