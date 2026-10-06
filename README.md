# Bay Nine Auto Works (concept site)

A one-page website for a fictional independent auto repair shop. Plain HTML, CSS and JavaScript with no build step and no dependencies apart from Google Fonts.

**To run it:** open `index.html` in a browser, or serve the folder (`python3 -m http.server`).

## What's on the page
- **Hero tachometer:** the needle sweeps on load, then revs as you scroll. An odometer counts up the number of cars fixed.
- **Shop floor board:** live-style status for each bay, with progress bars.
- **Car explorer:** a blueprint car that draws itself in. Tap a service zone to see the price and time; "Book this service" pre-fills the booking form.
- **Warning-light decoder:** an instrument cluster. Pick a light to see how urgent it is, a severity meter, and what to do next.
- **Price board:** a posted menu with dotted price leaders and the labor rate.
- **Booking:** a 4-step work-order form (vehicle → service → date/time → contact) with a calendar, available time slots and validation. A live "repair order" ticket fills in as you type.
- **Reviews** you can drag to scroll, an **FAQ**, a **stylized map**, **hours that show whether the shop is open now**, and a quick-question form.
- A sticky call/book bar on mobile, a scroll "fuel gauge", and support for `prefers-reduced-motion`.

## Making it real for a client
- Swap the name, address, phone and hours in `index.html`, and the `HOURS` constant in `script.js`.
- Prices, bays, services and warning lights are data arrays at the top of each section in `script.js`.
- The booking and question forms only show a confirmation on the page right now. Connect them to a backend, Formspree, or a scheduling API.
