(function () {
  "use strict";

  let recipes = [];
  let activeTag = null;
  let searchQuery = "";

  const app = document.getElementById("app");
  const recipeCountEl = document.getElementById("recipeCount");
  const searchInput = document.getElementById("searchInput");
  const searchInputMobile = document.getElementById("searchInputMobile");
  const tagListEl = document.getElementById("tagList");
  const tagListMobileEl = document.getElementById("tagListMobile");
  const filterDrawer = document.getElementById("filterDrawer");
  const mobileFilterBtn = document.getElementById("mobileFilterBtn");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const drawerClose = document.getElementById("drawerClose");

  // ---- Theme ----

  function initTheme() {
    const saved = localStorage.getItem("mealmate-theme");
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mealmate-theme", next);
  }

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document
    .getElementById("themeToggleMobile")
    .addEventListener("click", toggleTheme);
  initTheme();

  // ---- Filter Drawer (mobile) ----

  function openDrawer() {
    filterDrawer.classList.add("open");
    searchInputMobile.value = searchQuery;
  }

  function closeDrawer() {
    filterDrawer.classList.remove("open");
  }

  mobileFilterBtn.addEventListener("click", openDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
  drawerClose.addEventListener("click", closeDrawer);

  // ---- Search ----

  function handleSearch(value) {
    searchQuery = value;
    searchInput.value = value;
    searchInputMobile.value = value;
    renderContent();
  }

  searchInput.addEventListener("input", function (e) {
    handleSearch(e.target.value);
  });

  searchInputMobile.addEventListener("input", function (e) {
    handleSearch(e.target.value);
  });

  // ---- Data ----

  async function loadRecipes() {
    try {
      const res = await fetch("data/recipes.json");
      recipes = await res.json();
      recipeCountEl.textContent = recipes.length + " recipes";
      renderSidebarTags();
      route();
    } catch (e) {
      app.innerHTML =
        '<div class="loading">Failed to load recipes. Run: python build.py</div>';
    }
  }

  function getAllTags() {
    const tagCount = {};
    recipes.forEach(function (r) {
      r.tags.forEach(function (t) {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
    return Object.entries(tagCount).sort(function (a, b) {
      return b[1] - a[1];
    });
  }

  function filterRecipes() {
    var filtered = recipes;

    if (activeTag) {
      filtered = filtered.filter(function (r) {
        return r.tags.includes(activeTag);
      });
    }

    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      filtered = filtered.filter(function (r) {
        return (
          r.title.toLowerCase().includes(q) ||
          r.tags.some(function (t) {
            return t.toLowerCase().includes(q);
          }) ||
          r.ingredients.some(function (i) {
            return i.item.toLowerCase().includes(q);
          })
        );
      });
    }

    return filtered;
  }

  // ---- Sidebar Tags ----

  function renderSidebarTags() {
    var tags = getAllTags();
    var html = "";

    html +=
      '<button class="nav-tag' +
      (!activeTag ? " active" : "") +
      '" data-tag="">' +
      "<span>All Recipes</span>" +
      '<span class="nav-tag-count">' +
      recipes.length +
      "</span></button>";

    tags.forEach(function (entry) {
      var tag = entry[0];
      var count = entry[1];
      html +=
        '<button class="nav-tag' +
        (activeTag === tag ? " active" : "") +
        '" data-tag="' +
        escapeHtml(tag) +
        '">' +
        "<span>" +
        escapeHtml(tag) +
        "</span>" +
        '<span class="nav-tag-count">' +
        count +
        "</span></button>";
    });

    tagListEl.innerHTML = html;
    tagListMobileEl.innerHTML = html;

    function bindTagClicks(container) {
      container.querySelectorAll(".nav-tag").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var tag = btn.getAttribute("data-tag");
          activeTag = tag || null;
          renderSidebarTags();
          renderContent();
          closeDrawer();
          if (window.location.hash.startsWith("#/recipe/")) {
            window.location.hash = "#/";
          }
        });
      });
    }

    bindTagClicks(tagListEl);
    bindTagClicks(tagListMobileEl);
  }

  // ---- Routing ----

  function route() {
    var hash = window.location.hash || "#/";

    if (hash.startsWith("#/recipe/")) {
      var slug = hash.replace("#/recipe/", "");
      renderRecipeDetail(slug);
    } else {
      renderContent();
    }
  }

  window.addEventListener("hashchange", route);

  // ---- Recipe List ----

  function renderContent() {
    var filtered = filterRecipes();
    var html = "";

    html += '<div class="content-hero">';
    if (activeTag) {
      html += "<h1>" + escapeHtml(activeTag) + "</h1>";
      html +=
        '<p class="subtitle">' +
        filtered.length +
        (filtered.length === 1 ? " recipe" : " recipes") +
        "</p>";
    } else if (searchQuery) {
      html += '<h1>Results for <span class="hero-accent">"' + escapeHtml(searchQuery) + '"</span></h1>';
      html += '<p class="subtitle">' + filtered.length + " found</p>";
    } else {
      html += '<h1>What are we <span class="hero-accent">cooking</span>?</h1>';
      html += '<p class="subtitle">' + recipes.length + " recipes in your collection</p>";
    }
    html += "</div>";

    if (filtered.length === 0) {
      html += '<div class="no-results">No recipes match your search</div>';
    } else {
      html += '<div class="recipe-grid">';
      filtered.forEach(function (r) {
        html += '<a class="recipe-card" href="#/recipe/' + r.slug + '">';
        html += "<h2>" + escapeHtml(r.title) + "</h2>";

        var metaParts = [];
        if (r.prep_time) metaParts.push("Prep: " + r.prep_time);
        if (r.cook_time) metaParts.push("Cook: " + r.cook_time);
        if (r.servings) metaParts.push("Serves " + r.servings);

        if (metaParts.length) {
          html += '<div class="card-meta">';
          metaParts.forEach(function (m) {
            html += '<span class="card-meta-item">' + escapeHtml(m) + "</span>";
          });
          html += "</div>";
        }

        html += '<div class="card-footer">';
        if (r.tags.length) {
          html += '<div class="card-tags">';
          r.tags.slice(0, 2).forEach(function (t) {
            html += '<span class="card-tag">' + escapeHtml(t) + "</span>";
          });
          html += "</div>";
        } else {
          html += "<div></div>";
        }
        html += "</div>";

        html += "</a>";
      });
      html += "</div>";
    }

    app.innerHTML = html;
    app.scrollTop = 0;
  }

  // ---- Recipe Detail ----

  function renderRecipeDetail(slug) {
    var recipe = recipes.find(function (r) {
      return r.slug === slug;
    });

    if (!recipe) {
      app.innerHTML = '<div class="no-results">Recipe not found</div>';
      return;
    }

    var html = "";

    html += '<a href="#/" class="back-link">&larr; All Recipes</a>';

    html += '<div class="recipe-detail-header">';
    html += "<h1>" + escapeHtml(recipe.title) + "</h1>";

    html += '<div class="recipe-meta">';
    if (recipe.servings) {
      html += '<div class="meta-chip"><span class="meta-chip-label">Serves</span> ' + recipe.servings + "</div>";
    }
    if (recipe.prep_time) {
      html +=
        '<div class="meta-chip"><span class="meta-chip-label">Prep</span> ' +
        escapeHtml(recipe.prep_time) +
        "</div>";
    }
    if (recipe.cook_time) {
      html +=
        '<div class="meta-chip"><span class="meta-chip-label">Cook</span> ' +
        escapeHtml(recipe.cook_time) +
        "</div>";
    }
    html += '<div class="meta-chip"><span class="meta-chip-label">Items</span> ' + recipe.ingredients.length + "</div>";
    html += "</div>";

    if (recipe.tags.length) {
      html += '<div class="recipe-tags">';
      recipe.tags.forEach(function (t) {
        html += '<span class="recipe-tag">' + escapeHtml(t) + "</span>";
      });
      html += "</div>";
    }
    html += "</div>";

    html += '<div class="recipe-body">';

    /* Ingredients column */
    html += '<div class="recipe-section">';
    html += '<div class="section-title">Ingredients</div>';
    html += '<ul class="ingredient-list">';
    recipe.ingredients.forEach(function (ing, i) {
      html +=
        '<li data-index="' +
        i +
        '"><span class="ingredient-check"></span>' +
        escapeHtml(ing.display) +
        "</li>";
    });
    html += "</ul>";
    html += "</div>";

    /* Instructions column */
    html += "<div>";

    if (recipe.instructions) {
      html += '<div class="recipe-section">';
      html += '<div class="section-title">Instructions</div>';
      html += renderInstructions(recipe.instructions);
      html += "</div>";
    }

    if (recipe.notes) {
      html += '<div class="recipe-section">';
      html += '<div class="section-title">Notes</div>';
      html +=
        '<div class="recipe-notes">' + renderNotes(recipe.notes) + "</div>";
      html += "</div>";
    }

    html += "</div>"; // end right column
    html += "</div>"; // end recipe-body

    app.innerHTML = html;
    app.scrollTop = 0;

    app.querySelectorAll(".ingredient-list li").forEach(function (li) {
      li.addEventListener("click", function () {
        li.classList.toggle("checked");
        var check = li.querySelector(".ingredient-check");
        check.innerHTML = li.classList.contains("checked") ? "&#10003;" : "";
      });
    });
  }

  function renderInstructions(text) {
    var lines = text.split("\n");
    var html = "";
    var inList = false;

    lines.forEach(function (line) {
      var trimmed = line.trim();

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

      var stepMatch = trimmed.match(/^\d+\.\s+(.*)/);
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
    var lines = text
      .split("\n")
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l; });

    var isBulletList = lines.every(function (l) {
      return l.startsWith("- ");
    });

    if (isBulletList) {
      var html = "<ul>";
      lines.forEach(function (l) {
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  loadRecipes();
})();
