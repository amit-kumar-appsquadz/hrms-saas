import type { Paginated } from "@/types/api";

/** Simulate a small network delay so loading/skeleton states are demonstrable. */
export function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Client-side pagination mirroring the server PaginatedEnvelope contract. */
export function paginate<T>(items: T[], page = 1, perPage = 25): Paginated<T> {
  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), total_pages);
  const start = (safePage - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    meta: { page: safePage, per_page: perPage, total, total_pages },
  };
}
