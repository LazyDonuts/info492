// Disclosure navigation: ordinary links retain familiar Tab behavior.
export function initDemoMenus(root = document) {
  root.querySelectorAll("[data-demo-menu]").forEach((host) => {
    const trigger = host.querySelector("button"),
      panel = host.querySelector("[data-demo-panel]");
    let timer,
      keyboardOpen = false;
    const links = () => [...panel.querySelectorAll("a")];
    const setOpen = (open) => {
      clearTimeout(timer);
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (!open) keyboardOpen = false;
    };
    host.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") {
        keyboardOpen = false;
        setOpen(true);
      }
    });
    host.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && !keyboardOpen)
        timer = setTimeout(() => {
          if (panel.contains(root.activeElement)) trigger.focus();
          setOpen(false);
        }, 150);
    });
    trigger.addEventListener("click", (e) => {
      keyboardOpen = e.detail === 0;
      setOpen(panel.hidden);
    });
    host.addEventListener("focusout", () =>
      setTimeout(() => {
        if (!host.contains(root.activeElement)) setOpen(false);
      }, 0),
    );
    host.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.focus();
        e.preventDefault();
      }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        keyboardOpen = true;
        e.preventDefault();
        setOpen(true);
        const items = links(),
          current = items.indexOf(root.activeElement);
        const index =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? items.length - 1
              : e.key === "ArrowDown"
                ? (current + 1) % items.length
                : current <= 0
                  ? items.length - 1
                  : current - 1;
        items[index]?.focus();
      }
    });
    panel.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    root.addEventListener("pointerdown", (e) => {
      if (!host.contains(e.target)) setOpen(false);
    });
  });
}
if (typeof document !== "undefined") initDemoMenus();
