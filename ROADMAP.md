# MealMate Roadmap

## Short-term

- Lock screen on
- Banana bread is approved, but make minor tweaks
- Add more recipes to the collection
- Finish the unfinished cookie recipe
- Revisit meal planner suggestion variety once more recipes are added (currently limited by having ~20 recipes in a few tight clusters)

## Medium-term

- **Meal planner** -- Port the Python `plan` command to the web so you can pick 2-3 meals and see a combined shopping list on your phone
- **Shopping list** -- Generate and check off items from selected recipes
- **Better search** -- Fuzzy matching, filter by cook time or servings
- **Share & copy** -- Native OS share sheet (Web Share API) on recipe detail pages for sharing via other apps, copying the link, or sending to notes apps. Also applies to the shopping list once implemented
- **Print-friendly view** -- Clean print stylesheet for recipe detail pages (no sidebar, no nav, just the recipe)
- **Ingredient breakdown** -- Show detailed per-recipe and combined ingredient lists on the meal planner (unique items, shared items, quantities) to help with shopping

### Meal planner improvements
- ~~**Desktop planner/recipes toggle**~~ Done
- ~~**Auto-lock first pick**~~ Done
- ~~**Planner tag filter**~~ Done (quick-exclude buttons for breakfast, sauces/condiments, desserts)
- ~~**Expanded ingredient view**~~ Done (plan-level breakdown below stats bar + per-slot expansion, both grouped by shared vs unique)
- **Clickable planner slots** -- Tapping a recipe in the planner should navigate to its detail page
- **Full tag filter** -- Expand the quick-exclude buttons to show all tags for finer control
- **Tag cleanup** -- Review and consolidate recipe tags (remove redundant/overlapping tags, standardise naming)

## Longer-term

- **Authentication** -- Gate write features (add/edit/import) behind auth so only you can modify recipes from the live site. Not needed for local dev since you can commit directly. Options to explore: GitHub OAuth (free, no backend), a simple shared secret/PIN, or Cloudflare Access
- **Add recipe UI** -- In-app form to create new recipes (title, ingredients, instructions, tags, etc.) that commits to the repo via GitHub API
- **Import recipe from URL** -- Paste a URL, extract structured data (JSON-LD Schema.org Recipe), and populate the add recipe form for review and tweaks before submitting. Needs a lightweight proxy (Cloudflare Worker free tier) to handle CORS
- **Recipe photos** -- Show photos on cards and detail pages, sourced from `recipes/photos/`
- **Serving size scaling** -- Adjust ingredient quantities based on desired servings
- **Offline editing** -- Create/edit recipes from the PWA even without internet, sync changes back to the repo when online. Requires IndexedDB for local storage and conflict resolution
- **Share via QR code** -- Generate a QR code for any recipe URL so someone nearby can scan and open it

## Ideas / Maybe

- Browser extension for one-click recipe import while browsing
- Nutrition info (API lookup based on ingredients)

