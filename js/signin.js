const form = document.getElementById("signin-form");
const error = document.getElementById("signin-error");
const roles = new Set(["submitter", "checker", "responder", "manager", "reader"]);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const email = String(values.get("email") || "").trim().toLowerCase();
  const role = String(values.get("role") || "");
  if (!email || !roles.has(role)) {
    error.textContent = "Enter a valid email address and choose a role.";
    error.hidden = false;
    return;
  }
  sessionStorage.setItem("info492-role-session", JSON.stringify({ email, role }));
  window.location.assign("demo3.html");
});
