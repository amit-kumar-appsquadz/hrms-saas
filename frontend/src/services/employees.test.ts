import { describe, it, expect } from "vitest";
import { listEmployees, getEmployee } from "./employees";

describe("employee service (demo mode)", () => {
  it("paginates the employee list with contract-shaped meta", async () => {
    const res = await listEmployees({ page: 1, per_page: 25 });
    expect(res.data.length).toBe(25);
    expect(res.meta.page).toBe(1);
    expect(res.meta.per_page).toBe(25);
    expect(res.meta.total).toBeGreaterThan(25);
    expect(res.meta.total_pages).toBe(Math.ceil(res.meta.total / 25));
  });

  it("filters by free-text query", async () => {
    const first = await getEmployee(1);
    const res = await listEmployees({ q: first.full_name });
    expect(res.data.some((e) => e.full_name === first.full_name)).toBe(true);
  });

  it("filters by status", async () => {
    const res = await listEmployees({ status: "active", per_page: 100 });
    expect(res.data.every((e) => e.status === "active")).toBe(true);
  });
});
