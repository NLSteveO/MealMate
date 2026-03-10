"""Recipe parser for Markdown files with YAML frontmatter."""

from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Set
import frontmatter


@dataclass
class Ingredient:
    """A single ingredient in a recipe."""
    item: str
    amount: Optional[float] = None
    unit: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: dict) -> Ingredient:
        """Create an Ingredient from a dictionary."""
        if isinstance(data, str):
            return cls(item=data)
        return cls(
            item=data.get("item", ""),
            amount=data.get("amount"),
            unit=data.get("unit"),
        )
    
    def __str__(self) -> str:
        parts = []
        if self.amount:
            parts.append(str(self.amount))
        if self.unit:
            parts.append(self.unit)
        parts.append(self.item)
        return " ".join(parts)


@dataclass
class Recipe:
    """A parsed recipe."""
    slug: str
    title: str
    servings: Optional[int] = None
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    ingredients: List[Ingredient] = field(default_factory=list)
    instructions: str = ""
    notes: str = ""
    source_path: Optional[Path] = None
    
    @property
    def ingredient_names(self) -> Set[str]:
        """Get a set of normalized ingredient names."""
        return {ing.item.lower().strip() for ing in self.ingredients}
    
    def __str__(self) -> str:
        return f"{self.title} ({len(self.ingredients)} ingredients)"


def parse_recipe(filepath: Path) -> Recipe:
    """Parse a recipe from a Markdown file with YAML frontmatter."""
    post = frontmatter.load(filepath)
    metadata = post.metadata
    content = post.content
    
    ingredients = [
        Ingredient.from_dict(ing) 
        for ing in metadata.get("ingredients", [])
    ]
    
    instructions = ""
    notes = ""
    
    if "## Instructions" in content:
        parts = content.split("## Instructions", 1)
        rest = parts[1] if len(parts) > 1 else ""
        if "## Notes" in rest:
            inst_part, notes_part = rest.split("## Notes", 1)
            instructions = inst_part.strip()
            notes = notes_part.strip()
        else:
            instructions = rest.strip()
    
    return Recipe(
        slug=filepath.stem,
        title=metadata.get("title", filepath.stem),
        servings=metadata.get("servings"),
        prep_time=metadata.get("prep_time"),
        cook_time=metadata.get("cook_time"),
        tags=metadata.get("tags", []),
        ingredients=ingredients,
        instructions=instructions,
        notes=notes,
        source_path=filepath,
    )


def load_all_recipes(recipes_dir: Path) -> List[Recipe]:
    """Load all recipes from a directory."""
    recipes = []
    if not recipes_dir.exists():
        return recipes
    
    for filepath in recipes_dir.glob("*.md"):
        try:
            recipe = parse_recipe(filepath)
            recipes.append(recipe)
        except Exception as e:
            print(f"Warning: Failed to parse {filepath}: {e}")
    
    return sorted(recipes, key=lambda r: r.title.lower())
