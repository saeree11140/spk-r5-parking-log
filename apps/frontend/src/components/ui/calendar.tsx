"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { type ComponentProps } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

export function Calendar({
  className = "",
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      className={`date-time-picker__calendar ${className}`.trim()}
      classNames={{
        root: `date-time-picker__calendar-root ${defaults.root}`,
        months: `date-time-picker__months ${defaults.months}`,
        month: `date-time-picker__month ${defaults.month}`,
        nav: `date-time-picker__calendar-nav ${defaults.nav}`,
        button_previous: `date-time-picker__nav ${defaults.button_previous}`,
        button_next: `date-time-picker__nav ${defaults.button_next}`,
        month_caption: `date-time-picker__month-caption ${defaults.month_caption}`,
        caption_label: `date-time-picker__caption-label ${defaults.caption_label}`,
        month_grid: `date-time-picker__grid ${defaults.month_grid}`,
        weekdays: `date-time-picker__weekdays ${defaults.weekdays}`,
        weekday: `date-time-picker__weekday ${defaults.weekday}`,
        weeks: `date-time-picker__weeks ${defaults.weeks}`,
        week: `date-time-picker__week ${defaults.week}`,
        day: `date-time-picker__day ${defaults.day}`,
        day_button: `date-time-picker__cell ${defaults.day_button}`,
        selected: `date-time-picker__selected ${defaults.selected}`,
        today: `date-time-picker__today-date ${defaults.today}`,
        outside: `date-time-picker__outside ${defaults.outside}`,
        disabled: `date-time-picker__disabled ${defaults.disabled}`,
        hidden: defaults.hidden,
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...iconProps }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : ChevronDown;
          return (
            <Icon
              aria-hidden="true"
              className={chevronClassName}
              size={18}
              {...iconProps}
            />
          );
        },
        ...components,
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}
