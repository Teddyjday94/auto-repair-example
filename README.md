# Bay Nine Auto Works (concept site)

A four-page website for a fictional independent auto repair shop. Plain HTML, CSS and JavaScript with no build step and no dependencies apart from Google Fonts.

**To run it:** open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

## Pages
| Page | What's on it |
|---|---|
| `index.html` (Home) | Tachometer hero, shop-floor board, "how a visit works", links to the other pages, reviews |
| `services.html` | Car diagram explorer, warning-light decoder, price board, FAQ |
| `book.html` | Booking ticket with live repair order, and "what happens after you click" |
| `contact.html` | Map, live open/closed hours, quick question form, before-you-come info |

"Book this service" on the Services page opens `book.html?svc=…` with that service already checked.

## Online scheduling (Tekmetric-ready)
Tekmetric is the shop-management system most worth designing around. It's the fastest-growing platform among independent US shops (12,000+), and its Online Booking tool can be embedded on a website or opened from a direct link. The site is set up around that workflow: booking → repair order → text confirmation → digital inspection photos → text-to-pay.

At the top of `script.js`:
```js
const SCHEDULER = { name: "Tekmetric", url: "" };
```
- `url` empty: the custom booking ticket runs in demo mode.
- `url` set to the shop's booking link (Tekmetric → Settings → Online Booking → Get Code): `book.html` embeds the live scheduler in place of the demo form.
- Prefer Tekmetric's own overlay? Paste its embed snippet into the `<body>` of each page and add its button tag to the "Book a bay" buttons.
- Another platform (Shopmonkey, AutoLeap, Mitchell 1) works the same way: change `name` and `url`.

## Features
- **Hero tachometer:** the needle sweeps on load, then revs as you scroll. An odometer counts up the number of cars fixed.
- **Shop floor board:** live-style status for each bay, with progress bars.
- **Car explorer:** a blueprint car that draws itself in. Tap a service zone to see the price and time; "Book this service" pre-fills the booking form.
- **Warning-light decoder:** an instrument cluster. Pick a light to see how urgent it is, a severity meter, and what to do next.
- **Price board:** a posted menu with dotted price leaders and the labor rate.
- **Booking (demo):** a 4-step work-order form (vehicle → service → date/time → contact) with a calendar, available time slots and validation. A live "repair order" ticket fills in as you type.
- **Reviews** you can drag to scroll, an **FAQ**, a **stylized map**, **hours that show whether the shop is open now**, and a quick-question form.
- A sticky call/book bar on mobile, a scroll "fuel gauge", and support for `prefers-reduced-motion`.

## Making it real for a client
- Swap the name, address, phone and hours in `index.html`, and the `HOURS` constant in `script.js`.
- Prices, bays, services and warning lights are data arrays at the top of each section in `script.js`.
- Set `SCHEDULER.url` to make booking live. The quick-question form still only shows a confirmation on the page; connect it to email or Formspree.
- The header, footer and mobile bar are repeated in each page. If you change one, change all four.
