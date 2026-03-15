(function () {
  "use strict";

  let recipes = [];
  let activeTag = null;
  let searchQuery = "";

  const app = document.getElementById("app");
  const recipeCountEl = document.getElementById("recipeCount");

  async function loadRecipes() {
    try {
      const res = await fetch("data/recipes.json");
      recipes = await res.json();
      recipeCountEl.textContent = recipes.length + " recipes";
      route();
    } catch (e) {
      app.innerHTML =
        '<div class="loading">Failed to load recipes. Run: python build.py</div>';
    }
  }

  function route() {
    const hash = window.location.hash || "#/";

    if (hash.startsWith("#/recipe/")) {
      const slug = hash.replace("#/recipe/", "");
      renderRecipeDetail(slug);
    } else {
      renderRecipeList();
    }
  }

  // ---- Recipe List ----

  function getAllTags() {
    const tagCount = {};
    recipes.forEach((r) =>
      r.tags.forEach((t) => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      })
    );
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }

  function filterRecipes() {
    let filtered = recipes;

    if (activeTag) {
      filtered = filtered.filter((r) => r.tags.includes(activeTag));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.ingredients.some((i) => i.item.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  function renderRecipeList() {
    const tags = getAllTags();
    const filtered = filterRecipes();

    let html = "";

    html += '<div class="search-container">';
    html +=
      '<input type="search" class="search-input" placeholder="Search recipes, tags, or ingredients..." value="' +
      escapeHtml(searchQuery) +
      '">';
    html += "</div>";

    html += '<div class="tags-bar">';
    tags.forEach((tag) => {
      const isActive = tag === activeTag;
      html +=
        '<button class="tag-pill' +
        (isActive ? " active" : "") +
        '" data-tag="' +
        escapeHtml(tag) +
        '">' +
        escapeHtml(tag) +
        "</button>";
    });
    html += "</div>";

    if (filtered.length === 0) {
      html += '<div class="no-results">No recipes found</div>';
    } else {
      html += '<div class="recipe-grid">';
      filtered.forEach((r) => {
        html += '<a class="recipe-card" href="#/recipe/' + r.slug + '">';
        html += "<h2>" + escapeHtml(r.title) + "</h2>";

        const metaParts = [];
        if (r.prep_time) metaParts.push("Prep: " + r.prep_time);
        if (r.cook_time) metaParts.push("Cook: " + r.cook_time);
        if (r.servings) metaParts.push("Serves: " + r.servings);
        if (metaParts.length) {
          html +=
            '<div class="card-meta">' +
            escapeHtml(metaParts.join(" · ")) +
            "</div>";
        }

        if (r.tags.length) {
          html += '<div class="card-tags">';
          r.tags.forEach((t) => {
            html +=
              '<span class="card-tag">' + escapeHtml(t) + "</span>";
          });
          html += "</div>";
        }

        html += "</a>";
      });
      html += "</div>";
    }

    app.innerHTML = html;

    const searchInput = app.querySelector(".search-input");
    searchInput.addEventListener("input", function (e) {
      searchQuery = e.target.value;
      renderRecipeList();
      const newInput = app.querySelector(".search-input");
      newInput.focus();
      newInput.setSelectionRange(
        newInput.value.length,
        newInput.value.length
      );
    });

    app.querySelectorAll(".tag-pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tag = btn.getAttribute("data-tag");
        activeTag = activeTag === tag ? null : tag;
        renderRecipeList();
      });
    });
  }

  // ---- Recipe Detail ----

  function renderRecipeDetail(slug) {
    const recipe = recipes.find((r) => r.slug === slug);

    if (!recipe) {
      app.innerHTML = '<div class="no-results">Recipe not found</div>';
      return;
    }

    let html = "";

    html += '<a href="#/" class="back-link">&larr; All Recipes</a>';

    html += '<div class="recipe-header">';
    html += "<h1>" + escapeHtml(recipe.title) + "</h1>";

    html += '<div class="recipe-meta">';
    if (recipe.servings)
      html += "<span>Serves " + recipe.servings + "</span>";
    if (recipe.prep_time)
      html += "<span>Prep: " + escapeHtml(recipe.prep_time) + "</span>";
    if (recipe.cook_time)
      html += "<span>Cook: " + escapeHtml(recipe.cook_time) + "</span>";
    html += "</div>";

    if (recipe.tags.length) {
      html += '<div class="recipe-tags">';
      recipe.tags.forEach((t) => {
        html +=
          '<span class="recipe-tag">' + escapeHtml(t) + "</span>";
      });
      html += "</div>";
    }
    html += "</div>";

    html += '<div class="recipe-section">';
    html += "<h2>Ingredients</h2>";
    html += '<ul class="ingredient-list">';
    recipe.ingredients.forEach((ing, i) => {
      html +=
        '<li data-index="' +
        i +
        '"><span class="ingredient-check"></span>' +
        escapeHtml(ing.display) +
        "</li>";
    });
    html += "</ul>";
    html += "</div>";

    if (recipe.instructions) {
      html += '<div class="recipe-section">';
      html += "<h2>Instructions</h2>";
      html += renderInstructions(recipe.instructions);
      html += "</div>";
    }

    if (recipe.notes) {
      html += '<div class="recipe-section">';
      html += "<h2>Notes</h2>";
      html += '<div class="recipe-notes">' + renderNotes(recipe.notes) + "</div>";
      html += "</div>";
    }

    app.innerHTML = html;

    window.scrollTo(0, 0);

    app.querySelectorAll(".ingredient-list li").forEach(function (li) {
      li.addEventListener("click", function () {
        li.classList.toggle("checked");
        const check = li.querySelector(".ingredient-check");
        check.innerHTML = li.classList.contains("checked") ? "&#10003;" : "";
      });
    });
  }

  function renderInstructions(text) {
    const lines = text.split("\n");
    let html = "";
    let inList = false;

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("### ")) {
        if (inList) {
          html += "</ol>";
          inList = false;
        }
        html +=
          '<div class="instruction-subheading">' +
          escapeHtml(trimmed.replace("### ", "")) +
          "</div>";
        return;
      }

      const stepMatch = trimmed.match(/^\d+\.\s+(.*)/);
      if (stepMatch) {
        if (!inList) {
          html += '<ol class="instruction-list">';
          inList = true;
        }
        html += "<li>" + escapeHtml(stepMatch[1]) + "</li>";
      }
    });

    if (inList) html += "</ol>";
    return html;
  }

  function renderNotes(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    const isBulletList = lines.every((l) => l.startsWith("- "));

    if (isBulletList) {
      let html = "<ul>";
      lines.forEach((l) => {
        html += "<li>" + escapeHtml(l.replace(/^-\s*/, "")) + "</li>";
      });
      html += "</ul>";
      return html;
    }

    return "<p>" + escapeHtml(text) + "</p>";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---- Init ----

  window.addEventListener("hashchange", route);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  loadRecipes();
})();
