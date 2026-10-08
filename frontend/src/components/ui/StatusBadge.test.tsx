import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders a human-readable label (status is never color-only)", () => {
    render(<StatusBadge status="on_notice" />);
    expect(screen.getByText("On notice")).toBeInTheDocument();
  });

  it("humanizes unknown statuses", () => {
    render(<StatusBadge status="brand_new" />);
    expect(screen.getByText("brand new")).toBeInTheDocument();
  });
});
