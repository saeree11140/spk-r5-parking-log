export type PaymentStatus = 'PAID' | 'UNPAID' | 'WARNING_1' | 'WARNING_2';

export type HouseSummary = {
  houseId: number;
  houseCode: string;
  ownerName: string;
  address: string;
  status: PaymentStatus;
  label: string;
  offenseCount: number;
  noticeLevel: number;
  fineAmount: number;
  outstandingAmount: number;
  incidentId: number;
  note: string | null;
  occurredAt: string;
  paidAt: string | null;
};

export type DashboardResponse = {
  selectedDate: string;
  totals: {
    parkedHomes: number;
    paidHomes: number;
    unpaidHomes: number;
    warnings: number;
    outstandingAmount: number;
  };
  houses: HouseSummary[];
};

export type HouseOption = {
  id: number;
  code: string;
  ownerName: string;
  address: string;
};
