"""Build script: converts recipes/*.md into web/data/recipes.json"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from mealmate.parser import load_all_recipes

RECIPES_DIR = Path(__file__).parent / "recipes"
OUTPUT_PATH = Path(__file__).parent / "web" / "data" / "recipes.json"


def recipe_to_dict(recipe):
    """Convert a Recipe to a JSON-serializable dictionary."""
    return {
        "slug": recipe.slug,
        "title": recipe.title,
        "servings": recipe.servings,
        "prep_time": recipe.prep_time,
        "cook_time": recipe.cook_time,
        "tags": recipe.tags,
        "ingredients": [
            {
                "item": ing.item,
                "amount": ing.amount,
                "unit": ing.unit,
                "display": str(ing),
            }
            for ing in recipe.ingredients
        ],
        "instructions": recipe.instructions,
        "notes": recipe.notes,
    }


def build():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    recipes = load_all_recipes(RECIPES_DIR)
    data = [recipe_to_dict(r) for r in recipes]

    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Built {len(data)} recipes -> {OUTPUT_PATH}")


if __name__ == "__main__":
    build()
