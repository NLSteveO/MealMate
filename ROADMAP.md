# MealMate Roadmap

## Short-term

- Lock screen on
- ~~Banana bread is approved, but make minor tweaks~~ Done
- Add more recipes to the collection
- Add photos for existing recipes
- Finish the unfinished cookie recipe
- Revisit meal planner suggestion variety once more recipes are added (currently limited by having ~20 recipes in a few tight clusters)

## Medium-term

- ~~**Meal planner**~~ Done
- ~~**Ingredient breakdown**~~ Done (plan-level and per-slot expansion, shared vs unique grouping)
- **Shopping list** -- Generate and check off items from selected recipes
- **Better search** -- Fuzzy matching, filter by cook time or servings
- **Share & copy** -- Native OS share sheet (Web Share API) on recipe detail pages for sharing via other apps, copying the link, or sending to notes apps. Also applies to the shopping list once implemented
- **Print-friendly view** -- Clean print stylesheet for recipe detail pages (no sidebar, no nav, just the recipe)

## Longer-term

- **Full tag filter** -- Expand the planner's quick-exclude buttons to show all tags for finer control
- **Tag cleanup** -- Review and consolidate recipe tags (remove redundant/overlapping tags, standardise naming)
- **Authentication** -- Gate write features (add/edit/import) behind auth so only you can modify recipes from the live site. Not needed for local dev since you can commit directly. Options to explore: GitHub OAuth (free, no backend), a simple shared secret/PIN, or Cloudflare Access
- **Add recipe UI** -- In-app form to create new recipes (title, ingredients, instructions, tags, etc.) that commits to the repo via GitHub API
- **Import recipe from URL** -- Paste a URL, extract structured data (JSON-LD Schema.org Recipe), and populate the add recipe form for review and tweaks before submitting. Needs a lightweight proxy (Cloudflare Worker free tier) to handle CORS
- ~~**Recipe photos**~~ Done (build pipeline and detail page rendering in place)
- **Serving size scaling** -- Adjust ingredient quantities based on desired servings
- **Offline editing** -- Create/edit recipes from the PWA even without internet, sync changes back to the repo when online. Requires IndexedDB for local storage and conflict resolution

## Ideas / Maybe

- Browser extension for one-click recipe import while browsing
- Nutrition info (API lookup based on ingredients)
