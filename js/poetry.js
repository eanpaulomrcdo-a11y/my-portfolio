/* Add future poems as new objects in this collection. Keep the author's wording intact. */
const poems = [
  {
    id: "the-one-that-never-was",
    category: "01 / REFLECTION",
    title: "The One That Never Was",
    paragraphs: [
      "Ever wondered what it was like to be free?",
      "The “What ifs” you’ve lost and dared not to see.",
      "The things you could’ve but never tried to be.",
      "Ever thought what it was like to be three?",
      "Fun, friends, smiles were all you could see.",
      "Innocent, cheerful and living life as it should be.",
      "Oh how everything can change in a snap!",
      "One moment, you're in euphoria, living the dream.",
      "Next thing you know, you're falling with nothing to grasp.",
      "Caught in a current, fighting against the stream.",
      "Now you're drifting through an endless void,",
      "Stuck in a place where nothing can be changed.",
      "Reaching for that life you once enjoyed,",
      "Hoping somehow what's past be rearranged.",
      "Time won't turn back, no matter how you plead.",
      "Seconds keep passing, though it's all unseen.",
      "'Til all that remains is a life you never lived.",
      "To the wounds that stubbornly bleed.",
      "To the person you could have been.",
      "To the promises you once believed.",
      "To the one that never was."
    ]
  },
  {
    id: "a-moment-to-treasure",
    category: "02 / ROMANCE",
    title: "A Moment to Treasure",
    paragraphs: [
      "Baby, thank you for being pure and true,\nFor bringing colors beyond the blue.",
      "I knew there was something special in you,\nFrom the very first moment, did you feel it too?",
      "The timely smiles, the joy you bring,\nCan lift my heart and make me sing.",
      "You walked me gently back into the light,\nAnd showed me once more that life was bright.",
      "I wish that time would cease to flow,\nAnd keep us here, with nowhere to go.",
      "Wait, stop! A time spell I shall cast,\nOh, how I wish this moment could last!",
      "These precious moments I will treasure,\nAnd keep them safe beyond all measure.",
      "Hey, baby! May I hold your hand?\nAnd make forever our own little land?"
    ]
  },
  {
    id: "me-and-you",
    category: "03 / COMPANIONSHIP",
    title: "Me and You",
    paragraphs: [
      "Me and you;",
      "Through thick and thin,\nthrough every failure and win.",
      "We do what we do.",
      "We fight and make up.\nOut of the blue,\nwe learn as we go.",
      "In what is there to come,\nwe might have none or some.",
      "There is one thing sure.\nThe love we have will endure.",
      "224 rumble\n143 straight\nHa ha ha happy hearts day!"
    ]
  }
];

const collectionView = document.getElementById("poetryCollectionView");
const readerView = document.getElementById("poemReaderView");
const poemList = document.getElementById("poemList");
const readerCategory = document.getElementById("readerCategory");
const readerTitle = document.getElementById("readerTitle");
const readerText = document.getElementById("readerText");
const backButton = document.getElementById("backToPoetry");

function openPoem(poem) {
  readerCategory.textContent = poem.category;
  readerTitle.textContent = poem.title;
  readerText.replaceChildren();
  poem.paragraphs.forEach((paragraph, index) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    if (index === poem.paragraphs.length - 1) p.classList.add("poem-ending");
    readerText.appendChild(p);
  });
  collectionView.hidden = true;
  readerView.hidden = false;
  backButton.focus();
}

poems.forEach((poem, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `poem-list-item${index === 0 ? " featured-poem-item" : ""}`;
  button.setAttribute("aria-label", `Read ${poem.title}`);
  const category = document.createElement("span");
  category.className = "card-index";
  category.textContent = poem.category;
  const title = document.createElement("span");
  title.className = "poem-list-title";
  title.textContent = poem.title;
  const action = document.createElement("span");
  action.className = "poem-list-action";
  action.textContent = "READ POEM  →";
  button.append(category, title, action);
  button.addEventListener("click", () => openPoem(poem));
  poemList.appendChild(button);
});

backButton.addEventListener("click", () => {
  readerView.hidden = true;
  collectionView.hidden = false;
  const firstItem = poemList.querySelector("button");
  if (firstItem) firstItem.focus();
});
