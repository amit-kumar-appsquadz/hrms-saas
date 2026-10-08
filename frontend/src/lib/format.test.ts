import { describe, it, expect } from "vitest";
import { formatDate, formatINR, formatNumber, timeAgoHours, cx } from "./format";

describe("format", () => {
  it("formats dates as DD MMM YYYY", () => {
    expect(formatDate("2024-07-15")).toBe("15 Jul 2024");
  });

  it("returns em dash for empty dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats INR with Indian grouping and no paise by default", () => {
    const out = formatINR(1234567);
    expect(out).toContain("₹");
    expect(out).toContain("12,34,567");
  });

  it("formats numbers with Indian grouping", () => {
    expect(formatNumber(1234567)).toBe("12,34,567");
  });

  it("renders relative hours", () => {
    expect(timeAgoHours(0.5)).toBe("just now");
    expect(timeAgoHours(5)).toBe("5h ago");
    expect(timeAgoHours(48)).toBe("2d ago");
  });

  it("joins truthy class names", () => {
    expect(cx("a", false, null, "b", undefined)).toBe("a b");
  });
});
