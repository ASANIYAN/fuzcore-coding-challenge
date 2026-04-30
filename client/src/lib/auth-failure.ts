export const LOGIN_ROUTE = "/login";

export type AuthFailureReason = "unauthorized" | "forbidden";

export type AuthFailureEventDetail = {
  reason: AuthFailureReason;
  message: string;
};

export const AUTH_FAILURE_EVENT = "fuzcore:auth-failure";

const AUTH_FAILURE_MESSAGES: Record<AuthFailureReason, string> = {
  unauthorized: "Your session has expired. Please log in again.",
  forbidden: "You do not have permission to perform this action.",
};

let lastAuthEventAt = 0;

export const getAuthFailureMessage = (reason: AuthFailureReason): string => {
  return AUTH_FAILURE_MESSAGES[reason];
};

export const notifyAuthFailure = (reason: AuthFailureReason) => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastAuthEventAt < 1200) return;
  lastAuthEventAt = now;

  window.dispatchEvent(
    new CustomEvent<AuthFailureEventDetail>(AUTH_FAILURE_EVENT, {
      detail: {
        reason,
        message: getAuthFailureMessage(reason),
      },
    }),
  );
};

