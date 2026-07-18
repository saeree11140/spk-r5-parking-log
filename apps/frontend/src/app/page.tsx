import type { HealthCheckResponse } from '@spk-r5-parking-log/shared-types';

const serviceStatus: HealthCheckResponse['status'] = 'ok';
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function Home() {
  return (
    <main className="parking-shell" data-api-url={apiUrl}>
      <section className="status-card" aria-labelledby="page-title">
        <div className="parking-mark" aria-hidden="true">
          P
        </div>
        <div className="status-copy">
          <p className="system-label">Parking Violation Management System</p>
          <h1 id="page-title">SPK R5 Parking Log</h1>
          <p className="running-status" data-status={serviceStatus}>
            <span aria-hidden="true" />
            Frontend is running
          </p>
        </div>
      </section>
    </main>
  );
}
