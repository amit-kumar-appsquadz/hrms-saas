"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/api/client";

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: { message: string; requestId?: string } | undefined;
  reload: () => void;
}

/**
 * Standard async data hook. Centralizes loading/error/content so every data
 * view honors the four-states contract (PRODUCT_UI_SPEC). Normalizes
 * ApiRequestError into a message + request_id for the ErrorState.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AsyncState<T>["error"]>();
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    run()
      .then((result) => {
        if (!cancelled && mounted.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || !mounted.current) return;
        if (err instanceof ApiRequestError) {
          setError({ message: err.message, requestId: err.requestId });
        } else if (err instanceof Error) {
          setError({ message: err.message });
        } else {
          setError({ message: "Unexpected error." });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
