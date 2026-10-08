/**
 * Employee feature service.
 *
 * UI → this service → (live API client | demo layer) → data.
 * `/employees` and `/employees/{id}` EXIST in openapi.yaml, so the live branch
 * calls the real contract. The extended profile (EmployeeDetail), onboarding,
 * and lifecycle are API gaps — demo only — and the live branch would throw
 * until the planner adds them (we never invent endpoints).
 */

import { isDemo } from "@/lib/config";
import { apiFetch } from "@/lib/api/client";
import { delay, paginate } from "@/lib/demo/paginate";
import {
  employees,
  employeeExits,
  lifecycleChanges,
  onboardingCandidates,
} from "@/lib/demo/seed";
import type {
  Employee,
  EmployeeSummary,
  EmployeeStatus,
  Paginated,
} from "@/types/api";
import type {
  EmployeeDetail,
  EmployeeExit,
  LifecycleChange,
  OnboardingCandidate,
} from "@/types/domain";

export interface EmployeeListParams {
  page?: number;
  per_page?: number;
  q?: string;
  department?: string;
  status?: EmployeeStatus;
}

export async function listEmployees(
  params: EmployeeListParams = {},
): Promise<Paginated<EmployeeSummary>> {
  if (isDemo) {
    let rows = employees.map((e) => e._summary);
    const q = params.q?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q) ||
          r.work_email.toLowerCase().includes(q),
      );
    }
    if (params.department) rows = rows.filter((r) => r.department === params.department);
    if (params.status) rows = rows.filter((r) => r.status === params.status);
    return delay(paginate(rows, params.page, params.per_page));
  }
  return apiFetch<Paginated<EmployeeSummary>>("/employees", {
    query: {
      page: params.page,
      per_page: params.per_page,
      q: params.q,
      status: params.status,
    },
  });
}

export async function getEmployee(id: number): Promise<Employee> {
  if (isDemo) {
    const row = employees.find((e) => e.id === id);
    if (!row) throw new Error("Employee not found");
    const { _summary, _detail, ...employee } = row;
    return delay(employee);
  }
  return apiFetch<Employee>(`/employees/${id}`);
}

/** Extended profile — API gap; demo only. */
export async function getEmployeeDetail(id: number): Promise<EmployeeDetail> {
  const row = employees.find((e) => e.id === id);
  if (!row) throw new Error("Employee not found");
  return delay(row._detail);
}

export async function listOnboarding(): Promise<OnboardingCandidate[]> {
  return delay(onboardingCandidates);
}

export async function listLifecycleChanges(): Promise<LifecycleChange[]> {
  return delay(lifecycleChanges);
}

export async function listExits(): Promise<EmployeeExit[]> {
  return delay(employeeExits);
}

export function departmentOptions(): string[] {
  return Array.from(new Set(employees.map((e) => e._summary.department).filter(Boolean))) as string[];
}
