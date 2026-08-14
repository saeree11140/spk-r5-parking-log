"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { th } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDateTimeInputValue,
  isLocalDateTimeInRange,
  maskDateTimeInputValue,
  parseDateTimeInputValue,
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

const COMPLETE_INPUT_LENGTH = 16;
const NORMALIZED_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateFromNormalized(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = NORMALIZED_DATE_TIME_PATTERN.exec(value);
  if (!match) return undefined;

  const [, yearValue, monthValue, dayValue] = match;
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
  return date;
}

function normalizedFromDate(
  date: Date,
  hour: string,
  minute: string,
): string | undefined {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) {
    return undefined;
  }

  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (hourNumber > 23 || minuteNumber > 59) return undefined;

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(hourNumber)}:${pad(minuteNumber)}`;
}

function timeFromNormalized(value?: string): { hour: string; minute: string } {
  const match = value ? NORMALIZED_DATE_TIME_PATTERN.exec(value) : null;
  return {
    hour: match?.[4] ?? "00",
    minute: match?.[5] ?? "00",
  };
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
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const emittedValueRef = useRef<string | null>(null);
  const fallbackValue = maxValue ?? toDateTimeLocalValue(new Date());
  const initialValue = value || fallbackValue;
  const initialDate =
    dateFromNormalized(initialValue) ?? dateFromNormalized(fallbackValue)!;
  const initialTime = timeFromNormalized(initialValue);
  const [displayValue, setDisplayValue] = useState(() =>
    formatDateTimeInputValue(value),
  );
  const [localError, setLocalError] = useState<string>();
  const [isOpen, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(initialDate);
  const [draftMonth, setDraftMonth] = useState(initialDate);
  const [draftHour, setDraftHour] = useState(initialTime.hour);
  const [draftMinute, setDraftMinute] = useState(initialTime.minute);

  useEffect(() => {
    if (value === emittedValueRef.current) {
      emittedValueRef.current = null;
      return;
    }
    setDisplayValue(formatDateTimeInputValue(value));
  }, [value]);

  function setInputRef(element: HTMLInputElement | null) {
    inputRef.current = element;
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }

  function emit(nextValue: string) {
    emittedValueRef.current = nextValue;
    onChange(nextValue);
  }

  function validateDisplay(nextDisplay: string): string | undefined {
    if (nextDisplay.length !== COMPLETE_INPUT_LENGTH) return undefined;
    try {
      const nextValue = parseDateTimeInputValue(nextDisplay);
      if (!isLocalDateTimeInRange(nextValue, minValue, maxValue)) {
        return "วันเวลาอยู่นอกช่วงที่กำหนด";
      }
    } catch {
      return "กรุณาระบุวันเวลาที่ถูกต้อง";
    }
    return undefined;
  }

  function handleInputChange(nextRawValue: string) {
    const nextDisplay = maskDateTimeInputValue(nextRawValue);
    setDisplayValue(nextDisplay);
    setLocalError(undefined);

    if (nextDisplay.length !== COMPLETE_INPUT_LENGTH) {
      emit("");
      return;
    }

    try {
      const nextValue = parseDateTimeInputValue(nextDisplay);
      if (!isLocalDateTimeInRange(nextValue, minValue, maxValue)) {
        setLocalError("วันเวลาอยู่นอกช่วงที่กำหนด");
        emit(nextValue);
        return;
      }
      emit(nextValue);
    } catch {
      setLocalError("กรุณาระบุวันเวลาที่ถูกต้อง");
      emit("");
    }
  }

  function handleBlur() {
    if (displayValue && displayValue.length !== COMPLETE_INPUT_LENGTH) {
      setLocalError("กรุณาระบุวันเวลาให้ครบ");
    } else if (displayValue) {
      setLocalError(validateDisplay(displayValue));
    }
    onBlur();
  }

  function initializeDraft() {
    const nextValue = value || fallbackValue;
    const nextDate =
      dateFromNormalized(nextValue) ?? dateFromNormalized(fallbackValue)!;
    const nextTime = timeFromNormalized(nextValue);
    setDraftDate(nextDate);
    setDraftMonth(nextDate);
    setDraftHour(nextTime.hour);
    setDraftMinute(nextTime.minute);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) initializeDraft();
    setOpen(nextOpen);
  }

  const draftValue = normalizedFromDate(
    draftDate,
    draftHour,
    draftMinute,
  );
  const draftIsValid =
    draftValue !== undefined &&
    isLocalDateTimeInRange(draftValue, minValue, maxValue);
  const visibleError = error ?? localError;
  const minimumDate = dateFromNormalized(minValue);
  const maximumDate = dateFromNormalized(maxValue);
  const todayDate = dateFromNormalized(toDateTimeLocalValue(new Date()))!;
  const disabledDates = [
    ...(minimumDate ? [{ before: minimumDate }] : []),
    ...(maximumDate ? [{ after: maximumDate }] : []),
  ];

  return (
    <div className="date-time-picker form-field">
      <label htmlFor={inputId}>{label}</label>
      <Popover
        onOpenChange={handleOpenChange}
        onOpenChangeComplete={(open) => {
          if (!open) inputRef.current?.focus();
        }}
        open={isOpen}
      >
        <div className="date-time-picker__input-group">
          <input
            ref={setInputRef}
            aria-describedby={visibleError ? errorId : undefined}
            aria-invalid={visibleError ? "true" : undefined}
            autoComplete="off"
            disabled={disabled}
            id={inputId}
            inputMode="numeric"
            name={name}
            placeholder="วว/ดด/พ.ศ. ชช:นน"
            type="text"
            value={displayValue}
            onBlur={handleBlur}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                handleOpenChange(true);
              }
            }}
          />
          <PopoverTrigger
            aria-label={`เปิดปฏิทิน ${label}`}
            className="date-time-picker__trigger"
            disabled={disabled}
          >
            <CalendarDays aria-hidden="true" size={18} />
          </PopoverTrigger>
        </div>
        <PopoverContent
          aria-label="เลือกวันเวลา"
          className="date-time-picker__popover"
          finalFocus={inputRef}
          role="dialog"
        >
          <div className="date-time-picker__scroll">
            <div className="date-time-picker__calendar-tools">
              <span>
                {formatDateTimeInputValue(draftValue ?? "").slice(0, 10)}
              </span>
              <Button
                className="date-time-picker__today"
                onClick={() => {
                  setDraftDate(todayDate);
                  setDraftMonth(todayDate);
                }}
              >
                วันนี้
              </Button>
            </div>
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
              month={draftMonth}
              selected={draftDate}
              timeZone="UTC"
              today={todayDate}
              onMonthChange={setDraftMonth}
              onSelect={(nextDate) => {
                if (nextDate) setDraftDate(nextDate);
              }}
            />
            <div className="date-time-picker__time">
              <Clock3 aria-hidden="true" size={18} />
              <label>
                <span>ชั่วโมง</span>
                <input
                  aria-label="ชั่วโมง"
                  inputMode="numeric"
                  max="23"
                  min="0"
                  type="number"
                  value={draftHour}
                  onChange={(event) => setDraftHour(event.target.value)}
                />
              </label>
              <span aria-hidden="true">:</span>
              <label>
                <span>นาที</span>
                <input
                  aria-label="นาที"
                  inputMode="numeric"
                  max="59"
                  min="0"
                  type="number"
                  value={draftMinute}
                  onChange={(event) => setDraftMinute(event.target.value)}
                />
              </label>
            </div>
            {!draftIsValid ? (
              <p className="date-time-picker__draft-error" role="alert">
                วันเวลาอยู่นอกช่วงที่กำหนด
              </p>
            ) : null}
          </div>
          <div className="date-time-picker__actions">
            <Button onClick={() => handleOpenChange(false)}>ยกเลิก</Button>
            <Button
              disabled={!draftIsValid}
              onClick={() => {
                if (!draftValue || !draftIsValid) return;
                emit(draftValue);
                setDisplayValue(formatDateTimeInputValue(draftValue));
                setLocalError(undefined);
                handleOpenChange(false);
              }}
              variant="primary"
            >
              นำไปใช้
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {visibleError ? (
        <small className="field-error" id={errorId}>
          {visibleError}
        </small>
      ) : null}
    </div>
  );
});
