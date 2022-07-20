class Deck {
  constructor() {
    this.chosenGame = null;
  }

  updateDeck() {
    const card = document.querySelector('#flip-card-inner');
    if (this.chosenGame) {
      card.setAttribute('class', null);
    } else {
      card.setAttribute('class', 'is-flipped');
    }
  }
}
