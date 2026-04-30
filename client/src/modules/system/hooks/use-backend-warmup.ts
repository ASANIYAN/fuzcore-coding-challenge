import { useEffect } from "react";
import { unauthApi } from "@/services/api-service";

export function useBackendWarmup() {
  useEffect(() => {
    void unauthApi.get("/currencies").catch(() => {
      // Warmup is best-effort only.
    });
  }, []);
}
