class Legend {
  /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
  constructor(_config) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth,
      containerHeight: _config.containerHeight,
      colourScale: _config.colourScale,
      hexScale: _config.hexScale,
      tooltipPadding: 15,
      margin: {
        top: 15, right: 0, bottom: 15, left: 0,
      },
      innerMargin: {
        top: 0, right: 20, bottom: 0, left: 10,
      },
    };
    this.labelTooltipMap = {
      Links: 'Similar games are one that have mechanics, themes, skills, or designers in common.',
      Rank: 'Based on BoardGameGeek ranking.',
      Popularity: 'Number of users who rated the game',
    };
    this.labels = Object.keys(this.labelTooltipMap);

    this.renderLegend();
  }

  renderLegend() {
    const vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Initialize scales
    vis.xScale = d3.scaleBand()
      .range([0, vis.width])
      .domain(vis.labels) // # of columns
      .paddingInner(0.1);

    vis.yScale = d3.scaleBand()
      .range([0, vis.height])
      .domain([0, 1, 2]) // # of rows in column
      .paddingInner(0.2);

    // Calculate inner size of each column. Margin specifies space around the column contents
    vis.colWidth = vis.xScale.bandwidth() - vis.config.innerMargin.left - vis.config.innerMargin.right;
    vis.colHeight = vis.height;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // SVG group containing the legend
    vis.legend = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // create groups for each column in legend
    vis.legendGroups = vis.legend.selectAll('legend-group')
      .data(vis.labels)
      .enter()
      .append('g')
      .attr('class', 'legend-group')
      .attr('id', (label) => `legend-${label}`)
      .attr('transform', (label) => `translate(${vis.xScale(label)}, 0)`);

    // create delimiting lines between groups
    vis.legendGroups.filter((g) => vis.labels.slice(1).includes(g))
      .append('line')
      .attr('class', 'legend-group-delimiter')
      .attr('stroke', 'black')
      .attr('x1', 0)
      .attr('y1', 10)
      .attr('x2', 0)
      .attr('y2', vis.config.containerHeight);

    // create hexes and labels in popularity column
    const popularityData = [5000, 50000, 100000];
    const popularityLabels = ['5K ratings', '50K ratings', '100K ratings'];

    vis.popularity = vis.legendGroups.filter((g) => g === 'Popularity')
      .append('g')
      .attr('transform', `translate(${vis.config.innerMargin.right}, 25)`)
      .selectAll('legend-popularity')
      .data(popularityData)
      .enter()
      .append('g')
      .attr('class', 'legend-popularity')
      .attr('transform', (d, i) => `translate(0, ${vis.yScale(i)})`);

    vis.popularity.append('path')
      .attr('class', 'legend-popularity-hex defaultNode')
      .attr('d', 'M 0,-1 L .866,-.5 v 1 L 0,1 L -.866,.5 v -1 Z')
      .attr('fill', vis.config.colourScale('mixed'))
      .attr('transform', (d) => `translate(0, -5) scale(${vis.config.hexScale(d)})`);

    vis.popularity.append('text')
      .attr('class', 'legend-label legend-text')
      .attr('x', '20')
      .attr('y', 0)
      .text((d, i) => popularityLabels[i]);

    // create rank hexes and labels in rank column
    const rankLabels = ['First', 'Second', 'Third'];
    vis.rank = vis.legendGroups.filter((g) => g === 'Rank');
    vis.ranks = vis.rank.append('g')
      .attr('transform', `translate(${vis.config.innerMargin.right}, 25)`)
      .selectAll('legend-rank')
      .data(rankLabels)
      .enter()
      .append('g')
      .attr('class', 'legend-rank legend-text')
      .attr('transform', (d, i) => `translate(0, ${vis.yScale(i)})`);

    vis.ranks.append('path')
      .attr('d', 'M 0,-1 L .866,-.5 v 1 L 0,1 L -.866,.5 v -1 Z')
      .attr('fill', vis.config.colourScale('mixed'))
      .attr('transform', `translate(0, -5) scale(${vis.config.hexScale(20000)})`)
      .attr('class', (d) => `legend-rank-hex rank${d}`);

    vis.ranks.append('text')
      .attr('class', 'legend-label')
      .attr('x', '20')
      .attr('y', 0)
      .text((d) => d);

    vis.rank.append('text')
      .attr('font-size', 65)
      .attr('x', 80)
      .attr('y', 5 + vis.colHeight / 2)
      .attr('dy', '.35em')
      .text('}');

    vis.rank.append('foreignObject')
      .attr('x', 95)
      .attr('y', 5)
      .attr('width', 70)
      .attr('height', 90)
      .append('xhtml:body')
      .attr('class', 'legend-rank-explanation legend-text')
      .html('Highest ranked of games currently showing.');

    // create line section of legend
    const hexes = [{ x: 15, y: 0 }, { x: 110, y: 0 }];
    vis.link = vis.legendGroups.filter((g) => g === 'Links')
      .append('g')
      .attr('transform', `translate(${vis.config.innerMargin.right}, 20)`);

    vis.link.append('line')
      .attr('x1', hexes[0].x)
      .attr('y1', hexes[0].y)
      .attr('x2', hexes[1].x)
      .attr('y2', hexes[1].y)
      .attr('stroke', 'black');

    vis.link.selectAll('link-hexes')
      .data(hexes)
      .enter()
      .append('path')
      .attr('class', 'link-hexes')
      .attr('d', 'M 0,-1 L .866,-.5 v 1 L 0,1 L -.866,.5 v -1 Z')
      .attr('fill', vis.config.colourScale('mixed'))
      .attr('transform', (d) => `translate(${d.x}, ${d.y}) scale(${vis.config.hexScale(20000)})`);

    vis.link.append('foreignObject')
      .attr('x', 0)
      .attr('y', 10)
      .attr('width', vis.colWidth)
      .attr('height', vis.colHeight)
      .append('xhtml:body')
      .attr('class', 'legend-link-explanation legend-text')
      .html('Hover over a game to see if it has links to similar games.');

    // create labels
    vis.legendGroups.append('text')
      .attr('class', 'legend-group-label')
      .attr('id', (d) => `${d}-legend-title`)
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${vis.xScale.bandwidth() / 2}, 0)`)
      .text((d) => d)
      .append('tspan')
      .attr('class', 'fa')
      .attr('font-family', 'FontAwesome')
      .attr('font-size', '0.9em')
      .text('    \uf059');

    // Tooltip to explain
    vis.legendGroups.selectAll('.fa')
      .on('mouseover', (event, d) => {
        // show tooltip
        const tooltipMessage = vis.labelTooltipMap[d];

        d3.select('#tooltip-force-legend')
          .style('display', 'block')
          .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
          .style('top', `${event.pageY - vis.config.tooltipPadding}px`)
          .html(`<div>${tooltipMessage}</div>`);
      })
      .on('mouseleave', () => {
        // hide tooltip
        d3.select('#tooltip-force-legend').style('display', 'none');
      });
  }
}
