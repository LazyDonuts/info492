import test from "node:test";
import assert from "node:assert/strict";
import { initDemoMenus } from "../js/demo-menu.js";
// Minimal DOM adapter: real production handlers, standard EventTarget events.
// Browser smoke checks cover layout and native keyboard button activation.
function harness() {
  const root = new EventTarget(),
    host = new EventTarget(),
    trigger = new EventTarget(),
    panel = new EventTarget(),
    a = new EventTarget(),
    b = new EventTarget();
  root.activeElement = null;
  root.querySelectorAll = () => [host];
  host.querySelector = (s) => (s === "button" ? trigger : panel);
  host.contains = (el) => [trigger, panel, a, b].includes(el);
  panel.contains = (el) => [a, b].includes(el);
  panel.querySelectorAll = () => [a, b];
  trigger.attributes = {};
  trigger.setAttribute = (k, v) => (trigger.attributes[k] = v);
  trigger.focus = () => (root.activeElement = trigger);
  a.focus = () => (root.activeElement = a);
  b.focus = () => (root.activeElement = b);
  panel.hidden = true;
  initDemoMenus(root);
  const fire = (el, type, props = {}) => {
    const e = new Event(type, { cancelable: true });
    for (const [k, v] of Object.entries(props))
      Object.defineProperty(e, k, { value: v });
    el.dispatchEvent(e);
  };
  return { root, host, trigger, panel, a, b, fire };
}
test("menu mouse hover remains open across reentry, closes on leaving, and exposes aria state", async () => {
  const h = harness();
  h.fire(h.host, "pointerenter", { pointerType: "mouse" });
  assert.equal(h.panel.hidden, false);
  assert.equal(h.trigger.attributes["aria-expanded"], "true");
  h.fire(h.host, "pointerleave", { pointerType: "mouse" });
  h.fire(h.host, "pointerenter", { pointerType: "mouse" });
  await new Promise((r) => setTimeout(r, 170));
  assert.equal(h.panel.hidden, false);
  h.root.activeElement = h.trigger;
  h.fire(h.host, "pointerleave", { pointerType: "mouse" });
  await new Promise((r) => setTimeout(r, 170));
  assert.equal(h.panel.hidden, true);
});
test("touch relies on click, keyboard arrows wrap, Escape restores trigger and outside click closes", () => {
  const h = harness();
  h.fire(h.host, "pointerenter", { pointerType: "touch" });
  assert.equal(h.panel.hidden, true);
  h.fire(h.trigger, "click", { detail: 1 });
  assert.equal(h.panel.hidden, false);
  h.fire(h.trigger, "click", { detail: 1 });
  assert.equal(h.panel.hidden, true);
  h.trigger.focus();
  h.fire(h.host, "keydown", { key: "ArrowDown" });
  assert.equal(h.root.activeElement, h.a);
  h.fire(h.host, "keydown", { key: "ArrowUp" });
  assert.equal(h.root.activeElement, h.b);
  h.fire(h.host, "keydown", { key: "Escape" });
  assert.equal(h.panel.hidden, true);
  assert.equal(h.root.activeElement, h.trigger);
  h.fire(h.trigger, "click", { detail: 0 });
  h.fire(h.root, "pointerdown");
  assert.equal(h.panel.hidden, true);
});
