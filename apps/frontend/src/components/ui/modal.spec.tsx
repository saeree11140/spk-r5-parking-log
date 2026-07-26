import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithQueryClient } from "@/test/render";

import { Modal } from "./modal";

function ModalHarness({
  onClose = () => undefined,
  pending = false,
}: {
  onClose?: () => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        เปิด
      </button>
      <Modal
        initialFocus="input"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        open={open}
        pending={pending}
        returnFocusRef={triggerRef}
        title="ทดสอบ Modal"
      >
        <label>
          เหตุผล
          <input name="reason" />
        </label>
        <button type="button">ยืนยัน</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("exposes a labelled dialog and moves focus inside", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ModalHarness />);

    await user.click(screen.getByRole("button", { name: "เปิด" }));

    expect(
      screen.getByRole("dialog", { name: "ทดสอบ Modal" }),
    ).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("textbox", { name: "เหตุผล" })).toHaveFocus();
  });

  it("closes with Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithQueryClient(<ModalHarness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "เปิด" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("dialog", { name: "ทดสอบ Modal" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not close while a mutation is pending", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithQueryClient(<ModalHarness onClose={onClose} pending />);

    await user.click(screen.getByRole("button", { name: "เปิด" }));
    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
