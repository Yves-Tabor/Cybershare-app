export const AUTH_NOTICE_KEY = "cybershare_auth_notice";
export const DEFAULT_AUTH_NOTICE = "register to use Cybershare!";

export function setAuthNotice(message = DEFAULT_AUTH_NOTICE) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_NOTICE_KEY, message);
}

export function consumeAuthNotice() {
  if (typeof window === "undefined") return "";
  const message = window.sessionStorage.getItem(AUTH_NOTICE_KEY) || "";
  if (message) {
    window.sessionStorage.removeItem(AUTH_NOTICE_KEY);
  }
  return message;
}

export function redirectToWelcomeAuth(navigate, message = DEFAULT_AUTH_NOTICE) {
  setAuthNotice(message);
  navigate("/#p-auth", { replace: true });
}
