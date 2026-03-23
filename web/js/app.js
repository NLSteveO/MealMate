(function () {
  "use strict";

  let recipes = [];
  let activeTag = null;
  let searchQuery = "";
  let lastFilteredSlugs = [];
  var detailCleanup = null;

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
      var data = await res.json();
      recipes = data.recipes || data;
      if (data.synonyms) {
        MealMatcher.loadSynonyms(data.synonyms);
      }
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

  function updateTabState(hash) {
    document.querySelectorAll(".tab-item").forEach(function (tab) {
      tab.classList.remove("active");
    });
    var sidebarLink = document.getElementById("sidebarPlannerLink");
    if (sidebarLink) sidebarLink.classList.remove("active");

    if (hash === "#/planner") {
      document.querySelector('[data-tab="planner"]').classList.add("active");
      if (sidebarLink) sidebarLink.classList.add("active");
    } else {
      document.querySelector('[data-tab="recipes"]').classList.add("active");
    }
  }

  function route() {
    var hash = window.location.hash || "#/";

    if (!hash.startsWith("#/recipe/")) {
      var nav = document.getElementById("recipeNav");
      if (nav) nav.remove();
      if (detailCleanup) {
        detailCleanup();
        detailCleanup = null;
      }
    }

    updateTabState(hash);

    if (hash === "#/planner") {
      renderPlanner();
    } else if (hash.startsWith("#/recipe/")) {
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
    lastFilteredSlugs = filtered.map(function (r) { return r.slug; });
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
        if (r.needs_review) {
          html += '<span class="review-badge">Needs Review</span>';
        }
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

    if (recipe.needs_review) {
      html += '<div class="review-banner">This recipe hasn\'t been reviewed yet and may need corrections</div>';
    }

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

    if (recipe.photo) {
      html += '<div class="recipe-photo">';
      html += '<img src="' + escapeHtml(recipe.photo) + '" alt="' + escapeHtml(recipe.title) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">';
      html += '</div>';
    }

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

    if (recipe.source || recipe.photo_credit) {
      html += '<div class="recipe-credits">';
      if (recipe.source) {
        html += '<span>Recipe from ';
        if (recipe.source_name) {
          html += '<a href="' + escapeHtml(recipe.source) + '" target="_blank" rel="noopener">' + escapeHtml(recipe.source_name) + '</a>';
        } else {
          html += '<a href="' + escapeHtml(recipe.source) + '" target="_blank" rel="noopener">' + escapeHtml(recipe.source) + '</a>';
        }
        html += '</span>';
      }
      if (recipe.photo_credit) {
        html += '<span>Photo: ' + escapeHtml(recipe.photo_credit) + '</span>';
      }
      html += '</div>';
    }

    var similar = MealMatcher.findSimilar(recipe, recipes, 0.1, 5);
    if (similar.length > 0) {
      html += '<div class="similar-recipes">';
      html += '<div class="section-title">Similar Recipes</div>';
      html += '<p class="similar-subtitle">Overlapping ingredients for efficient shopping</p>';
      html += '<div class="similar-grid">';
      similar.forEach(function (match) {
        html += '<a class="similar-card" href="#/recipe/' + match.recipe.slug + '">';
        html += '<span class="similar-match">' + match.percentage + '% match</span>';
        html += '<span class="similar-title">' + escapeHtml(match.recipe.title) + '</span>';
        html += '<span class="similar-shared">' + match.shared.length + ' shared item' + (match.shared.length !== 1 ? 's' : '') + '</span>';
        html += '</a>';
      });
      html += '</div>';
      html += '</div>';
    }

    app.innerHTML = html;
    app.scrollTop = 0;

    var navSlugs = lastFilteredSlugs.length > 1 ? lastFilteredSlugs : recipes.map(function (r) { return r.slug; });
    var currentIdx = navSlugs.indexOf(slug);
    var prevSlug = currentIdx > 0 ? navSlugs[currentIdx - 1] : null;
    var nextSlug = currentIdx < navSlugs.length - 1 ? navSlugs[currentIdx + 1] : null;

    var oldNav = document.getElementById("recipeNav");
    if (oldNav) oldNav.remove();

    if (navSlugs.length > 1 && currentIdx !== -1) {
      var navEl = document.createElement("div");
      navEl.className = "recipe-nav";
      navEl.id = "recipeNav";
      var navHtml = "";
      if (prevSlug) {
        navHtml += '<a class="recipe-nav-btn" href="#/recipe/' + prevSlug + '">&larr; Prev</a>';
      }
      navHtml += '<span class="recipe-nav-counter">' + (currentIdx + 1) + ' of ' + navSlugs.length + '</span>';
      if (nextSlug) {
        navHtml += '<a class="recipe-nav-btn" href="#/recipe/' + nextSlug + '">Next &rarr;</a>';
      }
      navEl.innerHTML = navHtml;
      document.body.appendChild(navEl);
    }

    app.querySelectorAll(".ingredient-list li").forEach(function (li) {
      li.addEventListener("click", function () {
        li.classList.toggle("checked");
        var check = li.querySelector(".ingredient-check");
        check.innerHTML = li.classList.contains("checked") ? "&#10003;" : "";
      });
    });

    if (detailCleanup) {
      detailCleanup();
      detailCleanup = null;
    }

    function navigateTo(targetSlug) {
      if (targetSlug) {
        window.location.hash = "#/recipe/" + targetSlug;
      }
    }

    function onKeyDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); navigateTo(prevSlug); }
      if (e.key === "ArrowRight") { e.preventDefault(); navigateTo(nextSlug); }
    }

    var touchStartX = 0;
    var touchStartY = 0;

    function onTouchStart(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function onTouchEnd(e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) { navigateTo(nextSlug); }
      else { navigateTo(prevSlug); }
    }

    document.addEventListener("keydown", onKeyDown);
    app.addEventListener("touchstart", onTouchStart, { passive: true });
    app.addEventListener("touchend", onTouchEnd);

    detailCleanup = function () {
      document.removeEventListener("keydown", onKeyDown);
      app.removeEventListener("touchstart", onTouchStart);
      app.removeEventListener("touchend", onTouchEnd);
    };
  }

  // ---- Meal Planner ----

  var planState = { mealCount: 3, slots: [], locks: [] };

  function savePlan() {
    var data = {
      mealCount: planState.mealCount,
      slugs: planState.slots.map(function (r) { return r ? r.slug : null; }),
      locks: planState.locks,
    };
    localStorage.setItem("mealmate-plan", JSON.stringify(data));
  }

  function loadPlan() {
    try {
      var raw = localStorage.getItem("mealmate-plan");
      if (!raw) return;
      var data = JSON.parse(raw);
      planState.mealCount = data.mealCount || 3;
      planState.locks = data.locks || [];
      planState.slots = (data.slugs || []).map(function (slug) {
        if (!slug) return null;
        return recipes.find(function (r) { return r.slug === slug; }) || null;
      });
      while (planState.slots.length < planState.mealCount) {
        planState.slots.push(null);
        planState.locks.push(false);
      }
    } catch (e) { /* ignore corrupt data */ }
  }

  function clearPlan() {
    planState.slots = [];
    planState.locks = [];
    for (var i = 0; i < planState.mealCount; i++) {
      planState.slots.push(null);
      planState.locks.push(false);
    }
    savePlan();
  }

  function suggestMeals() {
    var locked = [];
    planState.slots.forEach(function (r, i) {
      if (r && planState.locks[i]) locked.push(r);
    });
    var suggested = MealMatcher.findMealPlan(recipes, planState.mealCount, locked);
    planState.slots = suggested.slice();
    while (planState.slots.length < planState.mealCount) planState.slots.push(null);
    planState.locks = planState.slots.map(function (r, i) {
      if (!r) return false;
      return locked.some(function (l) { return l.slug === r.slug; });
    });
    savePlan();
  }

  function setMealCount(n) {
    planState.mealCount = n;
    while (planState.slots.length < n) {
      planState.slots.push(null);
      planState.locks.push(false);
    }
    if (planState.slots.length > n) {
      planState.slots = planState.slots.slice(0, n);
      planState.locks = planState.locks.slice(0, n);
    }
    savePlan();
  }

  var pickerSlotIndex = -1;

  function openPicker(slotIndex) {
    pickerSlotIndex = slotIndex;
    var modal = document.getElementById("pickerModal");
    var input = document.getElementById("pickerSearchInput");
    modal.classList.add("open");
    input.value = "";
    input.focus();
    renderPickerList("");
  }

  function closePicker() {
    document.getElementById("pickerModal").classList.remove("open");
    pickerSlotIndex = -1;
  }

  function renderPickerList(query) {
    var listEl = document.getElementById("pickerList");
    var excludeSlugs = {};
    planState.slots.forEach(function (r, i) {
      if (r && i !== pickerSlotIndex) excludeSlugs[r.slug] = true;
    });

    var lockedRecipes = [];
    planState.slots.forEach(function (r, i) {
      if (r && i !== pickerSlotIndex && planState.locks[i]) lockedRecipes.push(r);
    });

    var ranked;
    if (lockedRecipes.length > 0) {
      ranked = MealMatcher.rankForPlan(recipes, lockedRecipes, excludeSlugs);
    } else {
      ranked = recipes.filter(function (r) {
        return !excludeSlugs[r.slug];
      }).map(function (r) { return { recipe: r, overlap: 0 }; });
    }

    if (query) {
      var q = query.toLowerCase();
      ranked = ranked.filter(function (item) {
        return item.recipe.title.toLowerCase().includes(q);
      });
    }

    var html = "";
    ranked.forEach(function (item) {
      html += '<button class="picker-item" data-slug="' + item.recipe.slug + '">';
      html += '<span class="picker-item-title">' + escapeHtml(item.recipe.title) + '</span>';
      if (item.overlap > 0) {
        html += '<span class="picker-item-overlap">' + item.overlap + ' shared</span>';
      }
      html += '</button>';
    });

    if (ranked.length === 0) {
      html = '<div class="picker-empty">No recipes found</div>';
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll(".picker-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var slug = btn.getAttribute("data-slug");
        var recipe = recipes.find(function (r) { return r.slug === slug; });
        if (recipe && pickerSlotIndex >= 0) {
          planState.slots[pickerSlotIndex] = recipe;
          planState.locks[pickerSlotIndex] = false;
          savePlan();
          closePicker();
          renderPlanner();
        }
      });
    });
  }

  function renderPlanner() {
    loadPlan();
    if (planState.slots.length === 0) {
      for (var i = 0; i < planState.mealCount; i++) {
        planState.slots.push(null);
        planState.locks.push(false);
      }
    }

    var html = '';
    html += '<div class="planner-header">';
    html += '<h1>Meal Planner</h1>';
    html += '<p class="subtitle">Plan meals with overlapping ingredients to save on shopping</p>';
    html += '</div>';

    html += '<div class="planner-controls">';
    html += '<div class="planner-count">';
    html += '<span class="planner-count-label">Meals:</span>';
    for (var c = 2; c <= 5; c++) {
      html += '<button class="planner-count-btn' + (planState.mealCount === c ? ' active' : '') + '" data-count="' + c + '">' + c + '</button>';
    }
    html += '</div>';
    html += '<div class="planner-actions">';
    html += '<button class="planner-btn planner-suggest-btn" id="plannerSuggest">Suggest</button>';
    html += '<button class="planner-btn planner-clear-btn" id="plannerClear">Clear</button>';
    html += '</div>';
    html += '</div>';

    var filledSlots = planState.slots.filter(function (r) { return r !== null; });
    if (filledSlots.length >= 2) {
      var stats = MealMatcher.countOverlap(filledSlots);
      html += '<div class="planner-stats">';
      html += '<span>' + stats.unique + ' unique ingredient' + (stats.unique !== 1 ? 's' : '') + '</span>';
      if (stats.overlap > 0) {
        html += '<span class="planner-stats-overlap">' + stats.overlap + ' shared across meals</span>';
      }
      html += '</div>';
    }

    html += '<div class="planner-slots">';
    for (var s = 0; s < planState.mealCount; s++) {
      var recipe = planState.slots[s];
      var locked = planState.locks[s];
      html += '<div class="planner-slot' + (recipe ? '' : ' empty') + '" data-slot="' + s + '">';
      if (recipe) {
        html += '<div class="planner-slot-content">';
        html += '<div class="planner-slot-info">';
        html += '<span class="planner-slot-num">Meal ' + (s + 1) + '</span>';
        html += '<h3 class="planner-slot-title">' + escapeHtml(recipe.title) + '</h3>';
        var meta = [];
        if (recipe.prep_time) meta.push('Prep: ' + recipe.prep_time);
        if (recipe.cook_time) meta.push('Cook: ' + recipe.cook_time);
        if (meta.length) {
          html += '<span class="planner-slot-meta">' + meta.join(' &middot; ') + '</span>';
        }
        html += '</div>';
        html += '<div class="planner-slot-actions">';
        html += '<button class="planner-lock-btn' + (locked ? ' locked' : '') + '" data-slot="' + s + '" title="' + (locked ? 'Unlock' : 'Lock') + '">';
        html += locked ? '&#128274;' : '&#128275;';
        html += '</button>';
        html += '<button class="planner-swap-btn" data-slot="' + s + '">Swap</button>';
        html += '</div>';
        html += '</div>';
      } else {
        html += '<button class="planner-slot-empty-btn" data-slot="' + s + '">';
        html += '<span class="planner-slot-num">Meal ' + (s + 1) + '</span>';
        html += '<span>Tap to pick a recipe</span>';
        html += '</button>';
      }
      html += '</div>';
    }
    html += '</div>';

    app.innerHTML = html;
    app.scrollTop = 0;

    document.querySelectorAll(".planner-count-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMealCount(parseInt(btn.getAttribute("data-count"), 10));
        renderPlanner();
      });
    });

    document.getElementById("plannerSuggest").addEventListener("click", function () {
      suggestMeals();
      renderPlanner();
    });

    document.getElementById("plannerClear").addEventListener("click", function () {
      clearPlan();
      renderPlanner();
    });

    document.querySelectorAll(".planner-swap-btn, .planner-slot-empty-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openPicker(parseInt(btn.getAttribute("data-slot"), 10));
      });
    });

    document.querySelectorAll(".planner-lock-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-slot"), 10);
        planState.locks[idx] = !planState.locks[idx];
        savePlan();
        renderPlanner();
      });
    });
  }

  // Picker modal events
  document.getElementById("pickerBackdrop").addEventListener("click", closePicker);
  document.getElementById("pickerClose").addEventListener("click", closePicker);
  document.getElementById("pickerSearchInput").addEventListener("input", function (e) {
    renderPickerList(e.target.value);
  });

  // ---- Instructions / Notes rendering ----

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
