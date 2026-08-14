import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithQueryClient } from "@/test/render";

import { DateTimePickerField } from "./date-time-picker";

function PickerHarness({
  initialValue = "2026-08-14T17:30",
  maxValue,
  minValue,
  onChangeSpy,
}: {
  initialValue?: string;
  maxValue?: string;
  minValue?: string;
  onChangeSpy?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <DateTimePickerField
      label="วันเวลาเกิดเหตุ"
      maxValue={maxValue}
      minValue={minValue}
      name="occurredAt"
      onBlur={() => undefined}
      onChange={(nextValue) => {
        onChangeSpy?.(nextValue);
        setValue(nextValue);
      }}
      value={value}
    />
  );
}

describe("DateTimePickerField", () => {
  it("renders a Buddhist date button beside a native 24-hour time input", () => {
    renderWithQueryClient(<PickerHarness />);

    expect(
      screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }),
    ).toHaveTextContent("14/08/2569");
    expect(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ")).toHaveValue(
      "17:30",
    );
    expect(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ")).toHaveAttribute(
      "type",
      "time",
    );
    expect(
      document.querySelector('input[type="datetime-local"]'),
    ).not.toBeInTheDocument();
  });

  it("commits a selected calendar date immediately and closes the popover", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);

    await user.click(
      screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }),
    );
    await user.click(
      screen.getByRole("button", { name: /15 สิงหาคม 2569/ }),
    );

    expect(onChange).toHaveBeenLastCalledWith("2026-08-15T17:30");
    expect(
      screen.queryByRole("dialog", { name: "เลือกวันที่" }),
    ).not.toBeInTheDocument();
  });

  it("commits a native time change immediately while preserving the date", () => {
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);

    fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
      target: { value: "18:45" },
    });

    expect(onChange).toHaveBeenLastCalledWith("2026-08-14T18:45");
  });

  it("does not render Apply or Cancel actions in the calendar", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PickerHarness />);

    await user.click(
      screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }),
    );

    expect(
      screen.queryByRole("button", { name: "นำไปใช้" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ยกเลิก" }),
    ).not.toBeInTheDocument();
  });
});
