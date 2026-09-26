# Life OS visual redesign

## Intent

Make Life OS enjoyable to open every day while keeping its existing workflows and real data. The approved visual direction is a dark personal cockpit: midnight navy surfaces, electric blue and cyan accents, quiet illuminated borders, and one mountain and lake image in the home hero. The home page is a daily orientation screen, not a module directory.

## Home page

- Hero: `Danas`, the prominent message `Danas biram napredak.`, three short daily focus prompts, and a larger `Bolja verzija mene. Svaki dan.` message at the right of the landscape. These prompts are editorial copy, not stored user goals.
- Navike: today's scheduled habits and completion, linked to `/habits`; no invented progress or hardcoded habit names.
- Finansijski ciljevi: active savings goals and progress from the finance read model, linked to `/finance/goals`. No finance chart.
- Današnji plan: today's scheduled task actions and selected Google Calendar events, linked to `/calendar`; no top-three task widget.
- Lower right: a text-only motivational card on a simple dark surface. No second landscape image.
- Empty states show a useful route to create the first item. No focus timer or weather on the home page.

## Application-wide system

- Shared dark blue tokens power the root layout and shadcn controls. Preserve light mode as an accessible alternative, but default to dark.
- Desktop sidebar and mobile drawer use the same section list, clear active state, and consistent labels. Keep all existing destinations reachable.
- Page headings, cards, links, buttons, forms, and finance surfaces should follow the same spacing, radii, borders, and blue accents. Existing business behavior stays intact.
- Reduce motion for users who request it, maintain keyboard focus visibility and readable contrast, and keep the dashboard usable at mobile widths.

## Technical boundaries

- Keep server data loading in the App Router page/read model; use client components only for existing interactions.
- Reuse existing habit and finance models and calendar integration. Do not add a database migration or new dependency.
- Store the generated landscape as a local static asset. The image carries no functional text.
- Apply the design in working slices: shell and home page first, then module surfaces and finance-specific styling.
