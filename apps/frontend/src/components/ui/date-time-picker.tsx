"use client";

// Adapted from Untitled UI's MIT-licensed date picker composition.
// See docs/third-party/untitled-ui-MIT.txt.
import {
  CalendarDateTime,
  parseDateTime as parseCalendarDateTime,
  toCalendarDateTime,
  today,
  type DateValue,
} from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  DatePicker as AriaDatePicker,
  Dialog as AriaDialog,
  Group as AriaGroup,
  Heading as AriaHeading,
  I18nProvider,
  Popover as AriaPopover,
} from "react-aria-components";

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
const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function calendarValue(value?: string): CalendarDateTime | undefined {
  if (!value) return undefined;
  try {
    return parseCalendarDateTime(value);
  } catch {
    return undefined;
  }
}

function normalizedValue(
  date: DateValue,
  hour: string,
  minute: string,
): string | undefined {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) {
    return undefined;
  }

  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (hourNumber > 23 || minuteNumber > 59) return undefined;

  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}T${String(hourNumber).padStart(2, "0")}:${String(minuteNumber).padStart(2, "0")}`;
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
  const [displayValue, setDisplayValue] = useState(() =>
    formatDateTimeInputValue(value),
  );
  const [localError, setLocalError] = useState<string>();
  const [isOpen, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<CalendarDateTime>(
    () =>
      calendarValue(value) ??
      calendarValue(maxValue) ??
      parseCalendarDateTime(toDateTimeLocalValue(new Date())),
  );
  const [draftHour, setDraftHour] = useState(() =>
    String(draftDate.hour).padStart(2, "0"),
  );
  const [draftMinute, setDraftMinute] = useState(() =>
    String(draftDate.minute).padStart(2, "0"),
  );

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
        emit("");
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
    const nextDate =
      calendarValue(value) ??
      calendarValue(maxValue) ??
      parseCalendarDateTime(toDateTimeLocalValue(new Date()));
    setDraftDate(nextDate);
    setDraftHour(String(nextDate.hour).padStart(2, "0"));
    setDraftMinute(String(nextDate.minute).padStart(2, "0"));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) initializeDraft();
    setOpen(nextOpen);
    if (!nextOpen) queueMicrotask(() => inputRef.current?.focus());
  }

  const draftValue = normalizedValue(draftDate, draftHour, draftMinute);
  const draftIsValid =
    draftValue !== undefined &&
    isLocalDateTimeInRange(draftValue, minValue, maxValue);
  const visibleError = error ?? localError;

  return (
    <I18nProvider locale="th-TH-u-ca-buddhist-nu-latn">
      <div className="date-time-picker form-field">
        <label htmlFor={inputId}>{label}</label>
        <AriaDatePicker
          aria-label={`ตัวเลือก${label}`}
          isDisabled={disabled}
          isOpen={isOpen}
          maxValue={calendarValue(maxValue)}
          minValue={calendarValue(minValue)}
          onOpenChange={handleOpenChange}
          shouldCloseOnSelect={false}
          value={draftDate}
          onChange={(nextDate) => {
            if (nextDate) setDraftDate(toCalendarDateTime(nextDate));
          }}
        >
          <AriaGroup className="date-time-picker__input-group">
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
            />
            <AriaButton
              aria-label={`เปิดปฏิทิน ${label}`}
              className="date-time-picker__trigger"
              isDisabled={disabled}
            >
              <CalendarDays aria-hidden="true" size={18} />
            </AriaButton>
          </AriaGroup>
          <AriaPopover
            className="date-time-picker__popover"
            offset={8}
            placement="bottom end"
          >
            <AriaDialog
              aria-label="เลือกวันเวลา"
              className="date-time-picker__dialog"
            >
              <AriaCalendar
                aria-label="ปฏิทิน"
                className="date-time-picker__calendar"
              >
                <header className="date-time-picker__calendar-header">
                  <AriaButton
                    aria-label="เดือนก่อนหน้า"
                    className="date-time-picker__nav"
                    slot="previous"
                  >
                    <ChevronLeft aria-hidden="true" size={18} />
                  </AriaButton>
                  <AriaHeading />
                  <AriaButton
                    aria-label="เดือนถัดไป"
                    className="date-time-picker__nav"
                    slot="next"
                  >
                    <ChevronRight aria-hidden="true" size={18} />
                  </AriaButton>
                </header>
                <div className="date-time-picker__calendar-tools">
                  <span>
                    {formatDateTimeInputValue(
                      normalizedValue(draftDate, draftHour, draftMinute) ?? "",
                    ).slice(0, 10)}
                  </span>
                  <AriaButton
                    className="date-time-picker__today"
                    slot={null}
                    onPress={() => {
                      const currentDate = toCalendarDateTime(
                        today(BANGKOK_TIME_ZONE),
                      ).set({
                        hour: Number(draftHour) || 0,
                        minute: Number(draftMinute) || 0,
                      });
                      setDraftDate(currentDate);
                    }}
                  >
                    วันนี้
                  </AriaButton>
                </div>
                <AriaCalendarGrid
                  className="date-time-picker__grid"
                  weekdayStyle="short"
                >
                  <AriaCalendarGridHeader>
                    {(day) => (
                      <AriaCalendarHeaderCell>
                        {day.slice(0, 2)}
                      </AriaCalendarHeaderCell>
                    )}
                  </AriaCalendarGridHeader>
                  <AriaCalendarGridBody>
                    {(date) => (
                      <AriaCalendarCell
                        className="date-time-picker__cell"
                        date={date}
                      />
                    )}
                  </AriaCalendarGridBody>
                </AriaCalendarGrid>
              </AriaCalendar>
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
              <div className="date-time-picker__actions">
                <AriaButton
                  className="button button--secondary"
                  slot={null}
                  onPress={() => handleOpenChange(false)}
                >
                  ยกเลิก
                </AriaButton>
                <AriaButton
                  className="button button--primary"
                  isDisabled={!draftIsValid}
                  slot={null}
                  onPress={() => {
                    if (!draftValue || !draftIsValid) return;
                    emit(draftValue);
                    setDisplayValue(formatDateTimeInputValue(draftValue));
                    setLocalError(undefined);
                    handleOpenChange(false);
                  }}
                >
                  นำไปใช้
                </AriaButton>
              </div>
            </AriaDialog>
          </AriaPopover>
        </AriaDatePicker>
        {visibleError ? (
          <small className="field-error" id={errorId}>
            {visibleError}
          </small>
        ) : null}
      </div>
    </I18nProvider>
  );
});
