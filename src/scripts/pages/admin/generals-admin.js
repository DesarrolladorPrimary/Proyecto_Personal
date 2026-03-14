const NOTIFICATIONS_KEY = "adminNotificationsEnabled";

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("admin-notifications-toggle");
  const saveButton = document.querySelector(".settings-footer__delete-btn");

  if (!toggle) {
    return;
  }

  const storedValue = localStorage.getItem(NOTIFICATIONS_KEY);
  toggle.checked = storedValue == null ? true : storedValue === "true";

  const persistPreference = () => {
    localStorage.setItem(NOTIFICATIONS_KEY, String(toggle.checked));
  };

  toggle.addEventListener("change", persistPreference);
  saveButton?.addEventListener("click", persistPreference);
});
