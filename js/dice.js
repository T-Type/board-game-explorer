class Dice {
  constructor(_config, _dispatcher, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth,
      containerHeight: _config.containerHeight,
      colourScale: _config.colourScale,
      tooltipPadding: 15,
    };
    this.possibleGames = _data;
    this.chosenGame = null;
    this.dispatcher = _dispatcher;
  }

  renderDice() {
    const vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth;
    vis.height = vis.config.containerHeight;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width', vis.width)
      .attr('height', vis.height);

    vis.dice = vis.svg.append('g').attr('transform', 'translate(0, 0)');

    vis.dice.append('circle')
      .attr('class', 'dice-background')
      .attr('cx', vis.width / 2)
      .attr('cy', vis.height / 2)
      .attr('r', vis.height / 2)
      .attr('fill', '#696969');

    vis.dice.append('svg:image')
      .attr('xlink:href', 'images/dice.svg')
      .attr('width', vis.width - 40)
      .attr('height', vis.height - 40)
      .attr('x', 0)
      .attr('y', 0);

    vis.dice.append('text')
      .attr('x', vis.width / 2 - 17)
      .attr('y', vis.height - 33)
      .attr('text-anchor', 'start')
      .text('FEELING');

    vis.dice.append('text')
      .attr('x', vis.width / 2 - 17)
      .attr('y', vis.height - 16)
      .attr('text-anchor', 'start')
      .text('LUCKY?');

    // Tooltip to explain similarity
    vis.dice
      .on('mouseover', (event) => {
        // show tooltip
        d3.select('#tooltip-similar')
          .style('display', 'block')
          .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
          .style('top', `${event.pageY - vis.config.tooltipPadding}px`)
          .html('<div>Take a chance! Roll the dice to discover a new game.</div>');

        d3.selectAll('.dice-background')
          .attr('fill', '#808080');
      })
      .on('mouseleave', () => {
        // hide tooltip
        d3.select('#tooltip-similar').style('display', 'none');
        d3.selectAll('.dice-background')
          .attr('fill', '#696969');
      })
      .on('click', (event) => {
        const gamesMinusCurrentChosen = vis.chosenGame
          ? vis.possibleGames.filter((g) => g.id !== vis.chosenGame.id)
          : vis.possibleGames;
        const randomGameIndex = Math.floor(Math.random() * gamesMinusCurrentChosen.length);
        const colours = vis.config.colourScale.range().slice(0, 8);
        d3.selectAll('.dice-background')
          .transition()
          .duration(2500)
          .ease(d3.easeLinear)
          .attrTween('fill', () => function (t) {
            const group = Math.floor(t * 8);
            return colours[group];
          })
          .on('end', () => {
            d3.selectAll('.dice-background').attr('fill', '#696969');
            vis.dispatcher.call('onGameSelect', event, gamesMinusCurrentChosen[randomGameIndex]);
          });
      });
  }
}
