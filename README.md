# The Scarlet Diaries — V1.8 Correction Build

This build addresses the logged testing comments.

## Login fixes
- App no longer auto-opens straight to Amara on reload.
- Role validation added: an email must match its assigned roleKey/role.
- Wrong role selection is blocked.
- Login flow optimized to avoid repeatedly seeding starter data.

## Flow fixes
- Home button wording changed from “I’m Eating” to “Before I Eat.”
- High sugar flow now gives next steps and suggested correction from the saved family plan.
- Low sugar flow now gives next steps and no-insulin guidance.
- Symptoms flow now gives next steps after saving.
- Call My Circle flow now shows a clear finish screen.
- Badge modal has Continue and Back Home to prevent freezing.
- Save/add status messages added: Saving…, Saved, Adding…, Alert saved.

## Meal and food fixes
- Before I Eat computes suggested Apidra from glucose + food carbs + correction.
- Food results now have explicit Add buttons.
- Food database categories changed to:
  Favorites, Saved Foods, Meals, Rice/Bread/Grains, Snacks/Sweets, Fruits, Drinks, Hidden Carbs, Packaged Foods, Big Food Database.
- Filipino and Greek are no longer main categories; they should be tags.
- Food database has Edit buttons.
- Food edit allows name, category, portion, carbs, calories, tags, favorite.

## Diary fixes
- Scarlet Entry has “Something only I can name” for feelings.
- Prompt includes “I want to write this my own way…”
- My Scarlet Pages added for rereading saved entries.
