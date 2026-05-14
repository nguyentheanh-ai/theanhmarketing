export type CartItem = {
  slug: string;
  title: string;
  price: string;
};

export type CartAction = "add" | "remove" | "clear" | "sync";

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

function writeCart(items: CartItem[], action: CartAction) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(cartKey, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent<CartAction>(cartEvent, { detail: action }));
}

export function addToCart(item: CartItem) {
  const current = readCart();

  if (current.some((course) => course.slug === item.slug)) {
    return current;
  }

  const next = [...current, item];
  writeCart(next, "add");
  return next;
}

export function removeFromCart(slug: string) {
  const next = readCart().filter((item) => item.slug !== slug);
  writeCart(next, "remove");
  return next;
}

export function clearCart() {
  writeCart([], "clear");
}

export function subscribeCart(listener: (action?: CartAction) => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleCartEvent = (event: Event) => {
    listener(event instanceof CustomEvent ? event.detail : "sync");
  };
  const handleStorageEvent = () => listener("sync");

  window.addEventListener(cartEvent, handleCartEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(cartEvent, handleCartEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
