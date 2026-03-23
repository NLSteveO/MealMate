/**
 * Ingredient matching — Jaccard similarity with synonym normalization.
 * Ported from mealmate/matcher.py
 */
var MealMatcher = (function () {
  "use strict";

  var synonymLookup = {};

  function loadSynonyms(synonymMap) {
    synonymLookup = {};
    Object.keys(synonymMap).forEach(function (canonical) {
      var key = canonical.toLowerCase();
      synonymLookup[key] = key;
      synonymMap[canonical].forEach(function (alias) {
        synonymLookup[alias.toLowerCase()] = key;
      });
    });
  }

  function normalize(name) {
    var lower = name.toLowerCase().trim();
    return synonymLookup[lower] || lower;
  }

  function getIngredientSet(recipe) {
    var set = {};
    recipe.ingredients.forEach(function (ing) {
      set[normalize(ing.item)] = true;
    });
    return set;
  }

  function jaccard(setA, setB) {
    var keysA = Object.keys(setA);
    var keysB = Object.keys(setB);
    var union = {};
    var shared = [];

    keysA.forEach(function (k) { union[k] = true; });
    keysB.forEach(function (k) { union[k] = true; });

    keysA.forEach(function (k) {
      if (setB[k]) shared.push(k);
    });

    var unionSize = Object.keys(union).length;
    if (unionSize === 0) return { score: 0, shared: [] };

    return {
      score: shared.length / unionSize,
      shared: shared,
    };
  }

  function findSimilar(target, allRecipes, minScore, limit) {
    minScore = minScore || 0.1;
    limit = limit || 5;

    var targetSet = getIngredientSet(target);
    var matches = [];

    allRecipes.forEach(function (r) {
      if (r.slug === target.slug) return;
      var candidateSet = getIngredientSet(r);
      var result = jaccard(targetSet, candidateSet);
      if (result.score >= minScore) {
        matches.push({
          recipe: r,
          score: result.score,
          percentage: Math.round(result.score * 100),
          shared: result.shared,
        });
      }
    });

    matches.sort(function (a, b) { return b.score - a.score; });
    return matches.slice(0, limit);
  }

  function mergeIngredientSets(recipes) {
    var combined = {};
    recipes.forEach(function (r) {
      var set = getIngredientSet(r);
      Object.keys(set).forEach(function (k) { combined[k] = true; });
    });
    return combined;
  }

  function countOverlap(recipes) {
    var individual = 0;
    recipes.forEach(function (r) {
      individual += Object.keys(getIngredientSet(r)).length;
    });
    var unique = Object.keys(mergeIngredientSets(recipes)).length;
    return { unique: unique, overlap: individual - unique };
  }

  function findMealPlan(allRecipes, numMeals, locked) {
    locked = locked || [];
    var selected = locked.slice();
    var selectedSlugs = {};
    selected.forEach(function (r) { selectedSlugs[r.slug] = true; });

    if (selected.length === 0) {
      var idx = Math.floor(Math.random() * allRecipes.length);
      selected.push(allRecipes[idx]);
      selectedSlugs[allRecipes[idx].slug] = true;
    }

    while (selected.length < numMeals) {
      var combinedSet = mergeIngredientSets(selected);
      var candidates = [];
      var maxOverlap = -1;

      allRecipes.forEach(function (r) {
        if (selectedSlugs[r.slug]) return;
        var candidateSet = getIngredientSet(r);
        var overlap = 0;
        Object.keys(candidateSet).forEach(function (k) {
          if (combinedSet[k]) overlap++;
        });
        candidates.push({ recipe: r, overlap: overlap });
        if (overlap > maxOverlap) maxOverlap = overlap;
      });

      if (candidates.length === 0) break;

      var pool = candidates.filter(function (c) {
        return c.overlap >= Math.max(0, maxOverlap - 2);
      });
      var pick = pool[Math.floor(Math.random() * pool.length)];
      selected.push(pick.recipe);
      selectedSlugs[pick.recipe.slug] = true;
    }

    return selected;
  }

  function rankForPlan(allRecipes, currentRecipes, excludeSlugs) {
    var combinedSet = mergeIngredientSets(currentRecipes);
    var results = [];
    allRecipes.forEach(function (r) {
      if (excludeSlugs[r.slug]) return;
      var candidateSet = getIngredientSet(r);
      var overlap = 0;
      Object.keys(candidateSet).forEach(function (k) {
        if (combinedSet[k]) overlap++;
      });
      results.push({ recipe: r, overlap: overlap });
    });
    results.sort(function (a, b) { return b.overlap - a.overlap; });
    return results;
  }

  return {
    loadSynonyms: loadSynonyms,
    findSimilar: findSimilar,
    findMealPlan: findMealPlan,
    rankForPlan: rankForPlan,
    countOverlap: countOverlap,
    normalize: normalize,
  };
})();
