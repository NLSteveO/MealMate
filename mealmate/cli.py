"""Command-line interface for MealMate."""

from pathlib import Path
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.markdown import Markdown
from rich import box

from .parser import load_all_recipes, parse_recipe
from .matcher import IngredientMatcher

app = typer.Typer(help="MealMate - Recipe storage and meal planning tool")
console = Console()

PROJECT_ROOT = Path(__file__).parent.parent
RECIPES_DIR = PROJECT_ROOT / "recipes"
DATA_DIR = PROJECT_ROOT / "data"
SYNONYMS_PATH = DATA_DIR / "ingredients.json"


def get_matcher() -> IngredientMatcher:
    """Create an IngredientMatcher with synonym support if available."""
    return IngredientMatcher(SYNONYMS_PATH if SYNONYMS_PATH.exists() else None)


@app.command()
def list():
    """List all available recipes."""
    recipes = load_all_recipes(RECIPES_DIR)
    
    if not recipes:
        console.print("[yellow]No recipes found in recipes/ directory[/yellow]")
        return
    
    table = Table(title="Available Recipes", box=box.ROUNDED)
    table.add_column("Recipe", style="cyan")
    table.add_column("Tags", style="green")
    table.add_column("Ingredients", justify="right")
    table.add_column("Time", justify="right")
    
    for recipe in recipes:
        tags = ", ".join(recipe.tags) if recipe.tags else "-"
        time_parts = []
        if recipe.prep_time:
            time_parts.append(f"prep: {recipe.prep_time}")
        if recipe.cook_time:
            time_parts.append(f"cook: {recipe.cook_time}")
        time_str = ", ".join(time_parts) if time_parts else "-"
        
        table.add_row(
            recipe.title,
            tags,
            str(len(recipe.ingredients)),
            time_str
        )
    
    console.print(table)
    console.print(f"\n[dim]Total: {len(recipes)} recipes[/dim]")


@app.command()
def show(name: str):
    """Show a specific recipe by name (slug or partial match)."""
    recipes = load_all_recipes(RECIPES_DIR)
    name_lower = name.lower()
    
    matches = [r for r in recipes if name_lower in r.slug.lower() or name_lower in r.title.lower()]
    
    if not matches:
        console.print(f"[red]No recipe found matching '{name}'[/red]")
        return
    
    if len(matches) > 1:
        console.print(f"[yellow]Multiple matches found:[/yellow]")
        for r in matches:
            console.print(f"  - {r.slug}")
        return
    
    recipe = matches[0]
    
    console.print(Panel(f"[bold cyan]{recipe.title}[/bold cyan]", box=box.DOUBLE))
    
    meta_parts = []
    if recipe.servings:
        meta_parts.append(f"Servings: {recipe.servings}")
    if recipe.prep_time:
        meta_parts.append(f"Prep: {recipe.prep_time}")
    if recipe.cook_time:
        meta_parts.append(f"Cook: {recipe.cook_time}")
    if recipe.tags:
        meta_parts.append(f"Tags: {', '.join(recipe.tags)}")
    
    if meta_parts:
        console.print("[dim]" + " | ".join(meta_parts) + "[/dim]\n")
    
    console.print("[bold]Ingredients:[/bold]")
    for ing in recipe.ingredients:
        console.print(f"  • {ing}")
    
    if recipe.instructions:
        console.print("\n[bold]Instructions:[/bold]")
        console.print(Markdown(recipe.instructions))
    
    if recipe.notes:
        console.print("\n[bold]Notes:[/bold]")
        console.print(f"[italic]{recipe.notes}[/italic]")


@app.command()
def match(
    name: str,
    count: int = typer.Option(5, "--count", "-c", help="Number of matches to show")
):
    """Find recipes with similar ingredients to the given recipe."""
    recipes = load_all_recipes(RECIPES_DIR)
    name_lower = name.lower()
    
    target = None
    for r in recipes:
        if name_lower in r.slug.lower() or name_lower in r.title.lower():
            target = r
            break
    
    if not target:
        console.print(f"[red]No recipe found matching '{name}'[/red]")
        return
    
    matcher = get_matcher()
    matches = matcher.find_similar(target, recipes, limit=count)
    
    console.print(f"\n[bold]Recipes similar to [cyan]{target.title}[/cyan]:[/bold]\n")
    
    if not matches:
        console.print("[yellow]No similar recipes found[/yellow]")
        return
    
    table = Table(box=box.ROUNDED)
    table.add_column("Recipe", style="cyan")
    table.add_column("Match", justify="right", style="green")
    table.add_column("Shared Ingredients")
    
    for m in matches:
        shared_str = ", ".join(sorted(m.shared_ingredients))
        table.add_row(
            m.recipe.title,
            f"{m.percentage}%",
            shared_str
        )
    
    console.print(table)


@app.command()
def plan(
    meals: int = typer.Option(3, "--meals", "-m", help="Number of meals to plan")
):
    """Find a meal plan that maximizes ingredient overlap for efficient shopping."""
    recipes = load_all_recipes(RECIPES_DIR)
    
    if len(recipes) < meals:
        console.print(f"[yellow]Only {len(recipes)} recipes available[/yellow]")
        meals = len(recipes)
    
    matcher = get_matcher()
    selected, all_ingredients, overlap = matcher.find_meal_plan(recipes, meals)
    
    console.print(Panel(
        f"[bold]Meal Plan ({meals} meals)[/bold]",
        box=box.DOUBLE
    ))
    
    console.print("\n[bold cyan]Selected Recipes:[/bold cyan]")
    for i, recipe in enumerate(selected, 1):
        console.print(f"  {i}. {recipe.title}")
    
    console.print(f"\n[bold green]Shopping List ({len(all_ingredients)} unique ingredients):[/bold green]")
    for ing in sorted(all_ingredients):
        console.print(f"  • {ing}")
    
    total_individual = sum(len(matcher.get_normalized_ingredients(r)) for r in selected)
    console.print(f"\n[dim]Efficiency: {total_individual} ingredient entries → {len(all_ingredients)} to buy[/dim]")
    console.print(f"[dim]Overlap savings: {overlap} shared ingredients[/dim]")


@app.command()
def search(
    ingredient: str = typer.Option(None, "--ingredient", "-i", help="Search by ingredient"),
    tag: str = typer.Option(None, "--tag", "-t", help="Search by tag")
):
    """Search recipes by ingredient or tag."""
    recipes = load_all_recipes(RECIPES_DIR)
    results = recipes
    
    if ingredient:
        ingredient_lower = ingredient.lower()
        results = [
            r for r in results 
            if any(ingredient_lower in ing.item.lower() for ing in r.ingredients)
        ]
    
    if tag:
        tag_lower = tag.lower()
        results = [
            r for r in results
            if any(tag_lower in t.lower() for t in r.tags)
        ]
    
    if not results:
        console.print("[yellow]No matching recipes found[/yellow]")
        return
    
    table = Table(title="Search Results", box=box.ROUNDED)
    table.add_column("Recipe", style="cyan")
    table.add_column("Tags", style="green")
    
    for recipe in results:
        tags = ", ".join(recipe.tags) if recipe.tags else "-"
        table.add_row(recipe.title, tags)
    
    console.print(table)
    console.print(f"\n[dim]Found: {len(results)} recipes[/dim]")


if __name__ == "__main__":
    app()
