import { describe, it, expect } from "vitest";
import { statusMeta } from "./status";

describe("statusMeta", () => {
  it("maps known statuses to tone + label", () => {
    expect(statusMeta("active")).toEqual({ tone: "success", label: "Active" });
    expect(statusMeta("on_notice")).toEqual({ tone: "warning", label: "On notice" });
    expect(statusMeta("rejected")).toEqual({ tone: "danger", label: "Rejected" });
  });

  it("falls back to a neutral humanized label for unknown statuses", () => {
    expect(statusMeta("something_new")).toEqual({ tone: "neutral", label: "something new" });
  });
});
