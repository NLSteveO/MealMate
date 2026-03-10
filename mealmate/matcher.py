"""Ingredient matching algorithms for finding similar recipes."""

from __future__ import annotations
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Set, List, Tuple
from .parser import Recipe


@dataclass
class RecipeMatch:
    """A recipe match with similarity score."""
    recipe: Recipe
    score: float
    shared_ingredients: Set[str]
    
    @property
    def percentage(self) -> int:
        """Return score as a percentage."""
        return int(self.score * 100)


class IngredientMatcher:
    """Finds recipes with similar ingredients."""
    
    def __init__(self, synonyms_path: Optional[Path] = None):
        self.synonyms: dict[str, str] = {}
        if synonyms_path and synonyms_path.exists():
            self._load_synonyms(synonyms_path)
    
    def _load_synonyms(self, path: Path) -> None:
        """Load ingredient synonyms from JSON file."""
        with open(path) as f:
            data = json.load(f)
        for canonical, aliases in data.items():
            canonical_lower = canonical.lower()
            self.synonyms[canonical_lower] = canonical_lower
            for alias in aliases:
                self.synonyms[alias.lower()] = canonical_lower
    
    def normalize_ingredient(self, name: str) -> str:
        """Normalize an ingredient name using synonyms."""
        name_lower = name.lower().strip()
        return self.synonyms.get(name_lower, name_lower)
    
    def get_normalized_ingredients(self, recipe: Recipe) -> Set[str]:
        """Get normalized ingredient names for a recipe."""
        return {self.normalize_ingredient(ing.item) for ing in recipe.ingredients}
    
    def calculate_similarity(self, recipe1: Recipe, recipe2: Recipe) -> Tuple[float, Set[str]]:
        """
        Calculate ingredient similarity between two recipes.
        
        Returns (score, shared_ingredients) where score is between 0 and 1.
        Uses Jaccard similarity: intersection / union
        """
        ing1 = self.get_normalized_ingredients(recipe1)
        ing2 = self.get_normalized_ingredients(recipe2)
        
        shared = ing1 & ing2
        total = ing1 | ing2
        
        if not total:
            return 0.0, set()
        
        score = len(shared) / len(total)
        return score, shared
    
    def find_similar(
        self, 
        target: Recipe, 
        candidates: List[Recipe], 
        min_score: float = 0.1,
        limit: Optional[int] = None
    ) -> List[RecipeMatch]:
        """
        Find recipes similar to the target based on ingredients.
        
        Args:
            target: The recipe to match against
            candidates: List of recipes to search
            min_score: Minimum similarity score (0-1)
            limit: Maximum number of results to return
        
        Returns:
            List of RecipeMatch objects sorted by score descending
        """
        matches = []
        
        for candidate in candidates:
            if candidate.slug == target.slug:
                continue
            
            score, shared = self.calculate_similarity(target, candidate)
            
            if score >= min_score:
                matches.append(RecipeMatch(
                    recipe=candidate,
                    score=score,
                    shared_ingredients=shared
                ))
        
        matches.sort(key=lambda m: m.score, reverse=True)
        
        if limit:
            matches = matches[:limit]
        
        return matches
    
    def find_meal_plan(
        self, 
        recipes: List[Recipe], 
        num_meals: int = 3
    ) -> Tuple[List[Recipe], Set[str], int]:
        """
        Find a combination of recipes that share the most ingredients.
        
        Uses a greedy algorithm: start with the recipe that has the most
        potential for sharing, then iteratively add recipes that share
        the most with the current set.
        
        Args:
            recipes: All available recipes
            num_meals: Number of meals to plan
        
        Returns:
            (selected_recipes, all_ingredients, overlap_count)
        """
        if len(recipes) <= num_meals:
            all_ings = set()
            for r in recipes:
                all_ings.update(self.get_normalized_ingredients(r))
            return recipes, all_ings, 0
        
        best_plan = None
        best_overlap = -1
        
        for start_recipe in recipes:
            selected = [start_recipe]
            remaining = [r for r in recipes if r.slug != start_recipe.slug]
            
            while len(selected) < num_meals and remaining:
                current_ings = set()
                for r in selected:
                    current_ings.update(self.get_normalized_ingredients(r))
                
                best_next = None
                best_next_overlap = -1
                
                for candidate in remaining:
                    candidate_ings = self.get_normalized_ingredients(candidate)
                    overlap = len(current_ings & candidate_ings)
                    if overlap > best_next_overlap:
                        best_next_overlap = overlap
                        best_next = candidate
                
                if best_next:
                    selected.append(best_next)
                    remaining = [r for r in remaining if r.slug != best_next.slug]
                else:
                    break
            
            total_ings = set()
            for r in selected:
                total_ings.update(self.get_normalized_ingredients(r))
            
            individual_count = sum(
                len(self.get_normalized_ingredients(r)) for r in selected
            )
            overlap = individual_count - len(total_ings)
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_plan = (selected, total_ings, overlap)
        
        return best_plan or ([], set(), 0)
