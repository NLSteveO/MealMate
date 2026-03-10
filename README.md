# MealMate

A personal recipe storage and meal planning tool that helps you find recipes with similar ingredients for efficient shopping.

## Features

- **Recipe Storage**: Store recipes as Markdown files with YAML frontmatter
- **Ingredient Matching**: Find recipes that share ingredients for efficient meal planning
- **Shopping Optimization**: Plan 2-3 meals with overlapping ingredients to minimize shopping trips
- **CLI Interface**: Quick access to your recipes from the terminal

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# List all recipes
python -m mealmate.cli list

# Show a specific recipe
python -m mealmate.cli show chicken-stir-fry

# Find recipes with similar ingredients
python -m mealmate.cli match chicken-stir-fry --count 3

# Plan meals with shared ingredients
python -m mealmate.cli plan --meals 3
```

## Recipe Format

Recipes are stored as Markdown files in the `recipes/` directory:

```yaml
---
title: Chicken Stir Fry
servings: 4
prep_time: 15 min
cook_time: 20 min
tags: [asian, quick, weeknight]
ingredients:
  - item: chicken breast
    amount: 1
    unit: lb
  - item: soy sauce
    amount: 3
    unit: tbsp
---

## Instructions

1. Cut chicken into bite-sized pieces
2. Heat oil in wok over high heat
...

## Notes

Any additional notes about the recipe.
```

## Project Structure

```
mealmate/
├── recipes/           # Your recipe markdown files
├── data/              # Ingredient synonyms and config
├── mealmate/          # Python package
│   ├── parser.py      # Recipe file parser
│   ├── matcher.py     # Ingredient matching algorithm
│   └── cli.py         # Command-line interface
└── requirements.txt
```

## License

Personal use project.
