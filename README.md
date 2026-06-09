# The Scarlet Diaries — V2.2 Food UX Rebuild

This build focuses on the most important part of the app: Before I Eat and adding food.

## What changed

- Removed the confusing Big Food Database UX.
- Added `foods.json`, a clean app-ready starter food database.
- Food selection is now tap-first, not typing-first.
- Before I Eat is now:
  1. Check sugar
  2. Choose food group
  3. Choose food
  4. Choose portion
  5. Add hidden carbs with portions
  6. See suggested Apidra
  7. Adult confirmed / save
- Food cards have clear Choose buttons.
- Portion choices: Small / Usual / Large / Custom.
- Hidden carbs now have portions:
  - A little
  - Some
  - A lot
- Buttons now visibly press/move.
- Add buttons show Adding… and Added feedback.
- Adult Confirmed in Before I Eat is patched with Saving meal… feedback.
- Food & Carb Library now uses the same simplified categories.

## Food source note

The included `foods.json` is a cleaned starter database designed for Amara’s UX. It is structured so USDA FoodData Central foods can be added later in the same format, but it is not the full raw USDA dataset inside the app.

USDA full downloads are too large and messy for child-facing search. The correct approach is to clean selected foods into `foods.json`.
