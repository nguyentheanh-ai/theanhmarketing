/** Start the checkout countdown immediately while the order request runs in parallel.
 * @param {(seconds: number) => void} onTick
 */
export function startCheckoutCountdown(onTick) {
  let seconds = 3;
  let settled = false;
  let cancelled = false;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {(completed: boolean) => void} */
  let finish = () => {};
  const done = new Promise(resolve => { finish = resolve; });
  onTick(seconds);
  const tick = () => {
    seconds -= 1;
    onTick(seconds);
    if (seconds === 0) { settled = true; finish(true); }
    else timer = setTimeout(tick, 1000);
  };
  timer = setTimeout(tick, 1000);
  return { done, get cancelled() { return cancelled; }, cancel() { cancelled = true; if (settled) return; settled = true; clearTimeout(timer); finish(false); } };
}
