function setupDrops() {
  $("#dice-source")
      .find(".die")
          .draggable({
            appendTo: "body",
            helper: "clone"
          });
  $("#dice-source")
      .droppable({
        accept: ".target-die",
        drop: function(event, dragged) {
          dragged.draggable.remove();
          if ($("#dice-target").find(".die").length == 0) {
            $("#dice-placeholder").show();
          }
        }
      });

  $("#dice-target")
      .droppable({
        accept: ".source-die",
        drop: function(event, dragged) {
          $("#dice-placeholder").hide();
          dragged.draggable
              .clone()
              .removeClass("source-die")
              .addClass("target-die")
              .draggable({
                appendTo: "body",
                revert: "invalid", // jump back if not dropped on droppable
                revertDuration: 200
              })
              .appendTo(this);
          updateProbabilities();
        }
      });
}

function updateProbabilities() {
  var dice = getDice();

  // TODO: Figure out what data is interesting, calculate probabilities
  // TODO: Display probabilities

  $("#probabilities").empty();
  var diceString = "";
  $.each(dice, function(color, count) {
    diceString += color + ": " + count + ", ";
  });
  $("<div>" + diceString.substring(0, diceString.length-2) + "</div>").appendTo("#probabilities");
}

function getDice() {
  var target = $("#dice-target");
  return {
    "black": target.find(".black-die").length,
    "blue": target.find(".blue-die").length,
    "green": target.find(".green-die").length,
    "red": target.find(".red-die").length,
    "white": target.find(".white-die").length,
    "yellow": target.find(".yellow-die").length
  }
}
