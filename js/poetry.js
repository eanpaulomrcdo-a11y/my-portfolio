
/* Add future poems as new objects in this collection. Keep the author's wording intact. */

const poems = [
  {
    id: "the-one-that-never-was",
    category: "01 / REFLECTION",
    title: "The One That Never Was",
    paragraphs: [
      // Stanza 1 - 3 lines
      "Ever wondered what it was like to be free?\nThe “What ifs” you’ve lost and dared not to see.\nThe things you could’ve but never tried to be.",

      // Stanza 2 - 3 lines
      "Ever thought what it was like to be three?\nFun, friends, smiles were all you could see.\nInnocent, cheerful and living life as it should be.",

      // Stanza 3 - 4 lines
      "Oh how everything can change in a snap!\nOne moment, you're in euphoria, living the dream.\nNext thing you know, you're falling with nothing to grasp.\nCaught in a current, fighting against the stream.",

      // Stanza 4 - 4 lines
      "Now you're drifting through an endless void,\nStuck in a place where nothing can be changed.\nReaching for that life you once enjoyed,\nHoping somehow what's past be rearranged.",

      // Stanza 5 - 3 lines
      "Time won't turn back, no matter how you plead.\nSeconds keep passing, though it's all unseen.\n'Til all that remains is a life you never lived.",

      // Stanza 6 - 3 lines
      "To the wounds that stubbornly bleed.\nTo the person you could have been.\nTo the promises you once believed.",

      // Final line
      "To the one that never was."
    ]
  },

  {
    id: "a-moment-to-treasure",
    category: "02 / ROMANCE",
    title: "Moments",
    paragraphs: [
      // Stanza 1
      "Baby, thank you for being pure and true,\nFor bringing colors beyond the blue.",

      // Stanza 2
      "I knew there was something special in you,\nFrom the very first moment, did you feel it too?",

      // Stanza 3
      "The timely smiles, the joy you bring,\nCan lift my heart and make me sing.",

      // Stanza 4
      "You walked me gently back into the light,\nAnd showed me once more that life was bright.",

      // Stanza 5
      "I wish that time would cease to flow,\nAnd keep us here, with nowhere to go.",

      // Stanza 6
      "Wait, stop! A time spell I shall cast,\nOh, how I wish this moment could last!",

      // Stanza 7
      "These precious moments I will treasure,\nAnd keep them safe beyond all measure.",

      // Stanza 8
      "Hey, baby! May I hold your hand?\nAnd make forever our own little land?"
    ]
  },

  {
    id: "me-and-you",
    category: "03 / COMPANIONSHIP",
    title: "Us",
    paragraphs: [
      // Stanza 1
      "Me and you;",

      // Stanza 2
      "Through thick and thin,\nthrough every failure and win.\nWe do what we do.",

      // Stanza 3
      "We fight and make up.\nOut of the blue,\nwe learn as we go.",

      // Stanza 4
      "In what is there to come,\nwe might have none or some.\nThere is one thing sure.\nThe love we have will endure.",

      // Closing
      "224 rumble\n143 straight\nHa ha ha happy hearts day!"
    ]
  },

  {
    id: "poem-four",
    category: "04 / REFLECTION",
    title: "Ghosts",
    paragraphs: [
      // Stanza 1
      "As darkness falls and dims the light,\nI find myself alone and restless tonight.\nWhere silence slowly settles in its place,\nAnd shadows dance without a face.",

      // Stanza 2
      "There is fear in the deafening silence,\nYet a strange comfort found in your absence.\nStill, I feel your lingering presence,\nA fading trace beyond my senses.",

      // Stanza 3
      "Whispers carried by the breeze,\nA restless mind that finds no ease.\nEyes closed, yet I still see,\nThe feelings that remain within me.",

      // Stanza 4
      "Is it the dark that makes me fear,\nOr the memories that draw you near?\nFor in the quiet, I somehow find,\nA thousand feelings left behind.",

      // Stanza 5
      "It's still those voices that loudly resound,\nThe echoes that never seem to die down.\nThough time has passed and days have flown,\nThat familiar feeling still feels like home.",

      // Stanza 6
      "Strange how I long for what I left behind,\nA feeling I escaped, yet still wish to find.\nI never ever asked for it to return,\nYet there are parts of me that still yearn.",

      // Stanza 7
      "And when the morning takes the night,\nWill this feeling fade with the light?\nOr will it linger when the sun shines through,\nA quiet reminder of what I once knew?"
    ]
  }
];

// Build the inline accordion from the poem collection above.
const accordion = document.getElementById("poemAccordion");

if (accordion) {
  let openPoemId = null;

  poems.forEach((poem) => {
    const item = document.createElement("article");
    item.className = "poem-accordion-item";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "poem-accordion-trigger";
    trigger.setAttribute("aria-expanded", "false");

    const panelId = `poem-panel-${poem.id}`;
    trigger.setAttribute("aria-controls", panelId);

    const category = document.createElement("span");
    category.className = "poem-accordion-category";
    category.textContent = poem.category;

    const title = document.createElement("span");
    title.className = "poem-accordion-title";
    title.textContent = poem.title;

    const action = document.createElement("span");
    action.className = "poem-accordion-action";
    action.setAttribute("aria-hidden", "true");
    action.textContent = "+";

    trigger.append(category, title, action);

    const panel = document.createElement("div");
    panel.className = "poem-accordion-panel";
    panel.id = panelId;
    panel.hidden = true;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", `${poem.title} poem`);

    const poemText = document.createElement("div");
    poemText.className = "poem-accordion-text";

    poem.paragraphs.forEach((paragraph, index) => {
      const stanza = document.createElement("p");
      stanza.textContent = paragraph;

      if (index === poem.paragraphs.length - 1) {
        stanza.classList.add("poem-ending");
      }

      poemText.appendChild(stanza);
    });

    panel.appendChild(poemText);

    trigger.addEventListener("click", () => {
      const isCurrentlyOpen = openPoemId === poem.id;

      // Keep only one poem expanded at a time.
      accordion.querySelectorAll(".poem-accordion-item").forEach((otherItem) => {
        const otherTrigger = otherItem.querySelector(".poem-accordion-trigger");
        const otherPanel = otherItem.querySelector(".poem-accordion-panel");
        const otherAction = otherItem.querySelector(".poem-accordion-action");

        otherTrigger.setAttribute("aria-expanded", "false");
        otherItem.classList.remove("is-open");
        otherPanel.hidden = true;
        otherAction.textContent = "+";
      });

      if (isCurrentlyOpen) {
        openPoemId = null;
        return;
      }

      openPoemId = poem.id;
      trigger.setAttribute("aria-expanded", "true");
      item.classList.add("is-open");
      panel.hidden = false;
      action.textContent = "−";
    });

    item.append(trigger, panel);
    accordion.appendChild(item);
  });
}
