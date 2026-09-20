// Picking up a new deploy without being asked to force-quit the app.
//
// The service worker is built with skipWaiting and clientsClaim, so a new
// version takes control the moment it is found. What was missing is both ends
// of that: nothing looked for a new version while the app stayed open, and
// nothing reloaded the page once one took over. An installed PWA that is never
// fully closed could therefore run a build from days ago — which is exactly
// what happened twice while the payday work was shipping.
//
// Update checks happen when the app comes back to the foreground, which is
// also when refetchAll runs, so the two stay in step. The reload waits for the
// same moment rather than happening mid-use: pulling the page out from under
// someone typing an expense would be worse than being a few minutes stale.

let reloading = false;

export function watchForUpdates() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

  // No controller at startup means this is the first install. The worker
  // claiming the page then is expected, not an update, and reloading would be
  // a pointless flash — or a loop.
  const hadControllerAtStart = Boolean(navigator.serviceWorker.controller);
  let updateReady = false;

  function onControllerChange() {
    if (!hadControllerAtStart) return;
    updateReady = true;
    // Already in the background: reload now, so returning to the app is
    // instant rather than reloading in front of the person.
    if (document.visibilityState === 'hidden') reloadOnce();
  }

  function reloadOnce() {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  }

  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    if (updateReady) {
      reloadOnce();
      return;
    }
    // Ask whether there is a newer build. With skipWaiting this is enough to
    // start the swap; controllerchange then tells us it happened.
    navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  }

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
  };
}
