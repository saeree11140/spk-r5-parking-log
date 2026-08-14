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
  it("displays a normalized value using day month Buddhist year and 24-hour time", () => {
    renderWithQueryClient(<PickerHarness />);

    expect(screen.getByLabelText("วันเวลาเกิดเหตุ")).toHaveValue(
      "14/08/2569 17:30",
    );
  });

  it("masks manual digits and emits the normalized Gregorian value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);
    const input = screen.getByLabelText("วันเวลาเกิดเหตุ");

    await user.clear(input);
    await user.type(input, "150825691845");

    expect(input).toHaveValue("15/08/2569 18:45");
    expect(onChange).toHaveBeenLastCalledWith("2026-08-15T18:45");
  });

  it("emits an empty form value while manual input is incomplete", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);
    const input = screen.getByLabelText("วันเวลาเกิดเหตุ");

    await user.clear(input);
    await user.type(input, "1508");

    expect(input).toHaveValue("15/08");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("marks a completed value outside the allowed range as invalid", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PickerHarness maxValue="2026-08-14T17:30" />);
    const input = screen.getByLabelText("วันเวลาเกิดเหตุ");

    await user.clear(input);
    await user.type(input, "150825691730");
    fireEvent.blur(input);

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("วันเวลาอยู่นอกช่วงที่กำหนด")).toBeInTheDocument();
  });

  it("keeps popover time changes as a draft until Apply", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithQueryClient(<PickerHarness onChangeSpy={onChange} />);

    await user.click(
      screen.getByRole("button", {
        name: /^เปิดปฏิทิน วันเวลาเกิดเหตุ/,
      }),
    );
    const hour = screen.getByRole("spinbutton", { name: "ชั่วโมง" });
    const minute = screen.getByRole("spinbutton", { name: "นาที" });
    await user.clear(hour);
    await user.type(hour, "18");
    await user.clear(minute);
    await user.type(minute, "45");

    expect(screen.getByLabelText("วันเวลาเกิดเหตุ")).toHaveValue(
      "14/08/2569 17:30",
    );

    await user.click(screen.getByRole("button", { name: "นำไปใช้" }));

    expect(onChange).toHaveBeenLastCalledWith("2026-08-14T18:45");
    expect(screen.getByLabelText("วันเวลาเกิดเหตุ")).toHaveValue(
      "14/08/2569 18:45",
    );
  });

  it("discards a popover draft with Cancel", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PickerHarness />);
    const input = screen.getByLabelText("วันเวลาเกิดเหตุ");

    await user.click(
      screen.getByRole("button", {
        name: /^เปิดปฏิทิน วันเวลาเกิดเหตุ/,
      }),
    );
    const hour = screen.getByRole("spinbutton", { name: "ชั่วโมง" });
    await user.clear(hour);
    await user.type(hour, "18");
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(input).toHaveValue("14/08/2569 17:30");
  });

  it("closes the popover with Escape and restores focus to the input", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PickerHarness />);
    const input = screen.getByLabelText("วันเวลาเกิดเหตุ");

    await user.click(
      screen.getByRole("button", {
        name: /^เปิดปฏิทิน วันเวลาเกิดเหตุ/,
      }),
    );
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "เลือกวันเวลา" }),
    ).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });
});
