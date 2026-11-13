const form = document.getElementById("signin-form");
const error = document.getElementById("signin-error");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const role = new FormData(form).get("role");
  try {
    sessionStorage.setItem("info492-role-session", JSON.stringify({ role }));
    window.location.assign("workspace.html");
  } catch {
    error.textContent = "Enable browser storage to enter the demo workspace.";
    error.hidden = false;
  }
});
