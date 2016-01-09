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
            updateProbabilities();
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
            var newElement = dragged.draggable;
            if (!newElement.hasClass("element")) { // it's a surge source, but we want the compiled surge
              newElement = getCompiledSurge();
              resetSurgeSource();
            }
            newElement
                .clone()
                .addClass("target-element")
                .draggable({
                  appendTo: "body",
                  revert: "invalid", // jump back if not dropped on droppable
                  revertDuration: 200
                })
                .appendTo(this);

            updatePlaceholder();
            updateProbabilities();
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
        helper: "clone"
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
        updateProbabilities();
      });

  $("#ranged-minus")
      .click(function() {
        decreaseCount("#ranged-value");
        updateProbabilities();
      });
}

function setupChart() {
  damageChart = $('#chart').highcharts({
    credits: false,
    chart: {
      borderRadius: 5,
      spacing: [8, 2, 2, 2],
    },
    title: {
      text: null,
    },
    yAxis: {
      title: {
        text: null,
      },
      labels: {
        x: 2,

      }
    },
    tooltip: {
      valueSuffix: '%',
    },
    legend: {
      enabled: false,
    },
    series: [{
      id: 'damage',
      name: 'Damage',
      data: []
    }, {
      id: 'surge',
      name: 'Extra Surge',
      data: []
    }]
  });
}

function updateProbabilities() {
  var dice = getDice();
  var modifiers = getModifiers();
  var surgeAbilities = getSurgeAbilities();
  var distance = getDistance();

  var probabilitiesByDamage = calculateDamage(dice, modifiers, surgeAbilities, distance);

  // TODO: Figure out what data is interesting, calculate probabilities

  var chartData = damageToChartData(probabilitiesByDamage);

  var damageChart = $("#chart").highcharts();
  damageChart.get('damage').setData(chartData.damageData);
  damageChart.get('surge').setData(chartData.surgeData);
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
 * Map from die color name (e.g. "yellow") to an int array, which, for each index,
 * array[i] is the number of sides of that color die that have i pow symbols.
 * For example, a die which has only one pow symbol will be represented by [5, 1].
 */
var ATTACK_DIE_POWS = {
  "red" : [0, 1, 3, 2],
  "blue" : [1, 3, 2],
  "green" : [1, 2, 3],
  "yellow" : [2, 3, 1]
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

  // TODO: This currently only works for pow symbols on attack dice. Use accuracy,
  // range, surges, and defense dice, as well as constant modifiers.

  // currentPowOccurrences[i] represents the number of ways given the previously
  // processed dice can come up with exactly i pows.
  currentPowOccurrences = [1];
  // Number of different ways the dice can roll.
  totalPermutations = 1;

  for (var dieColor in dice) {
    dieColorPows = ATTACK_DIE_POWS[dieColor];
    if (typeof dieColorPows !== 'undefined') {
      for (var numDiceRemaining = dice[dieColor]; numDiceRemaining > 0; numDiceRemaining--) {
        totalPermutations *= 6;
        newPowOccurrences = [];
        for (var currentPowsIndex = 0; currentPowsIndex < currentPowOccurrences.length;
            currentPowsIndex++) {
          for (var dieIndex = 0; dieIndex < dieColorPows.length; dieIndex++) {
          if ((currentPowsIndex + dieIndex) >= newPowOccurrences.length) {
            newPowOccurrences[currentPowsIndex + dieIndex] = 0;
          }
            newPowOccurrences[currentPowsIndex + dieIndex] +=
                dieColorPows[dieIndex] * currentPowOccurrences[currentPowsIndex];
          }
        }
        currentPowOccurrences = newPowOccurrences;
	  }
	}
  }
  
  cdfNumerators = [];
  for (var i = 0; i < currentPowOccurrences.length; i++) {
    cdfNumerators[i] = 0;
	for (var j = i; j < currentPowOccurrences.length; j++) {
	  cdfNumerators[i] += currentPowOccurrences[j];
	}
  }

  result = [];
  for (var i = 0; i < currentPowOccurrences.length; i++) {
    result.push({ count: i, damage: (cdfNumerators[i] / totalPermutations), surge: 0});
  }

  return result;
}
