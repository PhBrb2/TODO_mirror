import { VERSION } from "./game-constants.js";

if ("serviceWorker" in navigator && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./sw.js?v=${VERSION}`).catch(() => {});
  });
}
