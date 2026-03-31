'use client';

import { useMemo, useState, useTransition } from 'react';
import { createIncident, getDashboard, payIncident } from '@/lib/api';
import type { DashboardResponse, HouseOption, HouseSummary, PaymentStatus } from '@/lib/types';

type Props = {
  initialDashboard: DashboardResponse;
  houses: HouseOption[];
};

const statusStyles: Record<PaymentStatus, string> = {
  PAID: 'card paid',
  UNPAID: 'card unpaid',
  WARNING_1: 'card warning',
  WARNING_2: 'card warning',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function DashboardClient({ initialDashboard, houses }: Props) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedDate, setSelectedDate] = useState(initialDashboard.selectedDate);
  const [selectedHouseId, setSelectedHouseId] = useState<number>(houses[0]?.id ?? 0);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const warnings = useMemo(
    () => dashboard.houses.filter((house) => house.status.startsWith('WARNING')),
    [dashboard.houses],
  );

  function refresh(date: string) {
    startTransition(async () => {
      try {
        const data = await getDashboard(date);
        setDashboard(data);
        setMessage(null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ');
      }
    });
  }

  function handleCreateIncident(formData: FormData) {
    const houseId = Number(formData.get('houseId'));
    const incidentDate = String(formData.get('incidentDate'));
    const incidentNote = String(formData.get('note') ?? '');

    startTransition(async () => {
      try {
        await createIncident({
          houseId,
          incidentDate,
          note: incidentNote,
        });
        setNote('');
        setSelectedHouseId(houseId);
        setMessage('บันทึกเหตุการณ์เรียบร้อยแล้ว');
        const data = await getDashboard(incidentDate);
        setDashboard(data);
        setSelectedDate(incidentDate);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'บันทึกข้อมูลไม่สำเร็จ');
      }
    });
  }

  function handlePayIncident(incidentId: number) {
    startTransition(async () => {
      try {
        await payIncident(incidentId);
        setMessage('อัปเดตการชำระเงินเรียบร้อยแล้ว');
        const data = await getDashboard(selectedDate);
        setDashboard(data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'อัปเดตการชำระเงินไม่สำเร็จ');
      }
    });
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">SPK R5 Parking Control</p>
          <h1>ระบบติดตามบ้านที่มีการจอดรถหน้าบ้านรายวัน</h1>
          <p className="hero-copy">
            สีเขียวคือชำระแล้ว, สีแดงอ่อนคือมีค่าปรับค้างชำระ, สีขาวพร้อมตัวเลขคือการแจ้งเตือนครั้งที่ 1 และ 2
            เมื่อถึงครั้งที่ 3 จะเริ่มคิด 1,000 บาท และครั้งถัดไปครั้งละ 500 บาท
          </p>
        </div>

        <div className="totals-grid">
          <StatCard label="บ้านที่พบการจอด" value={String(dashboard.totals.parkedHomes)} />
          <StatCard label="ชำระแล้ว" value={String(dashboard.totals.paidHomes)} />
          <StatCard label="ค้างชำระ" value={String(dashboard.totals.unpaidHomes)} />
          <StatCard label="ยอดค้างรวม" value={formatCurrency(dashboard.totals.outstandingAmount)} />
        </div>
      </section>

      <section className="panel-row">
        <div className="panel">
          <div className="panel-heading">
            <h2>ตัวกรองรายวัน</h2>
            <span>{isPending ? 'กำลังอัปเดต...' : 'พร้อมใช้งาน'}</span>
          </div>
          <label className="field">
            <span>เลือกวันที่</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                setSelectedDate(nextDate);
                refresh(nextDate);
              }}
            />
          </label>

          <div className="legend">
            <LegendItem className="legend-dot paid" label="สีเขียว: ชำระค่าปรับแล้ว" />
            <LegendItem className="legend-dot unpaid" label="สีแดงอ่อน: ยังไม่ชำระ" />
            <LegendItem className="legend-dot warning" label="สีขาว: แจ้งเตือนครั้งที่ 1-2" />
          </div>
        </div>

        <form className="panel" action={handleCreateIncident}>
          <div className="panel-heading">
            <h2>บันทึกเหตุการณ์ใหม่</h2>
            <span>เพิ่มรายการรายวัน</span>
          </div>

          <label className="field">
            <span>บ้าน</span>
            <select
              name="houseId"
              value={selectedHouseId}
              onChange={(event) => setSelectedHouseId(Number(event.target.value))}
            >
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.code} - {house.ownerName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>วันที่เกิดเหตุ</span>
            <input name="incidentDate" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>

          <label className="field">
            <span>หมายเหตุ</span>
            <textarea
              name="note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="เช่น จอดขวางทางเข้า 18:30 น."
            />
          </label>

          <button className="primary-button" type="submit" disabled={isPending}>
            บันทึกเหตุการณ์
          </button>
        </form>
      </section>

      {message ? <p className="message">{message}</p> : null}

      <section className="homes-grid">
        {dashboard.houses.map((house) => (
          <article key={house.incidentId} className={statusStyles[house.status]}>
            <div className="card-head">
              <div>
                <p className="house-code">{house.houseCode}</p>
                <h3>{house.ownerName}</h3>
              </div>
              <Badge house={house} />
            </div>
            <p className="muted">{house.address}</p>
            <p className="muted">เวลาที่บันทึก: {formatDateTime(house.occurredAt)}</p>
            {house.note ? <p className="note-box">{house.note}</p> : null}
            <div className="amount-row">
              <span>ครั้งสะสม</span>
              <strong>{house.offenseCount}</strong>
            </div>
            <div className="amount-row">
              <span>ค่าปรับครั้งนี้</span>
              <strong>{formatCurrency(house.fineAmount)}</strong>
            </div>
            <div className="amount-row">
              <span>ค้างชำระ</span>
              <strong>{formatCurrency(house.outstandingAmount)}</strong>
            </div>

            {house.status === 'UNPAID' ? (
              <button className="secondary-button" onClick={() => handlePayIncident(house.incidentId)} disabled={isPending}>
                บันทึกว่าชำระแล้ว
              </button>
            ) : null}

            {house.status === 'PAID' && house.paidAt ? (
              <p className="paid-date">ชำระเมื่อ {formatDateTime(house.paidAt)}</p>
            ) : null}
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>รายการแจ้งเตือนที่ยังไม่ถึงขั้นปรับ</h2>
          <span>{warnings.length} รายการ</span>
        </div>
        <div className="warning-list">
          {warnings.map((house) => (
            <div key={house.incidentId} className="warning-row">
              <span>
                {house.houseCode} - {house.ownerName}
              </span>
              <strong>{house.label}</strong>
            </div>
          ))}
          {warnings.length === 0 ? <p className="muted">ไม่มีรายการเตือนในวันนี้</p> : null}
        </div>
      </section>
    </main>
  );
}

function Badge({ house }: { house: HouseSummary }) {
  return (
    <div className="badge">
      <span>{house.label}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="legend-item">
      <span className={className} />
      <span>{label}</span>
    </div>
  );
}
