import { persistentAtom } from '@nanostores/persistent';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export const cartItems = persistentAtom<CartItem[]>('cart', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function addToCart(product: any) {
  const currentItems = cartItems.get();
  const existingItemIndex = currentItems.findIndex((item) => item.id === product.id);

  if (existingItemIndex > -1) {
    const updatedItems = [...currentItems];
    updatedItems[existingItemIndex].quantity += 1;
    cartItems.set(updatedItems);
  } else {
    cartItems.set([
      ...currentItems,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.mockup_url || product.image_url,
        quantity: 1,
      },
    ]);
  }
}

export function removeFromCart(id: string) {
  const currentItems = cartItems.get();
  cartItems.set(currentItems.filter((item) => item.id !== id));
}

export function clearCart() {
  cartItems.set([]);
}
