/**
 * API contract types — mirror of openapi.yaml (Sprint 0 skeleton).
 *
 * These are the ONLY types that correspond to endpoints that exist in the
 * contract today (/auth/*, /roles, /employees). In a production pipeline these
 * would be generated with openapi-typescript (FRONTEND_ARCHITECTURE §5); they
 * are hand-written here to match the committed contract exactly and must be
 * regenerated when the contract changes.
 *
 * Everything beyond these shapes is a documented API gap (docs/ui/API_GAPS.md)
 * and lives in types/domain.ts, served by the demo layer — never invented as a
 * real endpoint.
 */

/** Standard error envelope — every non-2xx response (openapi Error schema). */
export interface ApiError {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

/** Validation error — 422 (openapi ValidationErrorBody schema). */
export interface ApiValidationError {
  error: {
    code: string;
    message: string;
    request_id?: string;
    fields?: Record<string, string[]>;
  };
}

/** Pagination meta on every list (openapi PaginatedEnvelope). */
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/* ----- Auth ----- */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  token_type: string;
  expires_in?: number;
}

export interface MfaChallenge {
  mfa_required: true;
  challenge_id: string;
}

export type LoginResponse = TokenResponse | MfaChallenge;

export interface MfaVerifyRequest {
  challenge_id: string;
  code: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  employee_id: number | null;
  roles: string[];
  permissions: string[];
}

/* ----- Roles ----- */

export interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  created_at: string;
}

export interface RoleWriteRequest {
  name: string;
  permissions: string[];
}

/* ----- Employees ----- */

export type EmployeeStatus = "active" | "inactive" | "on_notice" | "exited";

export interface EmployeeSummary {
  id: number;
  employee_code: string;
  full_name: string;
  work_email: string;
  department: string | null;
  designation: string | null;
  status: EmployeeStatus;
}

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  work_email: string;
  manager_id: number | null;
  company_id: number;
  department_id: number | null;
  designation_id: number | null;
  grade_id: number | null;
  location_id: number | null;
  date_of_joining: string;
  status: EmployeeStatus;
  pan_masked: string | null;
  bank_account_last4: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
}

export interface EmployeeWriteRequest {
  full_name: string;
  work_email: string;
  employee_code?: string;
  manager_id?: number | null;
  company_id: number;
  department_id?: number | null;
  designation_id?: number | null;
  grade_id?: number | null;
  location_id?: number | null;
  date_of_joining: string;
  pan?: string;
  bank_account?: string;
  bank_ifsc?: string;
  custom_fields?: Record<string, unknown>;
}
