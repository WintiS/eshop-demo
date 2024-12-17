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

const products = [
  {
    id: 1,
    name: "Zabiják Chřipky",
    price: 399,
    image:
      "https://pilulkacz.vshcdn.net/zoh4eiLi/IMG/86400/vEQGAhul5Y-XxdfIu9Je0ANJ6_8-GPmeSdpEIaybuGM/trim:0:ffffff,ff00ff/aHR0cHM6Ly9waWx1bGthLnMzLWNlbnRyYWwudnNob3N0aW5nLmNsb3VkL3BpbHVsa2EtY3ovZmlsZXMvaW1hZ2VzLzIwMjMtMDkvbWRfOTk2MDFhZDUxMGM3ZGQyOGM0ZjdlMjcwNDk2MmM1YjkucG5n.png",
    idRemove: 1,
  },
  {
    id: 2,
    name: "Stop Rýmě",
    price: 599,
    image:
      "https://pilulkacz.vshcdn.net/zoh4eiLi/IMG/86400/I87yOWxpov9fq_pcas6-57y_J4Ch5tmhsGySuSAvD_I/trim:0:ffffff,ff00ff/aHR0cHM6Ly9waWx1bGthLnMzLWNlbnRyYWwudnNob3N0aW5nLmNsb3VkL3BpbHVsa2EtY3ovZmlsZXMvaW1hZ2VzLzIwMjQtMTEvbWRfYjUxMzRlYWZjMTM2YThmZjVhZTYwOWMzZGFhNzFmOGIucG5n.png",
    idRemove: 2,
  },
  {
    id: 3,
    name: "Posilovač Imunity",
    price: 199,
    image:
      "https://pilulkacz.vshcdn.net/zoh4eiLi/IMG/86400/-kFcYaEVCy5XODMj6gKnOMFhGcBD-yXNNZzHrDRYJGA/trim:0:ffffff,ff00ff/aHR0cHM6Ly9waWx1bGthLnMzLWNlbnRyYWwudnNob3N0aW5nLmNsb3VkL3Ztcy1wcm9kLWNzL3Ztcy9wcm9kdWN0L2xpc3RpbmcvMjAyMy8xMS95dXp1MjAwMDcyX2RwaTE1MDBweF93ZWJfNjU1YjdhMjAxYmViODEuNzQ3MzQ5MTQucG5n.png",
    idRemove: 3,
  },
];
export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  idRemove: number;
}

// Initialize Stripe with your secret key
const stripe = new Stripe(
  "sk_test_51Lf2bJId5pvSd0Z66KZ3LiimkDxwoKdEShuQCGgwWF2ok7qaBLXk7snF6dGOiNgfMAC3oP18I0glFXlLchka4i3q00YyM7rnbl",
  {
    apiVersion: "2024-11-20.acacia", // Use the latest Stripe API version
  },
);

// Define the server function
export const createCheckoutSession = server$(async (cartItems) => {
  try {
    // Map cart items to Stripe line items
    const lineItems = cartItems.map((item: Product) => ({
      price_data: {
        currency: "czk",
        product_data: {
          name: item.name,
          description: item.id,
        },
        unit_amount: item.price * 100,
      },
      quantity: 1,
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
  const cart = useSignal<Product[]>([]); // Reactive array

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      cart.value = JSON.parse(savedCart);
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => cart.value); // Re-run whenever cart.value changes
    localStorage.setItem("cart", JSON.stringify(cart.value));
  });

  const addItem = $((product: Product) => {
    const newItem: Product = {
      ...product,
      idRemove: Date.now(), // Generate a unique ID using the current timestamp
    };
    cart.value = [...cart.value, newItem];
  });

  const removeItem = $((id: number) => {
    cart.value = cart.value.filter((item) => item.idRemove !== id); // Remove item by id
  });

  const totalPrice = useComputed$(() => {
    return cart.value.reduce((total, product) => total + product.price, 0);
  });
  return (
    <>
      <div class={"flex items-center justify-around pt-24"}>
        {products.map((product) => {
          return (
            <div
              key={product.id}
              class={
                "w-64 cursor-pointer rounded-xl bg-gray-100 py-8 transition hover:bg-gray-200"
              }
            >
              <div class={"mb-2 flex h-56 items-end justify-center"}>
                <img src={product.image} width={80} height={0} />
              </div>
              <div class={"flex flex-col items-center "}>
                <p class={" text-lg"}>{product.name}</p>
                <p class={"mb-4 text-green-800"}>{product.price} Kč</p>
                <button
                  onClick$={() => {
                    addItem(product);
                  }}
                  class={
                    "rounded-lg border-2 border-green-700  px-3 py-2 text-sm text-green-800 transition hover:bg-green-700 hover:text-white"
                  }
                >
                  Přidat do košíku
                </button>
              </div>
            </div>
          );
        })}
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
              {cart.value.map((product: Product) => {
                return (
                  <div
                    key={product.idRemove}
                    class={
                      "w-48 cursor-pointer rounded-xl bg-gray-100 py-4 transition hover:bg-gray-200"
                    }
                  >
                    <div class={"mb-2 flex h-32 items-end justify-center"}>
                      <img src={product.image} width={60} height={0} />
                    </div>
                    <div class={"flex flex-col items-center "}>
                      <p class={" text-lg"}>{product.name}</p>
                      <p class={"mb-4 text-green-800"}>{product.price} Kč</p>
                      <button
                        onClick$={() => {
                          removeItem(product.idRemove);
                        }}
                        class={
                          "rounded-lg border-2 border-red-700  px-3 py-2 text-sm text-red-800 transition hover:bg-red-700 hover:text-white"
                        }
                      >
                        Odebrat z košíku
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                    console.log("Button clicked"); // Add this to confirm the click is detected
                    const { url } = await createCheckoutSession(cart.value);
                    if (url) {
                      window.location.href = url;
                    } else {
                      console.error("URL is null");
                      alert("An error occurred. Please try again.");
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
