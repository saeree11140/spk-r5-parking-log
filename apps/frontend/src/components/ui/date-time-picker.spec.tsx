import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithQueryClient } from "@/test/render";

import { DateTimePickerField } from "./date-time-picker";

function PickerHarness({
  initialValue = "2026-08-14T17:30:45",
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
    const time = screen.getByLabelText("เวลา วันเวลาเกิดเหตุ");
    expect(time).toHaveValue("17:30:45");
    expect(time).toHaveAttribute("type", "time");
    expect(time).toHaveAttribute("step", "1");
    expect(time).toHaveClass("date-time-picker__time-input");
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

    expect(onChange).toHaveBeenLastCalledWith("2026-08-15T17:30:45");
    expect(
      screen.queryByRole("dialog", { name: "เลือกวันที่" }),
    ).not.toBeInTheDocument();
  });

  it("commits a native time change immediately while preserving the date", () => {
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);

    fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
      target: { value: "18:45:12" },
    });

    expect(onChange).toHaveBeenLastCalledWith("2026-08-14T18:45:12");
  });

  it("displays a legacy minute value with zero seconds and emits canonical seconds", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithQueryClient(
      <PickerHarness
        initialValue="2026-08-14T17:30"
        onChangeSpy={onChange}
      />,
    );

    expect(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ")).toHaveValue(
      "17:30:00",
    );
    await user.click(
      screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }),
    );
    await user.click(
      screen.getByRole("button", { name: /15 สิงหาคม 2569/ }),
    );

    expect(onChange).toHaveBeenLastCalledWith("2026-08-15T17:30:00");
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

  it("emits an empty form value and exposes an error for a time after maxValue", () => {
    const onChange = vi.fn();
    renderWithQueryClient(
      <PickerHarness
        maxValue="2026-08-14T17:30:00"
        onChangeSpy={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
      target: { value: "18:00:00" },
    });

    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "วันเวลาอยู่นอกช่วงที่กำหนด",
    );
    expect(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("keeps an emptied native time visible while marking the form value incomplete", () => {
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);

    fireEvent.change(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ"), {
      target: { value: "" },
    });

    expect(screen.getByLabelText("เวลา วันเวลาเกิดเหตุ")).toHaveValue("");
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "กรุณาระบุวันเวลาให้ครบ",
    );
  });

  it("disables calendar dates outside minValue and maxValue", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <PickerHarness
        maxValue="2026-08-14T23:59:59"
        minValue="2026-08-14T00:00:00"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "เลือกวันที่ วันเวลาเกิดเหตุ" }),
    );

    expect(
      screen.getByRole("button", { name: /13 สิงหาคม 2569/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /15 สิงหาคม 2569/ }),
    ).toBeDisabled();
  });

  it("closes with Escape and restores focus to the date trigger", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PickerHarness />);
    const trigger = screen.getByRole("button", {
      name: "เลือกวันที่ วันเวลาเกิดเหตุ",
    });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "เลือกวันที่" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
