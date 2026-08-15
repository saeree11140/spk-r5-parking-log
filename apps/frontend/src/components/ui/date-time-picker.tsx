"use client";

import { ChevronDownIcon } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { th } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  isLocalDateTimeInRange,
  toDateTimeLocalValue,
} from "@/lib/date-time";

interface DateTimePickerFieldProps {
  disabled?: boolean;
  error?: string;
  label: string;
  maxValue?: string;
  minValue?: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}

const NORMALIZED_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function canonicalTime(value: string): string | undefined {
  const match = TIME_PATTERN.exec(value);
  if (!match) return undefined;
  const [, hour, minute, second = "00"] = match;
  return `${hour}:${minute}:${second}`;
}

function partsFromNormalized(
  value?: string,
): { date: Date; time: string } | undefined {
  const match = value ? NORMALIZED_DATE_TIME_PATTERN.exec(value) : null;
  if (!match) return undefined;

  const [
    ,
    yearValue,
    monthValue,
    dayValue,
    hourValue,
    minuteValue,
    secondValue = "00",
  ] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  const time = canonicalTime(`${hourValue}:${minuteValue}:${secondValue}`);
  return time ? { date, time } : undefined;
}

function normalizedFromParts(
  date: Date | undefined,
  time: string,
): string | undefined {
  const normalizedTime = canonicalTime(time);
  if (!date || !normalizedTime) return undefined;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${normalizedTime}`;
}

function formatBuddhistDate(date: Date | undefined): string {
  if (!date) return "เลือกวันที่";
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear() + 543}`;
}

function dateFromNormalized(value?: string): Date | undefined {
  return partsFromNormalized(value)?.date;
}

function thaiMonthYear(date: Date): string {
  const month = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return `${month} ${date.getUTCFullYear() + 543}`;
}

function thaiWeekday(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "UTC",
    weekday: "long",
  }).format(date);
}

function thaiMonth(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function buddhistDayLabel(date: Date): string {
  return `${thaiWeekday(date)}ที่ ${date.getUTCDate()} ${thaiMonth(date)} ${date.getUTCFullYear() + 543}`;
}

export const DateTimePickerField = forwardRef<
  HTMLInputElement,
  DateTimePickerFieldProps
>(function DateTimePickerField(
  {
    disabled = false,
    error,
    label,
    maxValue,
    minValue,
    name,
    onBlur,
    onChange,
    value,
  },
  forwardedRef,
) {
  const dateInputId = useId();
  const errorId = useId();
  const dateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const emittedValueRef = useRef<string | null>(null);
  const fallbackValue = maxValue ?? toDateTimeLocalValue(new Date());
  const initialParts =
    partsFromNormalized(value) ?? partsFromNormalized(fallbackValue)!;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialParts.date,
  );
  const [visibleMonth, setVisibleMonth] = useState(initialParts.date);
  const [timeValue, setTimeValue] = useState(initialParts.time);
  const [isOpen, setOpen] = useState(false);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    if (value === emittedValueRef.current) {
      emittedValueRef.current = null;
      return;
    }

    const nextParts = partsFromNormalized(value);
    setSelectedDate(nextParts?.date);
    setTimeValue(nextParts?.time ?? "");
    if (nextParts) {
      setVisibleMonth(nextParts.date);
      setLocalError(undefined);
    }
  }, [value]);

  function emit(nextValue: string) {
    emittedValueRef.current = nextValue;
    onChange(nextValue);
  }

  function emitParts(nextDate: Date | undefined, nextTime: string) {
    const nextValue = normalizedFromParts(nextDate, nextTime);
    if (!nextValue) {
      setLocalError("กรุณาระบุวันเวลาให้ครบ");
      emit("");
      return;
    }
    if (!isLocalDateTimeInRange(nextValue, minValue, maxValue)) {
      setLocalError("วันเวลาอยู่นอกช่วงที่กำหนด");
      emit("");
      return;
    }
    setLocalError(undefined);
    emit(nextValue);
  }

  function handleDateSelect(nextDate: Date | undefined) {
    if (!nextDate) return;
    setSelectedDate(nextDate);
    setVisibleMonth(nextDate);
    emitParts(nextDate, timeValue);
    setOpen(false);
  }

  function handleTimeChange(nextTime: string) {
    const normalizedTime = canonicalTime(nextTime) ?? nextTime;
    setTimeValue(normalizedTime);
    emitParts(selectedDate, normalizedTime);
  }

  const minimumDate = dateFromNormalized(minValue);
  const maximumDate = dateFromNormalized(maxValue);
  const todayDate = dateFromNormalized(toDateTimeLocalValue(new Date()))!;
  const disabledDates = [
    ...(minimumDate ? [{ before: minimumDate }] : []),
    ...(maximumDate ? [{ after: maximumDate }] : []),
  ];
  const visibleError = error ?? localError;

  return (
    <div className="date-time-picker form-field">
      <label htmlFor={dateInputId}>{label}</label>
      <div className="date-time-picker__controls">
        <Popover open={isOpen} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                ref={dateTriggerRef}
                aria-describedby={visibleError ? errorId : undefined}
                aria-invalid={visibleError ? "true" : undefined}
                aria-label={`เลือกวันที่ ${label}`}
                className="date-time-picker__date-trigger"
                disabled={disabled}
                id={dateInputId}
              >
                <span>{formatBuddhistDate(selectedDate)}</span>
                <ChevronDownIcon aria-hidden="true" size={16} />
              </Button>
            }
          />
          <PopoverContent
            align="start"
            aria-label="เลือกวันที่"
            className="date-time-picker__popover"
            finalFocus={dateTriggerRef}
            role="dialog"
          >
            <Calendar
              disabled={disabledDates}
              formatters={{
                formatCaption: thaiMonthYear,
                formatDay: (date) => String(date.getUTCDate()),
                formatWeekdayName: (date) => thaiWeekday(date).slice(3, 5),
              }}
              labels={{
                labelDayButton: buddhistDayLabel,
                labelNext: () => "เดือนถัดไป",
                labelPrevious: () => "เดือนก่อนหน้า",
              }}
              locale={th}
              mode="single"
              month={visibleMonth}
              selected={selectedDate}
              timeZone="UTC"
              today={todayDate}
              onMonthChange={setVisibleMonth}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
        <Input
          ref={forwardedRef}
          aria-describedby={visibleError ? errorId : undefined}
          aria-invalid={visibleError ? "true" : undefined}
          aria-label={`เวลา ${label}`}
          className="date-time-picker__time-input appearance-none"
          disabled={disabled}
          name={name}
          step="1"
          type="time"
          value={timeValue}
          onBlur={onBlur}
          onChange={(event) => handleTimeChange(event.target.value)}
        />
      </div>
      {visibleError ? (
        <small className="field-error" id={errorId} role="alert">
          {visibleError}
        </small>
      ) : null}
    </div>
  );
});
