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

  return {
    loadSynonyms: loadSynonyms,
    findSimilar: findSimilar,
    normalize: normalize,
  };
})();
