/**
 * Global objects
 */
let games;
let allGameIds;
let gamesWithSelectedFilters;
let gamesWithSelectedThemes;
let gamesWithSelectedRatingComplexity;
let gamesOnScreen;
let barchart;
let forceDirectedGraph;
let hexbin;
let dice;
let deck;
let chosenGame;
let colourScale;

const themeMap = {
  theme_cluster_nature: {
    name: '(Super) Natural',
    themes: ['Fantasy', 'Animals', 'Mythology', 'Farming', 'Environmental', 'Parks & Beaches', 'Religious'],
  },
  theme_cluster_war: {
    name: 'Fight Night',
    themes: ['Fighting', 'War', 'Political', 'Murder & Mystery', 'Spies', 'Racing', 'Mafia'],
  },
  theme_cluster_journey: {
    name: 'On A Journey',
    themes: ['Adventure', 'Exploration', 'Nautical', 'Transportation', 'Trains', 'Travel', 'Planes'],
  },
  theme_cluster_science: {
    name: 'Science (Fiction)',
    themes: ['Science Fiction', 'Horror', 'Industry', 'Space Exploration', 'Zombies', 'Medical', 'City Life'],
  },
  theme_cluster_history: {
    name: 'Past Tense',
    themes: ['Medieval', 'Ancient', 'Renaissance', 'Age of Reason', 'American West', 'Prehistoric', 'Arabian'],
  },
  theme_cluster_culture: {
    name: 'Popular Culture',
    themes: ['Novel-based', 'Movies & TV', 'Humor', 'Video Games', 'Sports', 'Comic Books', 'Food & Drink'],
  },
};
const themeMapKeys = Object.keys(themeMap);

/**
 * Initialize dispatcher used to orchestrate events
 */
const dispatcher = d3.dispatch('filterThemes', 'filterBins', 'onGameSelect');

/**
 * Load data from JSON file asynchronously and render charts
 */
d3.json('data/games_clean.json').then((_data) => {
  // PROCESS DATA
  games = _data;

  // add groups to the games and flag for barchart rendering
  games.forEach((game) => {
    // assign a group if it has a theme
    game.group = getGroupNumber(game);
    game.selectedInHexbin = true;
  });
  themeMapKeys.push('mixed');
  themeMapKeys.push('none');

  // set initial values of data for each chart to be all games
  allGameIds = games.map((g) => g.id);
  gamesWithSelectedFilters = allGameIds;
  gamesWithSelectedThemes = allGameIds;
  gamesWithSelectedRatingComplexity = allGameIds;
  gamesOnScreen = games;

  // CREATE COMMON CONFIG ELEMENTS
  colourScale = d3.scaleOrdinal()
    .range(['#4e79a7', '#f28e2c', '#e15759', '#af7aa1', '#59a14f', '#edc949', '#76b7b2', '#ff9da7'])
    .domain(themeMapKeys);

  // CREATE VIS ELEMENTS
  // barchart
  barchart = new Barchart({
    parentElement: '#bar-viz',
    containerWidth: document.getElementById('bar-viz').clientWidth,
    containerHeight: document.getElementById('bar-viz').clientHeight,
    colourScale,
    themeClusterMap: themeMap,
  }, dispatcher, games);
  barchart.updateVis();

  // forceDirectedGraph
  forceDirectedGraph = new ForceDirectedGraph({
    parentElement: '#force-chart',
    containerWidth: document.getElementById('main-viz').clientWidth,
    containerHeight: document.getElementById('main-viz').clientHeight,
    colourScale,
  }, dispatcher, games, games.flatMap((g) => g.links), Object.keys(themeMap));
  forceDirectedGraph.updateVis();

  // hexbin
  hexbin = new HexBin({
    parentElement: '#hexbin-svg',
    containerWidth: document.getElementById('hexbin-viz').clientWidth,
    containerHeight: document.getElementById('hexbin-viz').clientHeight,
  }, dispatcher, games);

  // dice
  dice = new Dice({
    parentElement: '#dice',
    containerWidth: document.getElementById('dice').clientWidth,
    containerHeight: document.getElementById('dice').clientHeight,
    colourScale,
  }, dispatcher, games);
  dice.renderDice();

  // deck
  deck = new Deck();

  /**
   * Implement search bar functionality
   */
  $(() => {
    const submitSearch = () => {
      const searchName = $('#search-bar').val().toLowerCase();
      const game = gamesOnScreen.find((g) => g.name.toLowerCase() === searchName);
      const gameInFullDataset = game ? true : games.find((g) => g.name.toLowerCase() === searchName);
      const failMsg = gameInFullDataset
        ? 'Sorry, that game is not on screen. Please reset filters.'
        : 'Sorry, that game is not in the dataset.';

      if (game) {
        dispatcher.call('onGameSelect', event, game);
        $('#search-not-found-text').css('opacity', '0');
        $('#search-bar').val('');
      } else {
        $('#search-not-found-text').html(failMsg).css('opacity', '1');
      }
    };

    // set up autocomplete based on current games (code adapted from jquery documentation examples)
    $('#search-bar').autocomplete({
      source: (request, response) => {
        const matcher = new RegExp(`.*${$.ui.autocomplete.escapeRegex(request.term)}.*`, 'i');
        const gameNames = gamesOnScreen.map((g) => g.name);
        gameNames.sort();
        response($.grep(gameNames, (item) => matcher.test(item)));
      },
    });

    // clear error text if user clears text
    $('#search-bar').on('input', function () {
      if (this.value === '') {
        $('#search-not-found-text').css('opacity', '0');
      }
    });

    // submit search on click
    $('#search-button').on('click', submitSearch);
  });
});

/**
 * Helpers for interactions
 */

/**
 * Helper to get games needed for graph
 */
function setGamesAndLinksForGraph() {
  const gamesForGraph = games.filter((g) => gamesWithSelectedFilters.includes(g.id)
      && gamesWithSelectedRatingComplexity.includes(g.id)
      && gamesWithSelectedThemes.includes(g.id));

  // keep only links where the source and target are among the games being shown in the graph
  const linksWithSource = gamesForGraph.flatMap((g) => g.links);
  const linksWithSourceAndTarget = linksWithSource.filter((l) => gamesForGraph.includes(l.target));

  forceDirectedGraph.nodes = gamesForGraph;
  forceDirectedGraph.links = linksWithSourceAndTarget;

  gamesOnScreen = gamesForGraph;
}

/**
 * Helper to get games needed for hexbin
 */
function setGamesForHexbin() {
  const gamesForHexbin = games.filter((g) => gamesWithSelectedFilters.includes(g.id) && gamesWithSelectedThemes.includes(g.id));
  hexbin.data = gamesForHexbin;
}

/**
 * Helper to get games needed for barchart
 * We filter only by global filters, but add a flag if game is selected in hexbin so we can highlight
 */
function setGamesForBarchart() {
  const gamesForBarchart = games.filter((g) => gamesWithSelectedFilters.includes(g.id));
  gamesForBarchart.forEach((g) => g.selectedInHexbin = gamesWithSelectedRatingComplexity.includes(g.id));
  barchart.data = gamesForBarchart;
}

/**
 * Helper to get games needed for dice interaction
 * Identical to games for graph
 */
function setGamesForDice() {
  dice.possibleGames = gamesOnScreen;
}

/**
 * Helper reset data to unfiltered set for all charts
 */
function resetGames() {
  gamesWithSelectedFilters = allGameIds;
  gamesWithSelectedThemes = allGameIds;
  gamesWithSelectedRatingComplexity = allGameIds;
  gamesOnScreen = games;
  chosenGame = null;

  forceDirectedGraph.nodes = games;
  forceDirectedGraph.links = games.flatMap((g) => g.links);

  barchart.data = games;
  barchart.selectedThemes = [];
  barchart.chosenGame = chosenGame;
  barchart.binsSelected = false;

  hexbin.data = games;
  hexbin.selectedBins = [];
  hexbin.chosenGame = chosenGame;

  dice.possibleGames = games;
  dice.chosenGame = chosenGame;

  deck.chosenGame = chosenGame;
  deck.updateDeck();
}

/**
 * Interactions
 */

/**
 * Set on-click handler for filter button
 */
d3.select('#filter-button').on('click', () => {
  const minAge = +d3.select('#age').property('value');
  const players = +d3.select('#players').property('value');
  const maxTime = +d3.select('#time').property('value');
  const type = d3.select('#type').property('value');

  // use of global filter resets all other filters, so first reset everything
  resetGames();

  // then do filtering
  gamesWithSelectedFilters = games.filter((g) => {
    const fitsAge = minAge ? minAge >= g.min_age : true;
    const fitsPlayers = players ? players >= g.min_players && players <= g.max_players : true;
    const fitsTime = maxTime ? maxTime >= g.playing_time : true;
    const fitsType = type ? g[type] : true;
    return fitsAge && fitsPlayers && fitsTime && fitsType;
  })
    .map((g) => g.id);

  // then compute and set data for all vis
  setGamesAndLinksForGraph();
  setGamesForDice();
  setGamesForBarchart();
  setGamesForHexbin();

  // then update viz components
  forceDirectedGraph.updateVis();
  barchart.updateVis();
  hexbin.updateVis();
});

/**
 * Set on-click handler for reset filters button
 */
d3.select('#reset-button').on('click', () => {
  resetGames();
  d3.selectAll('select').property('value', '');
  setGamesForBarchart();
  forceDirectedGraph.updateVis();
  hexbin.updateVis();
  barchart.updateVis();
});

/**
 * Dispatcher waits for 'filterTheme' event from barchart
 * Filter data based on the selected theme and update graph and hexbin charts
 */
dispatcher.on('filterThemes', (_gameIds) => {
  // set gamesWithSelectedThemes
  gamesWithSelectedThemes = _gameIds.length > 0 ? _gameIds : allGameIds;

  // filtering themes might remove selected bins in hexbin, so deal with that first
  setGamesForHexbin();
  const bins = hexbin.adjustSelectedBins();
  gamesWithSelectedRatingComplexity = bins.length === 0
    ? allGameIds
    : allGameIds.filter((g) => bins.some((b) => b.includes(g)));

  // compute and set data for barchart and graph
  setGamesForBarchart();
  setGamesAndLinksForGraph();
  setGamesForDice();

  // since filtering resets selected game, do this for barchart and hexbin
  hexbin.chosenGame = null;
  barchart.chosenGame = null;
  dice.chosenGame = null;

  // update hexbin & graph
  hexbin.updateVis();
  forceDirectedGraph.updateVis();
});

/**
 * Hex dispatcher waits for 'filterBins' event from hexbin
 * We filter data based on the selected bin (complexity and rating)
 * and update the graph and bar charts (not filtered, but opacity changes)
 */
dispatcher.on('filterBins', (_selectedBins) => {
  // set gamesWithSelectedRatingAndComplexity
  if (_selectedBins.length === 0) {
    gamesWithSelectedRatingComplexity = allGameIds;
    barchart.binsSelected = false;
  } else {
    gamesWithSelectedRatingComplexity = allGameIds.filter((g) => _selectedBins.some((b) => b.includes(g)));
    barchart.binsSelected = true;
  }

  // compute and set data for all vis
  setGamesForHexbin();
  setGamesForBarchart();
  setGamesAndLinksForGraph();
  setGamesForDice();

  // since filtering resets selected game, do this for barchart and hexbin
  hexbin.chosenGame = null;
  barchart.chosenGame = null;
  dice.chosenGame = null;

  // update barchart & graph
  barchart.updateVis();
  forceDirectedGraph.updateVis();
});

/**
 * Dispatcher waits for 'onGameSelect' event from graph
 * We set the selected game for the hexbin and barchart and update the charts
 */
dispatcher.on('onGameSelect', (_selectedGame) => {
  // determine if we are selecting the node or unselecting it
  const isAlreadyChosen = _selectedGame && chosenGame && _selectedGame.id === chosenGame.id;
  const isClearAction = !_selectedGame || isAlreadyChosen;
  const game = isClearAction ? null : _selectedGame;

  chosenGame = game;

  // popout selected game on graph:
  forceDirectedGraph.chosenGame = game;
  forceDirectedGraph.popOutSelectedNode(game);

  // update hexbin
  hexbin.chosenGame = game;
  hexbin.updateVis();

  // update barchart
  barchart.chosenGame = game;
  barchart.updateVis();

  // update dice
  dice.chosenGame = game;

  // update deck
  deck.chosenGame = game;
  deck.updateDeck();
});
