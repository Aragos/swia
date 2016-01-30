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

function setupPin() {
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
              pinnedElement.appendTo(pinned);
            });
        pinned.appendTo($("#pinned-area"));
        
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
function evaluateDamage(attackStats, surgeAbilities, damage) {
  // TODO: Use defense stats as well as pierce information.
  // TODO: Use accuracy.
  var currentAttack = attackStats.attack;
  var remainingSurges = attackStats.surge;
  var remainingSurgeAbilities = surgeAbilities.slice();
  
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
		      {attack:attack, surge:surge, accuracy:accuracy}, surgeAbilities, damage);
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
