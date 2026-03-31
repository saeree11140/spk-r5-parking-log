import { DashboardResponse, HouseOption } from './types';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  return (await response.json()) as T;
}

export function getDashboard(date: string) {
  return request<DashboardResponse>(`/dashboard?date=${date}`);
}

export function getHouses() {
  return request<HouseOption[]>('/houses');
}

export function createIncident(payload: { houseId: number; incidentDate: string; note?: string }) {
  return request('/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function payIncident(incidentId: number) {
  return request(`/incidents/${incidentId}/pay`, {
    method: 'POST',
  });
}
