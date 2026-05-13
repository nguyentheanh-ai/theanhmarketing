export type CartItem = {
  slug: string;
  title: string;
  price: string;
};

const cartKey = "tam-cart-courses";
const cartEvent = "tam:cart-updated";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCart(): CartItem[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(cartKey);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && item.slug && item.title);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(cartKey, JSON.stringify(items));
  window.dispatchEvent(new Event(cartEvent));
}

export function addToCart(item: CartItem) {
  const current = readCart();

  if (current.some((course) => course.slug === item.slug)) {
    return current;
  }

  const next = [...current, item];
  writeCart(next);
  return next;
}

export function removeFromCart(slug: string) {
  const next = readCart().filter((item) => item.slug !== slug);
  writeCart(next);
  return next;
}

export function clearCart() {
  writeCart([]);
}

export function subscribeCart(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(cartEvent, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(cartEvent, listener);
    window.removeEventListener("storage", listener);
  };
}
