# Tracking setup

Everything is configured in **Admin → Tracking**. Fields you leave blank load
nothing. Why it's built this way: `docs/decisions/0038-tracking-rebuild.md`.

## What runs when

| Platform                      | Loads                    | Respects cookie choice                          |
| ----------------------------- | ------------------------ | ----------------------------------------------- |
| Google Tag Manager, GA4, Ads  | On every page            | Yes, through Consent Mode v2 (defaults: denied) |
| Meta, TikTok, Pinterest, Snap | After marketing consent  | Yes, nothing loads before it                    |
| Clarity, Hotjar               | After analytics consent  | Yes, nothing loads before it                    |
| Custom code boxes             | On every page, as pasted | **No.** Don't paste tracking tags here          |

After **Reject all**, nothing is added to the data layer and no event is logged.

## Use GTM or the GA4 field, not both

If GA4 is set up inside your GTM container, leave **Google Analytics 4 ID**
blank, otherwise every event is counted twice. The same goes for Google Ads.

## Data layer events (for GTM)

Ecommerce events follow GA4's format exactly, and the previous `ecommerce`
object is cleared before each push. Every event also carries `event_id`.

| Event               | When                            | `ecommerce` contains                           |
| ------------------- | ------------------------------- | ---------------------------------------------- |
| `view_item_list`    | Shop, category, brand page      | `item_list_name`, `items`                      |
| `select_item`       | A product is opened from a list | `item_list_name`, `items`                      |
| `view_item`         | Product page                    | `currency`, `value`, `items`                   |
| `add_to_cart`       | Added to cart                   | `currency`, `value`, `items`                   |
| `remove_from_cart`  | Removed from cart               | `currency`, `value`, `items`                   |
| `view_cart`         | Cart page                       | `currency`, `value`, `items`                   |
| `add_to_wishlist`   | Added to wishlist               | `currency`, `value`, `items`                   |
| `begin_checkout`    | Checkout page                   | `currency`, `value`, `items`                   |
| `add_shipping_info` | Order submitted                 | `shipping_tier`, `items`                       |
| `add_payment_info`  | Order submitted                 | `payment_type`, `items`                        |
| `purchase`          | Order success page, once        | `transaction_id`, `value`, `shipping`, `items` |

Not ecommerce, with their fields at the top level: `page_view` (`page_path`,
`page_title`, `page_location`, on every navigation), `search` (`search_term`),
`sign_up` and `login` (`method`), `generate_lead` (`channel`).

`item_id` is the variant SKU, the same id the Facebook and Google feeds publish,
so catalog ads match.

### GA4 inside GTM

1. Add a **Google tag** with your `G-` ID, firing on Initialization - All Pages.
2. Create a Custom Event trigger with this regular expression:
   `view_item_list|select_item|view_item|add_to_cart|remove_from_cart|view_cart|add_to_wishlist|begin_checkout|add_shipping_info|add_payment_info|purchase`
3. Add a **GA4 Event** tag: event name `{{Event}}`, tick **Send Ecommerce data**
   with the Data Layer source, fire on that trigger.
4. Page views: keep Enhanced Measurement's "page changes based on browser history
   events" on, and don't also fire a tag from the `page_view` data layer event.
5. Any Meta or TikTok tag you add in GTM won't follow cookie consent by itself:
   use the ID fields in admin for those instead. They are also what deduplicates
   browser and server events.

## Server-side events

With a Meta token or TikTok token saved, these also go from the server, using
the browser event's id so the platform counts them once: ViewContent, AddToCart,
AddToWishlist, InitiateCheckout, AddPaymentInfo, Search, CompleteRegistration,
Lead, and Purchase. Only shoppers who accepted marketing cookies are relayed,
except Purchase, which is sent from the order itself.

**Admin → Tracking → Conversions API sends** shows each send. A failed one shows
the platform's own error message and retries daily, up to 5 times.

## Testing

- **Meta:** copy the code from Events Manager → Test events into **Meta test
  event code**, save, then browse the site. Clear it afterwards: events sent with
  a test code don't count towards your ads.
- **TikTok:** same, with **TikTok test event code**.
- **GTM:** use Tag Assistant / Preview mode.
- **GA4:** Admin → DebugView.

## Search Console

Use the **HTML tag** method: paste the whole tag into **Search Console
verification**, then press Verify. The "Google Tag Manager" verification method
may fail, because it requires GTM's noscript to be the very first thing in
`<body>` and Next.js always renders its own empty element first.
