function setupDrops() {
  makeElementsDraggable();
  setupElementTrash();
  setupTarget();
  setupSurgeSource();
  makeSurgeDraggable();
  setupCombineTarget();
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
            updateTargetPlaceholderAndPin();
            updateProbabilitiesAsync();
          } else if (draggable.hasClass("surge-element")) {
            if (draggable.hasClass("damage-modifier")) {
              decreaseCount("#surge-damage-count");
            } else if (draggable.hasClass("pierce-modifier")) {
              decreaseCount("#surge-pierce-count");
            } else if (draggable.hasClass("accuracy-modifier")) {
              decreaseCount("#surge-accuracy-count");
            }
            updateSurgeSourceDraggableState();
          }
        }
      });
}

function setupTarget() {
  var target = $("#target");

  target.droppable({
      accept: function(element) {
        return !element.hasClass("target-element") &&
            (element.hasClass("element") || element.attr("id") == "surge-source");
      },
      drop: function(event, dragged) {
        var droppable = this;

        //noinspection JSUnresolvedVariable
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

          updateTargetPlaceholderAndPin();
          updateProbabilitiesAsync();
        });
      }
    });

  target.longclick(700, function(eventData) {
    setTimeout(function() {
      $("#target-menu").modal({
        showClose: false,
      });
    }, 0);

    eventData.stopImmediatePropagation();
    eventData.preventDefault(); // Make sure long click doesn't click on modal.
    return false;
  });

  // $("#target-menu-close").click(function() {
  //   $.modal.close();
  // });
}

function makeSingleSurgeSource() {
  $("#surge-label")
      .removeClass("double-surge")
      .addClass("single-surge");
  $("#surge-label-icon2").hide();
}

function makeDoubleSurgeSource() {
  $("#surge-label")
      .removeClass("single-surge")
      .addClass("double-surge");
  $("#surge-label-icon2").show();
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
          updateSurgeSourceDraggableState();
        }
      });

  $("#surge-label")
      .click(function() {
        if ($("#surge-label").hasClass("double-surge")) {
          makeSingleSurgeSource();
        } else {
          makeDoubleSurgeSource();
        }
      });
}

function makeSurgeDraggable() {
  $("#surge-source")
      .draggable({
        appendTo: "body",
        revert: "invalid", // jump back if not dropped on droppable
        revertDuration: 200,
        helper: "clone",
        disabled: true, // starts disabled since it's empty
        start: function(event, dragged) {
          // Attach a promise to dragged that computes the compiled surge while the element is being
          // dragged. Because it is a promise it doesn't have to be completed by the time the surge
          // is dropped, the drop() method can just call then() on it to get the eventually computed
          // result.
          //noinspection JSUnresolvedFunction
          dragged.helper.compiledSurge = new Promise(function(resolve) {
           setTimeout(function() {
             resolve(getCompiledSurge());
           }, 0);
          });
        }
      });
}

function updateSurgeSourceDraggableState() {
  var surgeValue = parseInt($("#surge-damage-count").text()) +
      parseInt($("#surge-pierce-count").text()) + parseInt($("#surge-accuracy-count").text());
  if (surgeValue > 0) {
    $("#surge-source").draggable("enable").css("cursor", "alias");
  } else {
    $("#surge-source").draggable("disable").css("cursor", "default");
  }
}

/**
 * Returns a copy of the current state of #surge-source as a compiled surge element.
 */
function getCompiledSurge() {
  var compiled = $("#compiled-surge-template").clone();
  if ($("#surge-label").hasClass("double-surge")) {
    compiled.find(".compiled-surge-label").removeClass("single-surge");
    compiled.find(".compiled-surge-label").addClass("double-surge");
    compiled.find(".compiled-surge-cost2").show();
  }

  compiled.find(".compiled-surge-damage-count").text($("#surge-damage-count").text().trim());
  compiled.find(".compiled-surge-pierce-count").text($("#surge-pierce-count").text().trim());
  compiled.find(".compiled-surge-accuracy-count").text($("#surge-accuracy-count").text().trim());
  compiled.removeAttr("id");
  return compiled;
}

function resetSurgeSource() {
  makeSingleSurgeSource();
  $("#surge-cost-count").text("1");
  $("#surge-damage-count").text("0");
  $("#surge-pierce-count").text("0");
  $("#surge-accuracy-count").text("0");
  updateSurgeSourceDraggableState();
}

/**
 * Updates the placeholder in the target area to show only if there are no elements in it.
 */
function updateTargetPlaceholderAndPin() {
  if ($("#target").find(".element").length == 0) {
    $("#target-placeholder").show();
    $("#pin").addClass("disabled");
  } else {
    $("#target-placeholder").hide();
    $("#pin").removeClass("disabled");
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

var nextPinId = 0;
var colorsInUse = [];

/**
 * Returns a previously unused color and allocates it as used.
 */
function allocateColor() {
  for (var i = 0; i < 14; ++i) {
    if (!(i in colorsInUse)) {
      colorsInUse.push(i);
      if (colorsInUse.length == 14) {
        $("#pin").addClass("disabled");
      }
      return i;
    }
  }
  throw "No more available colors";
}

/**
 * Initializes the clear button.
 */
function setupClear() {
  $("#clear")
      .click(function() {
        $("#target").find(".target-element").remove();
        updateTargetPlaceholderAndPin();
        updateProbabilitiesAsync();
      });
}

var pinnedDamageData = [];

function adjustPinnedAreaSize() {
  var pinnedArea = $("#pinned-area");
  if (pinnedArea.find(".pinned").length > 4) {
    pinnedArea.css("height", "73px"); // normal height + 15px for horizontal scroll bar
  } else {
    pinnedArea.css("height", "58px"); // normal height
  }
}

/**
 * Initializes the pin button.
 */
function setupPin() {
  // TODO: Include re-rolls in pinned
  // TODO: Add clear functionality to remove individual/all pins.
  $("#pin")
      .click(function() {
        var targetElements = $("#target").find(".element");

        if (targetElements.length == 0 || colorsInUse.length == 14) {
          return;
        }

        var pinnedArea = $("#pinned-area");

        var pinned = $("<div class='pinned'></div>");
        targetElements
            .each(function(_, element) {
              $(element).clone().removeClass("element").addClass("pinned-element").appendTo(pinned);
            });
        if (getDistance() > 0) {
          $("<div class='pinned-range'>" + getDistance() +"</div>")
              // "relative" positioning is relative to the location of the element, not the parent.
              // So here we account for where the element would be, depending on the number of other
              // elements in the pinned item and then move it to the bottom right.
              .css("top", (37 - Math.floor(targetElements.length / 4) * 11) + "px")
              .css("left", (36 - (targetElements.length % 4) * 11) + "px")
              .appendTo(pinned);
        }
        pinned.appendTo(pinnedArea);

        adjustPinnedAreaSize();

        pinned.draggable({
          appendTo: "body",
          helper: "clone",
          revert: "invalid", // jump back if not dropped on droppable
          revertDuration: 200
        });

        var pinId = nextPinId++;
        var colorId = allocateColor();
        pinned.css("border-color", CHART_COLORS[colorId]);
        pinned.addClass("pin-" + pinId);
        var damageData = getCurrentDamage();
        pinnedDamageData[pinId] = damageData;

        var chartData = damageToChartData(damageData);
        var toggle = function() {
          togglePinned(pinId, pinned, chartData, colorId);
        };
        pinned.click(toggle);
        toggle();
        removeChart("current");
      });

  // Set up trashing of combineds.
  $("#pinned-area")
      .droppable({
        accept: ".combined",
        drop: function(event, dragged) {
          var draggable = dragged.draggable;
          draggable.remove();
          updateCombined();
          updateCombinedPlaceholderAndState();
        }
      });
}

function togglePinned(pinId, pinned, chartData, colorId) {
  if (pinned.hasClass("pinned-active")) {
    removeChart(pinId);
    pinned.addClass("pinned-inactive");
    pinned.removeClass("pinned-active");
  } else {
    setChartData(pinId, chartData, colorId);
    pinned.addClass("pinned-active");
    pinned.removeClass("pinned-inactive");
  }
}

function setupCombineTarget() {
  $("#combine-area")
      .droppable({
        accept: function(element) {
          return element.hasClass("pinned") && !element.hasClass("combined") &&
              $(this).find(".combined").length < 5;
        },
        drop: function(event, dragged) {
          var draggable = dragged.draggable;
          if (draggable.hasClass("combined")) {
            return;
          }

          var combined = draggable.clone()
              .addClass("combined")
              .draggable({
                appendTo: "body",
                revert: "invalid", // jump back if not dropped on droppable
                revertDuration: 200
              })
              .appendTo(this);

          updateCombined();
          updateCombinedPlaceholderAndState();
        }
      });
}

function combinedElementToPinId(combinedElement) {
  var pinId = -1;
  $.each($(combinedElement).attr('class').split(/\s+/), function(_, clazz) {
    if (/pin-\d+/.test(clazz)) {
      pinId = clazz.substring(4);
    }
  });
  if (pinId > -1) {
    return pinId;
  }
  throw "input is not a combined element";
}

function updateCombined() {
  var selectedDamages = [];
  $("#combine-area").find(".combined").each(function(_, combinedElement) {
    var pinId = combinedElementToPinId(combinedElement);
    selectedDamages.push(pinnedDamageData[pinId]);
  });
  var combinedDamage = combineCdfs(selectedDamages);
  var chartData =  damageToChartData(combinedDamage);
  setCombinedChartData("combined", chartData, "combined");
}

function updateCombinedPlaceholderAndState() {
  var combinedArea = $("#combine-area");
  if (combinedArea.find(".combined").length == 0) {
    $("#combined-placeholder").show();
    combinedArea.css("border-width", "0");
  } else {
    $("#combined-placeholder").hide();
    combinedArea.css("border-width", "2px");
  }
}

var CHART_COLORS = {
  current: "black",
  combined: "#a55194",
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

/**
 * Returns a string with a list of divs, one for each pin in {@code this.points}.
 *
 * <p>A pin is commonly represented by two series of the same color, damage and surge, but may have
 * only the former. Divs are sorted by damage and then extra surge probability for that pin and
 * match its color.
 */
function tooltipFormatter() {
  var pinMap = {};
  var pinList = [];
  $.each(this.points, function() {
    var type = this.series.name.toLowerCase();
    var pinId = this.color;
    if (!(pinId in pinMap)) {
      pinMap[pinId] = {};
      pinList.push(pinMap[pinId]);
    }
    pinMap[pinId][type] = this.y;
    pinMap[pinId]["color"] = this.color;
  });

  pinList.sort(function(a, b) {
    function mapGet(map, key, defaultValue) {
      return key in map ? map[key] : defaultValue;
    }
    var damageDifference = b["damage"] - a["damage"];
    if (damageDifference == 0) {
      return mapGet(b, "surge", 0) - mapGet(a, "surge", 0);
    }
    return damageDifference;
  });

  var s = '';

  $.each(pinList, function(_, point) {
    s += '<div style="color:' + point["color"] + '">';
    s += '<img src="icons/damage.svg" class="tooltip-damage">' + point["damage"] + '% ';
    if ("surge" in point) {
      s += '<img src="icons/surge.svg" class="tooltip-surge">' + point["surge"] + '%';
    }
    s += '</div>';
  });

  return s;
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
      shared: true,
      formatter: tooltipFormatter,
      useHTML: true,
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

function setChartData(suffix, chartData, colorId) {
  var damageChart = $("#chart").highcharts();
  var damage = damageChart.get("damage-" + suffix);
  var surge = damageChart.get("surge-" + suffix);

  // This series has zero damage starting with x == 1, don't display it.
  if (!(1 in chartData.damageData)) {
    if (damage) {
      damage.remove();
      surge.remove();
    }
    return;
  }

  if (!damage) {
    var color = CHART_COLORS[colorId];
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
    }, false);
    surge = damageChart.addSeries({
      id: "surge-" + suffix,
      name: "Surge",
      color: CHART_COLORS[colorId],
      dashStyle: "LongDash",
      lineWidth: 1,
      fillOpacity:.01,
      marker: {
        symbol: "circle",
        radius: 3,
      },
      animation: false,
    }, false);
  }

  damage.setData(chartData.damageData, false);
  surge.setData(chartData.surgeData, false);

  damageChart.redraw();
  justifySeries(damageChart);
  damageChart.redraw();
}

function setCombinedChartData(suffix, chartData, colorId) {
  var damageChart = $("#chart").highcharts();
  var damage = damageChart.get("damage-" + suffix);

  // This series has zero damage starting with x == 1, don't display it.
  if (!(1 in chartData.damageData)) {
    if (damage) {
      damage.remove();
    }
    return;
  }

  if (!damage) {
    var color = CHART_COLORS[colorId];
    damage = damageChart.addSeries({
      id: "damage-" + suffix,
      name: "Damage",
      color: color,
      fillOpacity:.2,
      dashStyle: "Dot",
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
  }

  damage.setData(chartData.damageData, false);

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

function getCurrentDamage() {
  var dice = getDice();
  var modifiers = getModifiers();
  var surgeAbilities = getSurgeAbilities();
  var distance = getDistance();

  return calculateDamage(dice, modifiers, surgeAbilities, distance);
}

function getCurrentChartData() {
  var probabilitiesByDamage = getCurrentDamage();
  return damageToChartData(probabilitiesByDamage);
}

function updateProbabilities() {
  setChartData("current", getCurrentChartData(), "current");
}

function getDistance() {
  return parseInt($("#ranged-value").text());
}

function getSurgeAbilities() {
  var surgeAbilities = [];
  $("#target").find(".compiled-surge").each(function(_, compiledSurge) {
    surgeAbilities.push({
      "cost": $(compiledSurge).find(".compiled-surge-label").hasClass("double-surge") ? 2 : 1,
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
 * Creates and returns a size by size by size 2D array (with 0 values).
 */
function array2d(size) {
  var result = [];
  for (var i = 0; i < size; i++) {
    result[i] = [];
    for (var j = 0; j < size; j++) {
      result[i][j] = 0;
    }
  }
  return result;
}

/**
 * Creates and returns a size by size by size 3D array (with 0 values).
 */
function array3d(size) {
  var result = [];
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
  return [
      { attack: 1, surge: 0, accuracy: 0},
      { attack: 2, surge: 0, accuracy: 0},
      { attack: 2, surge: 0, accuracy: 0},
      { attack: 2, surge: 1, accuracy: 0},
      { attack: 3, surge: 0, accuracy: 0},
      { attack: 3, surge: 0, accuracy: 0}];
}

function blueDieDefinition() {
  return [
      { attack: 0, surge: 1, accuracy: 2},
      { attack: 1, surge: 0, accuracy: 2},
      { attack: 2, surge: 0, accuracy: 3},
      { attack: 1, surge: 1, accuracy: 3},
      { attack: 2, surge: 0, accuracy: 4},
      { attack: 1, surge: 0, accuracy: 5}];
}

function greenDieDefinition() {
  return [
      { attack: 0, surge: 1, accuracy: 1},
      { attack: 1, surge: 1, accuracy: 1},
      { attack: 2, surge: 0, accuracy: 1},
      { attack: 1, surge: 1, accuracy: 2},
      { attack: 2, surge: 0, accuracy: 2},
      { attack: 2, surge: 0, accuracy: 3}];
}

function yellowDieDefinition() {
  return [
      { attack: 0, surge: 1, accuracy: 0},
      { attack: 1, surge: 2, accuracy: 0},
      { attack: 2, surge: 0, accuracy: 1},
      { attack: 1, surge: 1, accuracy: 1},
      { attack: 0, surge: 1, accuracy: 2},
      { attack: 1, surge: 0, accuracy: 2}];
}

function whiteDieDefinition() {
  return [
      { defense: 0, evade: 0},
      { defense: 0, evade: 1},
      { defense: 1, evade: 0},
      { defense: 1, evade: 1},
      { defense: 1, evade: 1},
      // This is a dodge. Note that for impractically large attack
      // pools, this will provide an inaccurate result. Unfortunately
      // this needs to be bounded by the size of defense outcome arrays.
      // TODO: fix this.
      { defense: 30, evade: 0}];
}

function blackDieDefinition() {
  return [
      { defense: 0, evade: 1},
      { defense: 1, evade: 0},
      { defense: 1, evade: 0},
      { defense: 2, evade: 0},
      { defense: 2, evade: 0},
      { defense: 3, evade: 0}];
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
};

/**
 * Map from die color name (e.g. "yellow") to a size-6 array of struct defining the attack, surge,
 * and accuracy values on one side of the die.
 */
var DEFENSE_DIE_DEFINITIONS = {
  "black" : blackDieDefinition(),
  "white" : whiteDieDefinition()
};

/**
 * Evaluates whether the given attack stats (attack/surge/accuracy struct) with given
 * surge abilities is capable of doing the given amount of damage at the given distance.
 * Returns the amount of surges left over to reach the given attack value, or, if reaching
 * the attack value is impossible with the given surge abilities, returns -1.
 * Otherwise, returns the number of leftover surges to achieve the amount of damage.
 * For example, if a "~: +2@" surge ability is available with 3 attack and 2 surges, 
 * this will return 1 for damage=4, and this will return 2 for damage=3.
 */
function evaluateDamage(attackStats, defenseStats, surgeAbilities, damage, distance) {
  var bestResult = -1;
  var availableSurges = Math.max(0, attackStats.surge - defenseStats.evade);

  // Since we know the cost of each surge is at least 1, we know not to select
  // more abilities than available surges.
  for (var abilitiesToUse = 0; abilitiesToUse <= availableSurges
      && abilitiesToUse <= surgeAbilities.length; abilitiesToUse++) {
    var waysToChoose = nChooseRGenerator(surgeAbilities.length, abilitiesToUse);
    $.each(waysToChoose, function(_, chooseIndices) {
      var surgeAbilitiesToCheck = [];
      var totalCost = 0;
      for (var i = 0; i < chooseIndices.length; i++) {
        surgeAbilitiesToCheck = surgeAbilitiesToCheck.concat(
            surgeAbilities[chooseIndices[i]]);
        totalCost += surgeAbilities[chooseIndices[i]].cost;
      }
      if (totalCost > availableSurges) return;
      if (meetsAttackRequirement(attackStats.attack, attackStats.accuracy, defenseStats.defense,
          surgeAbilitiesToCheck, damage, distance)) {
        bestResult = Math.max(bestResult, availableSurges - totalCost);
      }
    });
  }
  return bestResult;
}

/**
 * Generator which enumerates all possibilites of choosing r objects from
 * n total objects. Each iteration returns an array of which objects
 * are selected, with object IDs ranging from 0 to (n-1).
 *
 * For example, n=3, r=2 would provide [0, 1], then [0, 2], then [1, 2].
 */
function nChooseRGenerator(n, r) {
  var currentState = [];
  for (var j=0; j<r; j++) {
    currentState = currentState.concat(j);
  }
  var results = [];
  while (true) {
    results.push(currentState.slice());
    // Start from the last digit and attempt to increment, iterate
    // back towards the start until one can be incremented.
    for (var i=r-1; i >= 0; i--) {
      var positionsFromRight = r-1-i;
      if (currentState[i] < n - 1 - positionsFromRight) {
        // Can be incremented, so increment.
        currentState[i]++;
        // Reset all digits past this one to their lowest possible values.
        for (i++; i<r; i++) {
          currentState[i] = currentState[i-1]+1;
        }
        break;
      }
    }
    if (i < 0) {
      // Was unable to increment, so there's nothing more to enumerate.
      return results;
    }
  }
}

/**
 * Returns true if the given attack and accuracy values, after applying ALL given
 * surge abilities in surgeAbilities, deal at least the given amount of damage
 * at the given distance.
 */
function meetsAttackRequirement(attack, accuracy, defense, surgeAbilities, damage, distance) {
  $.each(surgeAbilities, function(_, surgeAbility) {
    attack += surgeAbility.damage;
    accuracy += surgeAbility.accuracy;
    defense = Math.max(0, defense - surgeAbility.pierce);
  });
  return (accuracy >= distance) && (Math.max(0, attack - defense) >= damage);
}

/*
 * Below we use a data representation to aid results calculation, called an "outcome" array.
 * For attack dice, we use a three dimensional array, where arr[i][j][k] is equal to the number of permutations
 * to roll exactly i pow symbols, j surges, and k accuracy.
 * For defense dice, we use a two dimensional array, where arr[x][y] is equal to the number of permutations
 * to roll exactly x defense, and y evades.
 */
 
/**
 * Returns the combination of an outcome array and an additional die outcome definition. 
 * For example, if outcomeArray is the outcome array representing rolling a green and yellow die
 * together, and dieOutcomes is the die outcome definition representing rolling a single red die,
 * then this will return the outcome array of rolling a green, yellow, and red die together.
 */
function combineAttOutcomes(outcomeArray, dieOutcomes) {
  var result = array3d(outcomeArray.length);
  for (var dieOutcomeIndex = 0; dieOutcomeIndex < dieOutcomes.length; dieOutcomeIndex++) {
    var dieOutcome = dieOutcomes[dieOutcomeIndex];
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
 * Returns the combination of an outcome array and an additional die outcome definition.
 * Like combineAttOutcomes, except using defense outcome arrays and defense dice. 
 */
function combineDefOutcomes(outcomeArray, dieOutcomes) {
  var result = array2d(outcomeArray.length);
  for (var dieOutcomeIndex = 0; dieOutcomeIndex < dieOutcomes.length; dieOutcomeIndex++) {
    var dieOutcome = dieOutcomes[dieOutcomeIndex];
    for (var i = 0; i + dieOutcome.defense < outcomeArray.length; i++) {
      for (var j = 0; j + dieOutcome.evade < outcomeArray[i].length; j++) {
          result[i + dieOutcome.defense][j + dieOutcome.evade] += outcomeArray[i][j];
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
  // calculations, yet practical inputs will not reach over 30 of any attribute.
  var outcomesArraySize = 31;
  
  var currentAttOutcomes = array3d(outcomesArraySize);
  currentAttOutcomes[0][0][0] = 1;
  var currentDefOutcomes = array2d(outcomesArraySize);
  currentDefOutcomes[0][0] = 1;
  // Number of different ways the dice can roll.
  var totalPermutations = 1;

  $.each(dice, function(dieColor) {
    var attDieOutcomes = ATTACK_DIE_DEFINITIONS[dieColor];
    var defDieOutcomes = DEFENSE_DIE_DEFINITIONS[dieColor];
    if (typeof attDieOutcomes !== 'undefined') {
      for (var attDiceRemaining = dice[dieColor]; attDiceRemaining > 0; attDiceRemaining--) {
        totalPermutations *= 6;
        currentAttOutcomes = combineAttOutcomes(currentAttOutcomes, attDieOutcomes);
      }
    }
    if (typeof defDieOutcomes !== 'undefined') {
      for (var defDiceRemaining = dice[dieColor]; defDiceRemaining > 0; defDiceRemaining--) {
        totalPermutations *= 6;
        currentDefOutcomes = combineDefOutcomes(currentDefOutcomes, defDieOutcomes);
      }
    }
  });
 
  var cdfNumerators = [];
  var extraSurgeNumerators = [];
  for (var damage = 0; damage < currentAttOutcomes.length; damage++) {
    cdfNumerators[damage] = 0;
    extraSurgeNumerators[damage] = 0;
    for (var attack = 0; attack < currentAttOutcomes.length; attack++) {
      for (var surge = 0; surge < currentAttOutcomes[attack].length; surge++) {
        for (var accuracy = 0; accuracy < currentAttOutcomes[attack][surge].length; accuracy++) {
          if (currentAttOutcomes[attack][surge][accuracy] == 0) continue;
          for (var defense = 0; defense < currentDefOutcomes.length; defense++) {
            for (var evade = 0; evade < currentDefOutcomes[defense].length; evade++) {
              if (currentDefOutcomes[defense][evade] == 0) continue;
              var evaluation = evaluateDamage(
                  {attack:(attack + modifiers.damage), surge:(surge + modifiers.surge), accuracy:(accuracy + modifiers.accuracy)},
                  {defense:(Math.max(0, defense + modifiers.block - modifiers.pierce)), evade:(evade + modifiers.evade)},
                  surgeAbilities, damage,
                  distance);
              if (evaluation >= 0) {
                cdfNumerators[damage] += currentAttOutcomes[attack][surge][accuracy] * currentDefOutcomes[defense][evade];
              }
              if (evaluation >= 1) {
                extraSurgeNumerators[damage] += currentAttOutcomes[attack][surge][accuracy] * currentDefOutcomes[defense][evade];
              }
            }
          }
        }
      }
    }
  }

  var result = [];
  for (var i = 0; i < currentAttOutcomes.length; i++) {
    if (cdfNumerators[i] > 0) {
      result.push({ count: i, damage: (cdfNumerators[i] / totalPermutations), surge: (extraSurgeNumerators[i] / totalPermutations)});
    }
  }

  return result;
}

/**
 * Combines one or more CDFs additively. Note that since CDF values are rounded to the nearest
 * percent, there is some precision lost.
 *
 * @param cdfs an array of cdf arrays. Each cdf array should contain elements with three defined fields:
 *     "count", "damage", and "surge".
 * @return a single cdf array, with surge values set to 0 (as they do not make sense cumulatively)
 */
function combineCdfs(cdfs) {
  var cumulativePdf = [1];
  for (var i = 0; i < cdfs.length; i++) {
    var cleanCdf = graphToCleanCdf(cdfs[i]);
    var pdf = cdfToPdf(cleanCdf);
    cumulativePdf = combinePdfs(pdf, cumulativePdf);
  }
  var cleanResultCdf = pdfToCdf(cumulativePdf);
  var result = [];
  for (var j = 0; j < cleanResultCdf.length; j++) {
    if (cleanResultCdf[j] > 0) {
      result.push({ count: j, damage: cleanResultCdf[j], surge: 0});
    }
  }
  return result;
}

/**
 * Combines two PDFs additively.
 *
 * @return a pdf array. pdf[i] represents the probability that the value is exactly i.
 */
function combinePdfs(pdf1, pdf2) {
  var resultPdf = [];
  var total = 0;
  for (var i = 0; i < pdf1.length + pdf2.length - 1; i++) {
    resultPdf[i] = 0;
  }
  for (var j = 0; j < pdf1.length; j++) {
    for (var k = 0; k < pdf2.length; k++) {
      resultPdf[j+k] += (pdf1[j] * pdf2[k]);
      if (!(j == 0 && k == 0)) {
        total += (pdf1[j] * pdf2[k]);
      }
    }
  }
  // Here we set pdf[0] to the remainder, to account for rounding errors.
  resultPdf[0] = 1 - total;

  return resultPdf; 
}

/**
 * Given a CDF array, returns a PDF array.
 *
 * @param cdf a clean cdf array. cdf[i] represents the probability that the value is at least i.
 * @return a pdf array. pdf[i] represents the probability that the value is exactly i.
 */
function cdfToPdf(cdf) {
  var pdf = [];
  for (var i = 0; i < cdf.length - 1; i++) {
    pdf[i] = cdf[i] - cdf[i+1];
  }
  pdf[cdf.length - 1] = cdf[cdf.length - 1];
  return pdf;
}

/**
 * Given a graph-compatible CDF array, return a "clean" CDF array.
 *
 * @param graphCdf a "cdf" array containing elements with three defined fields:
 *     "count", "damage", and "surge".
 * @return a clean cdf array. cdf[i] represents the probability that the value is at least i.
 */
function graphToCleanCdf(graphCdf) {
  var cleanCdf = [];
  for (var i = 0; i < graphCdf.length; i++) {
    cleanCdf[graphCdf[i].count] = graphCdf[i].damage; 
  }
  return cleanCdf;
}

/**
 * Given a PDF array, returns a "clean" CDF array.
 *
 * @param pdf a pdf array. pdf[i] represents the probability that the value is exactly i.
 * @return a clean cdf array. cdf[i] represents the probability that the value is at least i.
 */
function pdfToCdf(pdf) {
  var cdf = [];
  cdf[0] = 1;
  for (var i = 1; i < pdf.length; i++) {
    cdf[i] = cdf[i-1] - pdf[i-1];
  }
  return cdf;
}
