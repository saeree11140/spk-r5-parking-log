import { HealthController } from './health.controller';

describe('HealthController', () => {
  const originalVersion = process.env.APP_VERSION;

  afterEach(() => {
    if (originalVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = originalVersion;
    }
  });

  it('returns service health status with the deployed version', () => {
    process.env.APP_VERSION = '0123456789abcdef0123456789abcdef01234567';
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'spk-r5-parking-log-api',
      version: '0123456789abcdef0123456789abcdef01234567',
    });
  });

  it('reports dev when the image was built without a version', () => {
    delete process.env.APP_VERSION;
    const controller = new HealthController();

    expect(controller.check().version).toBe('dev');
  });
});
