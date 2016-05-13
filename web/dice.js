function setupDrops() {
  makeElementsDraggable();
  setupElementTrash();
  setupTarget();
  setupSurgeSource();
  makeSurgeDraggable();
}

function makeElementsDraggable() {
  $("#dice-source, #attack-modifiers, #defense-modifiers")
      .find(".element")
          .draggable({
            appendTo: "body",
            helper: "clone",
            revert: "invalid", // jump back if not dropped on droppable
            revertDuration: 200
          });

   $("#surge-source")
      .find(".surge-element")
            .draggable({
              appendTo: "body",
              helper: "clone",
              revert: "invalid", // jump back if not dropped on droppable
              revertDuration: 200
            });
}

/**
 * Allows any element to be dragged to any element source to remove it from the target or surge
 * source.
 */
function setupElementTrash() {
  $("#dice-source, #attack-modifiers, #defense-modifiers")
      .droppable({
        accept: ".surge-element, .target-element",
        drop: function(event, dragged) {
          var draggable = dragged.draggable;
          if (draggable.hasClass("target-element")) {
            draggable.remove();
            updatePlaceholder();
            updateProbabilitiesAsync();
          } else if (draggable.hasClass("surge-element")) {
            if (draggable.hasClass("damage-modifier")) {
              decreaseCount("#surge-damage-count");
            } else if (draggable.hasClass("pierce-modifier")) {
              decreaseCount("#surge-pierce-count");
            } else if (draggable.hasClass("accuracy-modifier")) {
              decreaseCount("#surge-accuracy-count");
            }
          }
        }
      });
}

function setupTarget() {
  $("#target")
        .droppable({
          accept: function(element) {
            return !element.hasClass("target-element") &&
                (element.hasClass("element") || element.attr("id") == "surge-source");
          },
          drop: function(event, dragged) {
            var droppable = this;

            var newElementPromise = Promise.resolve(dragged.draggable);
            if (!dragged.draggable.hasClass("element")) { // it's a surge source, but we want the compiled surge
              newElementPromise = dragged.helper.compiledSurge.then(function(newElement) {
                resetSurgeSource();
                return newElement;
              });

            }
            newElementPromise.then(function(newElement) {
              newElement
                  .clone()
                  .addClass("target-element")
                  .draggable({
                    appendTo: "body",
                    revert: "invalid", // jump back if not dropped on droppable
                    revertDuration: 200
                  })
                  .appendTo(droppable);

              updatePlaceholder();
              updateProbabilitiesAsync();
            });
          }
        });
}

function setupSurgeSource() {
  $("#surge-source")
      .droppable({
        accept: ".damage-modifier, .pierce-modifier, .accuracy-modifier",
        drop: function(event, dragged) {
          var draggable = dragged.draggable;
          if (draggable.hasClass("target-element")) {
            draggable.remove();
          }
          if (draggable.hasClass("damage-modifier")) {
            increaseCount("#surge-damage-count");
          } else if (draggable.hasClass("pierce-modifier")) {
            increaseCount("#surge-pierce-count");
          } else if (draggable.hasClass("accuracy-modifier")) {
            increaseCount("#surge-accuracy-count");
          }
        }
      });
}

function makeSurgeDraggable() {
  // TODO: Only allow dragging (and drag cursor) when there are non-zero values on surge?
  $("#surge-source")
      .draggable({
        appendTo: "body",
        revert: "invalid", // jump back if not dropped on droppable
        revertDuration: 200,
        helper: "clone",
        start: function(event, dragged) {
          // Attach a promise to dragged that computes the compiled surge while the element is being
          // dragged. Because it is a promise it doesn't have to be completed by the time the surge
          // is dropped, the drop() method can just call then() on it to get the eventually computed
          // result.
          dragged.helper.compiledSurge = new Promise(function(resolve, reject) {
           setTimeout(function() {
             resolve(getCompiledSurge());
           }, 0);
          });
        }
      });
}

/**
 * Returns a copy of the current state of #surge-source as a compiled surge element.
 */
function getCompiledSurge() {
  var compiled = $("#compiled-surge-template").clone();
  compiled.find(".compiled-surge-damage-count").text($("#surge-damage-count").text().trim());
  compiled.find(".compiled-surge-pierce-count").text($("#surge-pierce-count").text().trim());
  compiled.find(".compiled-surge-accuracy-count").text($("#surge-accuracy-count").text().trim());
  compiled.removeAttr("id");
  return compiled;
}

function resetSurgeSource() {
  $("#surge-damage-count").text("0");
  $("#surge-pierce-count").text("0");
  $("#surge-accuracy-count").text("0");
}

/**
 * Updates the placeholder in the target area to show only if there are no elements in it.
 */
function updatePlaceholder() {
  if ($("#target").find(".element").length == 0) {
    $("#target-placeholder").show();
  } else {
    $("#target-placeholder").hide();
  }
}

function setupRanged() {
  $("#ranged-plus")
      .click(function() {
        increaseCount("#ranged-value");
        updateProbabilitiesAsync();
      });

  $("#ranged-minus")
      .click(function() {
        decreaseCount("#ranged-value");
        updateProbabilitiesAsync();
      });
}

function setupChart() {
  $('#chart').highcharts({
    credits: false,
    chart: {
      borderRadius: 5,
      spacing: [8, 2, 2, 2],
      type: "areaspline",
      animation: false,
    },
    title: {
      text: null,
    },
    yAxis: {
      title: {
        text: null,
      },
      labels: {
        x: -2,
      },
      max: 100,
      tickInterval: 10,
    },
    xAxis: {
      allowDecimals: false,
      tickInterval: 1,
      min: 1,
    },
    tooltip: {
      valueSuffix: '%',
      shared: true,
      // TODO: Implement more complex formatting function with colors and sorting by value
    },
    legend: {
      enabled: false,
    },
    loading: {
      labelStyle: {
        fontWeight: "bold",
        position: "relative",
        top: "0",
      },
      style: {
        textAlign: "right",
        opacity: .5,
        backgroundColor: "transparent",
      }
    }
  });
}

var pinIdsInUse = [];
function getFreePinId() {
  for (var i = 0; i < 15; ++i) {
    if (pinIdsInUse.indexOf(i) == -1) {
      pinIdsInUse.push(i);
      return i;
    }
  }
  throw "No more pin IDs"; // TODO: Disable Pin button before this becomes necessary.
}

function setupPin() {
  // TODO: Include range in pinned (visuals)
  // TODO: Include re-rolls in pinned
  // TODO: Add clear functionality to remove individual/all pins.
  $("#pin")
      .click(function() {
        // TODO: Don't pin empty area
        // TODO: Don't pin already-pinned configuration
        var pinned = $("<div class='pinned'></div>");
        $("#target")
            .find(".element")
            .each(function(i, element) {
              var pinnedElement = $("<div class='pinned-element'></div>");
              $.each($(element).attr('class').split(/\s+/), function(j, clazz) {
                if (clazz != "element") {
                  pinnedElement.addClass(clazz);
                }
              });
              $(element).find('.element-icon').each(function(k, img) {
                pinnedElement.append($(img).clone());
              });
              // TODO: Copy surge contents, text
              pinnedElement.appendTo(pinned);
            });
        pinned.appendTo($("#pinned-area"));

        var pinId = getFreePinId();
        pinned.css("border-color", CHART_COLORS[pinId]);
        var chartData = getCurrentChartData();
        var toggle = function() {
          togglePinned(pinId, pinned, chartData);
        };
        pinned.click(toggle);
        toggle();
        removeChart("current");
      });
}

function togglePinned(pinId, pinned, chartData) {
  if (pinned.hasClass("pinned-active")) {
    removeChart(pinId);
    pinned.addClass("pinned-inactive");
    pinned.removeClass("pinned-active");
  } else {
    setChartData(pinId, chartData);
    pinned.addClass("pinned-active");
    pinned.removeClass("pinned-inactive");
  }
}

var CHART_COLORS = {
  current: "black",
  0: "#1f77b4",
  1: "#ff7f0e",
  2: "#2ca02c",
  3: "#d62728",
  4: "#9467bd",
  5: "#8c564b",
  6: "#e377c2",
  7: "#7f7f7f",
  8: "#bcbd22",
  9: "#17becf",
  10: "#393b79",
  11: "#637939",
  12: "#8c6d31",
  13: "#ad494a",
  14: "#a55194",
};

/**
 * Aligns the right end of all series by filling shorter series with zero values up to the length
 * of the longest series. If a series was removed, ensures that for at least one series the
 * right-most value is greater than zero (removing zero values from all series at higher x indices).
 *
 * <p>Note: The chart must be redrawn prior to this calculation, as series return their last-drawn
 * data. After this method completes, another redraw is necessary to materialize changes in the
 * chart.
 */
function justifySeries(damageChart) {
  var maxPoints = 0;

  for (var i = 0; i < damageChart.series.length; ++i) {
    for (var j = 0; j < damageChart.series[i].data.length; ++j) {
      if (damageChart.series[i].data[j].y != 0) {
        if (maxPoints < j+1) {
          maxPoints = j+1;
        }
      }
    }
  }

  for (i = 0; i < damageChart.series.length; ++i) {
    if (damageChart.series[i].data.length < maxPoints) {
      for (var k = damageChart.series[i].data.length; k < maxPoints; ++k) {
        damageChart.series[i].addPoint([k, 0], false);
      }
    } else if (damageChart.series[i].data.length > maxPoints) {
      var length = damageChart.series[i].data.length;
      for (k = length; k >= maxPoints; --k) {
        damageChart.series[i].removePoint(k, false);
      }
    }
  }
}

function setChartData(suffix, chartData) {
  // TODO: Don't display empty chart data.

  var damageChart = $("#chart").highcharts();
  var damage = damageChart.get("damage-" + suffix);
  var surge = damageChart.get("surge-" + suffix);
  if (!damage) {
    var color = CHART_COLORS[suffix];
    damage = damageChart.addSeries({
      id: "damage-" + suffix,
      name: "Damage",
      color: color,
      fillOpacity:.2,
      dashStyle: "Solid",
      lineWidth: 2,
      marker: {
        symbol: "circle",
        radius: 3,
      },
      animation: false,
      tooltip: {
        pointFormat: "<b>{series.name}: {point.y}</b><br/>"
      },
    }, false);
    surge = damageChart.addSeries({
      id: "surge-" + suffix,
      name: "Surge",
      color: CHART_COLORS[suffix],
      dashStyle: "LongDash",
      lineWidth: 1,
      fillOpacity:.01,
      marker: {
        symbol: "circle",
        radius: 3,
      },
      animation: false,
      tooltip: {
        pointFormat: "{series.name}: {point.y}<br/>"
      },
    }, false);
  }

  damage.setData(chartData.damageData, false);
  surge.setData(chartData.surgeData, false);

  damageChart.redraw();
  justifySeries(damageChart);
  damageChart.redraw();
}

function removeChart(prefix) {
  var damageChart = $("#chart").highcharts();
  var damage = damageChart.get("damage-" + prefix);
  var surge = damageChart.get("surge-" + prefix);
  if (damage) {
    damage.remove(false);
    surge.remove(false);
  }

  damageChart.redraw();
  justifySeries(damageChart);
  damageChart.redraw();
}

function markGraphUpdating(showUpdating) {
  var damageChart = $("#chart").highcharts();
  if (showUpdating) {
    damageChart.showLoading();
  } else {
    damageChart.hideLoading();
  }
}

function updateProbabilitiesAsync() {
  markGraphUpdating(true);
  setTimeout(function () {
    updateProbabilities();
    markGraphUpdating(false);
  }, 0);
}

function getCurrentChartData() {
  var dice = getDice();
  var modifiers = getModifiers();
  var surgeAbilities = getSurgeAbilities();
  var distance = getDistance();

  var probabilitiesByDamage = calculateDamage(dice, modifiers, surgeAbilities, distance);
  return damageToChartData(probabilitiesByDamage);
}

function updateProbabilities() {
  setChartData("current", getCurrentChartData());
}

function getDistance() {
  return parseInt($("#ranged-value").text());
}

function getSurgeAbilities() {
  var surgeAbilities = [];
  $("#target").find(".compiled-surge").each(function(index, compiledSurge) {
    surgeAbilities.push({
      "damage": parseInt($(compiledSurge).find(".compiled-surge-damage-count").text()),
      "pierce": parseInt($(compiledSurge).find(".compiled-surge-pierce-count").text()),
      "accuracy": parseInt($(compiledSurge).find(".compiled-surge-accuracy-count").text())
    });
  });
  return surgeAbilities;
}

function getModifiers() {
  var target = $("#target");
  return {
    "damage": target.find(".damage-modifier").length,
    "pierce": target.find(".pierce-modifier").length,
    "accuracy": target.find(".accuracy-modifier").length,
    "surge": target.find(".surge-modifier").length,
    "block": target.find(".block-modifier").length,
    "evade": target.find(".evade-modifier").length
  }
}

function getDice() {
  var target = $("#target");
  return {
    "black": target.find(".black-die").length,
    "blue": target.find(".blue-die").length,
    "green": target.find(".green-die").length,
    "red": target.find(".red-die").length,
    "white": target.find(".white-die").length,
    "yellow": target.find(".yellow-die").length
  }
}

/**
 * Increases the numerical text of the DOM element with the given ID by one. Assumes the DOM
 * element has a numerical text to begin with.
 */
function increaseCount(id) {
  $(id).text(parseInt($(id).text()) + 1);
}

/**
 * Decreases the numerical text of the DOM element with the given ID by one, as long as the result
 * is non-negative. Assumes the DOM element has a numerical text to begin with.
 */
function decreaseCount(id) {
  $(id).text(Math.max(0, parseInt($(id).text()) - 1));
}

function damageToChartData(probabilitiesByDamage) {
  var damageData = [];
  var surgeData = [];
  $.each(probabilitiesByDamage.sort(compareByCount), function(_, probabilities) {
    damageData.push([probabilities.label, Math.round(probabilities.damage * 100)]);
    surgeData.push([probabilities.label, Math.round(probabilities.surge * 100)]);
  });

  return {
    damageData: damageData,
    surgeData: surgeData
  };
}

function compareByCount(a, b) {
  return a.count - b.count;
}

/**
 * Creates and returns a size by size by size 3D array (with 0 values).
 */
function array3d(size) {
  result = [];
  for (var i = 0; i < size; i++) {
    result[i] = [];
    for (var j = 0; j < size; j++) {
      result[i][j] = [];
      for (var k = 0; k < size; k++) {
        result[i][j][k] = 0;
      }
    }
  }
  return result;
}

function redDieDefinition() {
  result = [
      { attack: 1, surge: 0, accuracy: 0},
      { attack: 2, surge: 0, accuracy: 0},
      { attack: 2, surge: 0, accuracy: 0},
      { attack: 2, surge: 1, accuracy: 0},
      { attack: 3, surge: 0, accuracy: 0},
      { attack: 3, surge: 0, accuracy: 0}];
  return result;
}

function blueDieDefinition() {
  result = [
      { attack: 0, surge: 1, accuracy: 2},
      { attack: 1, surge: 0, accuracy: 2},
      { attack: 2, surge: 0, accuracy: 3},
      { attack: 1, surge: 1, accuracy: 3},
      { attack: 2, surge: 0, accuracy: 4},
      { attack: 1, surge: 0, accuracy: 5}];
  return result;
}

function greenDieDefinition() {
  result = [
      { attack: 0, surge: 1, accuracy: 1},
      { attack: 1, surge: 1, accuracy: 1},
      { attack: 2, surge: 0, accuracy: 1},
      { attack: 1, surge: 1, accuracy: 2},
      { attack: 2, surge: 0, accuracy: 2},
      { attack: 2, surge: 0, accuracy: 3}];
  return result;
}

function yellowDieDefinition() {
  result = [
      { attack: 0, surge: 1, accuracy: 0},
      { attack: 1, surge: 2, accuracy: 0},
      { attack: 2, surge: 0, accuracy: 1},
      { attack: 1, surge: 1, accuracy: 1},
      { attack: 0, surge: 1, accuracy: 2},
      { attack: 1, surge: 0, accuracy: 2}];
  return result;
}

/**
 * Map from die color name (e.g. "yellow") to a size-6 array of struct defining the attack, surge,
 * and accuracy values on one side of the die.
 */
var ATTACK_DIE_DEFINITIONS = {
  "red" : redDieDefinition(),
  "blue" : blueDieDefinition(),
  "green" : greenDieDefinition(),
  "yellow" : yellowDieDefinition()
}

/**
 * Evaluates whether the given attack stats (attack/surge/accuracy struct) with given
 * surge abilities is capable of doing the given amount of damage.
 * If there is insufficient power, returns -1.
 * Otherwise, returns the number of leftover surges to achieve the amount of damage.
 * For example, if a "~: +2@" surge ability is available with 3 attack and 2 surges, 
 * this will return 1 for damage=4, and this will return 2 for damage=3.
 */
function evaluateDamage(attackStats, defenseStats, surgeAbilities, damage) {
  // TODO: Use accuracy.
  var currentAttack = attackStats.attack;
  var remainingSurges = attackStats.surge - defenseStats.evades;
  var remainingSurgeAbilities = surgeAbilities.slice();
  var currentDefense = defenseStats.defense;
 
  while (remainingSurges > 0) {
    if (currentAttack >= damage) {
	  return remainingSurges;
    }
    var surgeAbility = popBestSurgeAbility(remainingSurgeAbilities);
    if (surgeAbility == null) {
      return -1;
    }
    remainingSurges--;
    currentAttack += surgeAbility.damage;
    currentDefense = Math.max(0, currentDefense - surgeAbility.pierce);
  }
  if (currentAttack >= damage) {
    return 0;
  } else {
    return -1;
  }
}

/**
 * Pops and returns the best applicable surge ability from the list of given surge abilities,
 * Returns null and removes nothing from the list if either the list is empty, or the list
 * contains only surges that do not actually help the attack.
 */
function popBestSurgeAbility(surgeAbilities) {
  // TODO: Use pierce and accuracy, instead of just attack.
  var currentBestAbilityIndex = -1;
  var currentBestAttack = 0;
  for (var index in surgeAbilities) {
    var ability = surgeAbilities[index];
    if (ability.damage > currentBestAttack) {
	  currentBestAbilityIndex = index;
	  currentBestAttack = ability.damage;
	}
  }
  if (currentBestAbilityIndex < 0) {
    return null;
  } else {
    return surgeAbilities.splice(currentBestAbilityIndex, 1)[0];
  }
}

/*
 * Below we use a data representation to aid results calculation, called an "outcome" array.
 * We use a three dimensional array, where arr[i][j][k] is equal to the number of permutations
 * to roll exactly i pow symbols, j surges, and k accuracy.
 */
 
/**
 * Returns the combination of an outcome array and an additional die outcome definition. 
 * For example, if outcomeArray is the outcome array representing rolling a green and yellow die
 * together, and dieOutcomes is the die outcome definition representing rolling a single red die,
 * then this will return the outcome array of rolling a green, yellow, and red die together.
 */
function combineOutcomes(outcomeArray, dieOutcomes) {
  result = array3d(outcomeArray.length);
  for (var dieOutcomeIndex = 0; dieOutcomeIndex < dieOutcomes.length; dieOutcomeIndex++) {
  dieOutcome = dieOutcomes[dieOutcomeIndex];
    for (var i = 0; i + dieOutcome.attack < outcomeArray.length; i++) {
      for (var j = 0; j + dieOutcome.surge < outcomeArray[i].length; j++) {
        for (var k = 0; k + dieOutcome.accuracy < outcomeArray[i][j].length; k++) {
          result[i + dieOutcome.attack][j + dieOutcome.surge][k + dieOutcome.accuracy] +=
              outcomeArray[i][j][k];
        }
      }
    }
  }
  return result;
}

/**
 * Calculates the cumulative probability for at least N damage, for all damage counts possible with
 * the given dice and modifiers.
 *
 * @param dice object of dice count, indexed by color (color name -> int)
 * @param modifiers object of modifiers, indexed by modifier name (modifier name -> int)
 * @param surgeAbilities array of surge ability objects, each consuming a single surge and yielding
 *    the specified modifiers (modifier name -> int)
 * @param distance int representing the ranged distance to target
 * @returns an array containing objects with three fields eache, "count" (int), "damage", the
 *    cumulative probability (float between 0 and 1) to deal at least "count" damage and "surge",
 *    the probability (float between 0 and 1) of having an excess surge if exactly "count" damage is
 *    dealt
 */
function calculateDamage(dice, modifiers, surgeAbilities, distance) {

  // This is a bit of a hack, as it is likely too large to be needed
  // for most calculations. It is also potentially too small for very large
  // calculations, yet practical inputs will not reach over 50 of any attribute.
  outcomesArraySize = 50;
  
  // TODO: This currently only works for pow symbols on attack dice. Use accuracy,
  // range, surges, and defense dice, as well as constant modifiers.

  currentOutcomes = array3d(outcomesArraySize);
  currentOutcomes[0][0][0] = 1;
  // Number of different ways the dice can roll.
  totalPermutations = 1;

  for (var dieColor in dice) {
    dieOutcomes = ATTACK_DIE_DEFINITIONS[dieColor];
    if (typeof dieOutcomes !== 'undefined') {
      for (var numDiceRemaining = dice[dieColor]; numDiceRemaining > 0; numDiceRemaining--) {
        totalPermutations *= 6;
        newPowOccurrences = combineOutcomes(currentOutcomes, dieOutcomes);
        currentOutcomes = newPowOccurrences;
      }
    }
  }
 
  cdfNumerators = [];
  extraSurgeNumerators = [];
  for (var damage = 0; damage < currentOutcomes.length; damage++) {
    cdfNumerators[damage] = 0;
    extraSurgeNumerators[damage] = 0;
    for (var attack = 0; attack < currentOutcomes.length; attack++) {
      for (var surge = 0; surge < currentOutcomes[attack].length; surge++) {
        for (var accuracy = 0; accuracy < currentOutcomes[attack][surge].length; accuracy++) {
          if (currentOutcomes[attack][surge][accuracy] == 0) continue;
          var evaluation = evaluateDamage(
              {attack:attack, surge:surge, accuracy:accuracy},
              {defense:defense, evade:evade},
              surgeAbilities, damage);
          if (evaluation >= 0) {
            cdfNumerators[damage] += currentOutcomes[attack][surge][accuracy];
          }
          if (evaluation >= 1) {
            extraSurgeNumerators[damage] += currentOutcomes[attack][surge][accuracy];
          }
        }
      }
    }
  }

  result = [];
  for (var i = 0; i < currentOutcomes.length; i++) {
    if (cdfNumerators[i] > 0) {
      result.push({ count: i, damage: (cdfNumerators[i] / totalPermutations), surge: (extraSurgeNumerators[i] / totalPermutations)});
    }
  }

  return result;
}
