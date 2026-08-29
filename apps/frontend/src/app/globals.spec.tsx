import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import "./globals.css";

function expectBodyTypography(element: HTMLElement) {
  const style = getComputedStyle(element);

  expect(style.fontSize).toBe("18px");
  expect(style.fontWeight).toBe("600");
  expect(style.lineHeight).toBe("26px");
}

describe("global typography", () => {
  it("uses body typography for select labels and values", () => {
    render(
      <label className="select-field">
        <span>สิทธิ์</span>
        <select aria-label="สิทธิ์" defaultValue="ADMIN">
          <option value="ADMIN">ADMIN</option>
        </select>
      </label>,
    );

    expectBodyTypography(screen.getByText("สิทธิ์"));
    expectBodyTypography(screen.getByRole("combobox", { name: "สิทธิ์" }));
  });

  it("uses body typography for table headings", () => {
    render(
      <table>
        <thead>
          <tr>
            <th>ชื่อผู้ใช้</th>
          </tr>
        </thead>
      </table>,
    );

    expectBodyTypography(
      screen.getByRole("columnheader", { name: "ชื่อผู้ใช้" }),
    );
  });
});
