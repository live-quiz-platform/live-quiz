import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status for the bff service', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'bff',
    });
  });
});
