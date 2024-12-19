import {
  component$,
  useSignal,
  $,
  useVisibleTask$,
  useComputed$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import Stripe from "stripe";
import { server$ } from "@builder.io/qwik-city";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  addedToCart: boolean;
  quantity: number;
}

// Initialize Stripe with your secret key
const stripe = new Stripe(
  "sk_test_51Lf2bJId5pvSd0Z66KZ3LiimkDxwoKdEShuQCGgwWF2ok7qaBLXk7snF6dGOiNgfMAC3oP18I0glFXlLchka4i3q00YyM7rnbl",
  {
    apiVersion: "2024-11-20.acacia", // Use the latest Stripe API version
  },
);

// Define the server function
export const createCheckoutSession = server$(async (cartItems: Product[]) => {
  try {
    // Map cart items to Stripe line items
    const lineItems = cartItems.map((item) => ({
      price_data: {
        currency: "czk",
        product_data: {
          name: item.name,
          description: item.id.toString(),
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url:
        "https://your-domain.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://your-domain.com/cancel",
    });

    // Return the session URL to the client
    return { url: session.url };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    throw new Error("Failed to create checkout session");
  }
});

export default component$(() => {
  const products = useSignal<Product[]>([]);
  const isLoading = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      // Fetch products
      const querySnapshot = await getDocs(collection(db, "products"));
      const fetchedProducts: Product[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          price: data.price,
          image: data.image,
          addedToCart: false, // Initialize as not in cart
          quantity: 0, // Initialize quantity to 0
        };
      });

      // Load cart state from local storage after products are fetched
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        const cartState = JSON.parse(savedCart);
        // Update fetched products with cart state
        cartState.forEach(
          ({ id, quantity }: { id: number; quantity: number }) => {
            const product = fetchedProducts.find((p) => p.id === id);
            if (product) {
              product.addedToCart = true;
              product.quantity = quantity;
            }
          },
        );
      }

      // Update products.value with the fetched and updated products
      products.value = fetchedProducts;
      localStorage.setItem("cart", JSON.stringify(fetchedProducts));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() =>
      products.value.map((p) => ({
        id: p.id,
        addedToCart: p.addedToCart,
        quantity: p.quantity,
        image: p.image,
        name: p.name,
        price: p.price,
      })),
    );

    const cartState = products.value
      .filter((p) => p.addedToCart)
      .map((p) => ({
        id: p.id,
        quantity: p.quantity,
        image: p.image,
        name: p.name,
        price: p.price,
        addedToCart: p.addedToCart,
      }));

    localStorage.setItem("cart", JSON.stringify(cartState));
  });

  const addToCart = $((productId: number) => {
    const index = products.value.findIndex((p) => p.id === productId);
    if (index !== -1) {
      const product = products.value[index];
      if (!product.addedToCart) {
        const updatedProduct = { ...product, addedToCart: true, quantity: 1 };
        products.value = [
          ...products.value.slice(0, index),
          updatedProduct,
          ...products.value.slice(index + 1),
        ];
      }
    }
  });

  const removeFromCart = $((productId: number) => {
    const index = products.value.findIndex((p) => p.id === productId);
    if (index !== -1) {
      const product = products.value[index];
      if (product.addedToCart) {
        const updatedProduct = { ...product, addedToCart: false, quantity: 0 };
        products.value = [
          ...products.value.slice(0, index),
          updatedProduct,
          ...products.value.slice(index + 1),
        ];
      }
    }
  });

  const increaseQuantity = $((productId: number) => {
    const index = products.value.findIndex((p) => p.id === productId);
    if (index !== -1) {
      const product = products.value[index];
      if (product.addedToCart) {
        const updatedProduct = { ...product, quantity: product.quantity + 1 };
        products.value = [
          ...products.value.slice(0, index),
          updatedProduct,
          ...products.value.slice(index + 1),
        ];
      }
    }
  });
  const decreaseQuantity = $((productId: number) => {
    const productIndex = products.value.findIndex((p) => p.id === productId);
    if (productIndex !== -1) {
      const product = products.value[productIndex];
      if (product.addedToCart && product.quantity > 1) {
        product.quantity -= 1;
      } else {
        removeFromCart(productId);
      }
      products.value = [...products.value];
    }
  });

  const cartProducts = useComputed$(() => {
    return products.value.filter((product) => product.addedToCart);
  });
  const totalPrice = useComputed$(() => {
    return cartProducts.value.reduce(
      (total, product) => total + product.price * product.quantity,
      0,
    );
  });
  return (
    <>
      <div class={"flex items-center justify-around pt-24"}>
        {products.value.length === 0 ? (
          <p>Loading products...</p>
        ) : (
          products.value.map((product) => (
            <div
              key={product.id}
              class="w-64 cursor-pointer rounded-xl bg-gray-100 py-8 transition hover:bg-gray-200"
            >
              <div class="mb-2 flex h-56 items-end justify-center">
                <img src={product.image} width={80} height={0} />
              </div>
              <div class="flex flex-col items-center">
                <p class="text-lg">{product.name}</p>
                <p class="mb-4 text-green-800">{product.price} Kč</p>
                {product.addedToCart ? (
                  <button
                    onClick$={() => removeFromCart(product.id)}
                    class="rounded-lg border-2 border-red-700 px-3 py-2 text-sm text-red-800 transition hover:bg-red-700 hover:text-white"
                  >
                    Odebrat z košíku
                  </button>
                ) : (
                  <button
                    onClick$={() => addToCart(product.id)}
                    class="rounded-lg border-2 border-green-700 px-3 py-2 text-sm text-green-800 transition hover:bg-green-700 hover:text-white"
                  >
                    Přidat do košíku
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div class={"px-12 pb-12 pt-48"}>
        <div class={"rounded-xl bg-gray-50 pb-12 pt-12"}>
          <div class={"flex justify-center text-xl"}>
            <h2>Váš košík</h2>
          </div>
          <div class={"flex items-stretch justify-center"}>
            <div
              class={
                "flex  flex-wrap items-center justify-start gap-3 px-6 pt-6"
              }
            >
              {cartProducts.value.length === 0 ? (
                <p>Košík je prázdný</p>
              ) : (
                cartProducts.value.map((product) => (
                  <div
                    key={product.id}
                    class="w-48 cursor-pointer rounded-xl bg-gray-100 py-4 transition hover:bg-gray-200"
                  >
                    <div class="mb-2 flex h-32 items-end justify-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        width={60}
                        height={0}
                      />
                    </div>
                    <div class="flex flex-col items-center">
                      <p class="text-lg font-bold">{product.name}</p>
                      <p class="text-sm text-gray-600">
                        Cena za kus: {product.price} Kč
                      </p>
                      <div class="mb-4 flex items-center">
                        <button
                          onClick$={() => decreaseQuantity(product.id)}
                          class="rounded-lg  px-2 text-red-500"
                        >
                          -
                        </button>
                        <span class="px-2 text-sm">{product.quantity} ks</span>
                        <button
                          onClick$={() => increaseQuantity(product.id)}
                          class="rounded-lg   px-2 text-green-500"
                        >
                          +
                        </button>
                      </div>
                      <p class="text-sm font-semibold text-green-800">
                        Celková cena: {product.price * product.quantity} Kč
                      </p>
                      <button
                        onClick$={() => removeFromCart(product.id)}
                        class="mt-2 rounded-lg border-2 border-red-700 px-3 py-1 text-sm text-red-800 transition hover:bg-red-700 hover:text-white"
                      >
                        Odebrat z košíku
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {isLoading.value && (
              <div class="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75">
                <div class="h-16 w-16 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
              </div>
            )}
            <div class={"flex w-1/3 justify-center px-3 pt-6"}>
              <div class={"mt-14"}>
                <div class={"text-center"}>
                  <p class={"mb-4 text-xl"}>Celkový součet</p>
                  <p class={"text-lg font-bold text-green-700"}>
                    {totalPrice.value.toFixed(2)} Kč
                  </p>
                </div>
                <button
                  class={
                    "rounded-lg border-2 border-green-700  px-14 py-2 text-lg text-green-800 transition hover:bg-green-700 hover:text-white"
                  }
                  onClick$={$(async () => {
                    console.log("Button clicked");
                    isLoading.value = true; // Show the loading indicator

                    try {
                      const { url } = await createCheckoutSession(
                        cartProducts.value,
                      );
                      if (url) {
                        window.location.href = url;
                      } else {
                        console.error("URL is null");
                        alert("An error occurred. Please try again.");
                        isLoading.value = false;
                      }
                    } catch (error) {
                      console.error("An error occurred:", error);
                      alert("An unexpected error occurred. Please try again.");
                      isLoading.value = false;
                    }
                  })}
                >
                  Objednat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Zdravotni balicky",
  meta: [
    {
      name: "description",
      content: "Zdravotni balicky pro kazdeho",
    },
  ],
};
