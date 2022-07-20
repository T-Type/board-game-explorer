class HexBin {
  constructor(_config, _dispatcher, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 350,
      containerHeight: _config.containerHeight || 250,
      tooltipPadding: _config.tooltipPadding || 15,
      margin: {
        top: 40, right: 10, bottom: 40, left: 45,
      },
    };
    this.data = _data;
    this.dispatcher = _dispatcher;

    // For hex color
    this.hexFillColor = '#606060';
    this.hoverColor = 'black';
    this.hoverWidth = 3;
    this.activeStrokeColor = 'black';
    this.activeStrokeWidth = 5.5;
    this.inactiveStrokeColor = 'black';
    this.inactiveStrokeWidth = 0.1;

    // For hooking up
    this.selectedBins = [];
    this.chosenGame = null;
    this.hexbinMap = new Map();

    this.initVis();
  }

  initVis() {
    const vis = this;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement)
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);
    // Append group element that will contain our chart and position it
    vis.chartArea = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
    vis.chart = vis.chartArea.append('g')
      .attr('id', 'hex-chart');
    vis.legend = vis.chart.append('g')
      .attr('id', 'hexbin-legend')
      .attr('transform', 'translate(0,10)')
      .attr('width', 65)
      .attr('height', 70);
    vis.robberContainer = vis.chart.append('g')
      .attr('id', 'robber-container');
    // Calculate inner chart size
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Initialize scales; domain will stay static throughout interaction; add padding to domains
    vis.xScale = d3.scaleLinear()
      .range([0, vis.width])
      .domain([
        d3.min(vis.data, (g) => g.rating) - 0.5,
        d3.max(vis.data, (g) => g.rating) + 0.25,
      ]);
    vis.yScale = d3.scaleLinear()
      .range([vis.height, 0])
      .domain([
        d3.min(vis.data, (g) => g.complexity) - 0.5,
        d3.max(vis.data, (g) => g.complexity) + 0.25,
      ]);
    vis.color = d3.scaleLinear().range(['transparent', vis.hexFillColor]);

    // Initialize Axes
    vis.xAxis = d3.axisBottom(vis.xScale)
      .ticks(5)
      .tickSizeOuter(0);
    vis.yAxis = d3.axisLeft(vis.yScale)
      .tickValues(['1.0', '2.0', '3.0', '4.0', '5.0'])
      .tickSizeOuter(0);
    // Append axis groups
    vis.xAxisG = vis.chart.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height})`);
    vis.yAxisG = vis.chart.append('g')
      .attr('class', 'axis y-axis');

    // Append hexbin title
    vis.chart.append('text')
      .attr('class', 'chart-title')
      .attr('y', 0)
      .attr('x', 0)
      .attr('dy', '-1em')
      .attr('transform', 'translate(0,-5)')
      .style('text-anchor', 'beginning')
      .text('Let\'s Take Into a Count How Tough It\'s Bin...');

    // Append legend title
    vis.leg_title = vis.legend.append('text')
      .attr('class', 'legend-title')
      .attr('transform', 'translate(6,5)')
      .text('Game Count')
      .append('tspan')
      .attr('class', 'fa')
      .attr('font-family', 'FontAwesome')
      .attr('font-size', '0.9em')
      .text('    \uf059');

    // Append axis titles
    vis.svg.append('text')
      .attr('class', 'axis-title')
      .attr('x', -vis.height + 50)
      .attr('y', 4)
      .attr('dy', '.71em')
      .attr('font-size', 18)
      .attr('transform', 'rotate(-90)')
      .text('Complexity');
    vis.chart.append('text')
      .attr('class', 'axis-title')
      .attr('y', vis.height + 25)
      .attr('x', vis.width / 2 + 20)
      .attr('dy', '.71em')
      .attr('font-size', 18)
      .style('text-anchor', 'end')
      .text('Rating');

    // Set up two backgrounds, one below and one to the left of the legend
    // such that when clicked, clears selection
    vis.chart.append('rect')
      .attr('width', vis.config.containerWidth - 122)
      .attr('height', vis.config.containerHeight - 80)
      .attr('transform', 'translate(78,0)')
      .attr('opacity', 0)
      .on('click', () => {
        // If things are filtered, clear them, else do nothing
        if (vis.selectedBins.length > 0) {
          vis.clearSelection();
          vis.updateVis();
        }
      });
    vis.chart.append('rect')
      .attr('width', vis.config.containerWidth - 300)
      .attr('height', vis.config.containerHeight - 150)
      .attr('transform', 'translate(0,70)')
      .attr('opacity', 0)
      .on('click', () => {
        if (vis.selectedBins.length > 0) {
          vis.clearSelection();
          vis.updateVis();
        }
      });

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    // Compute the hexbin data
    vis.hexbin = d3.hexbin()
      .x((d) => vis.xScale(d.rating))
      .y((d) => vis.yScale(d.complexity))
      .radius(12) // size of the bin in px
      .size([vis.width, vis.height]);
    vis.inputforHexbinFun = vis.hexbin(vis.data);

    // Ensures that selection is persisted through filtering with barchart
    // check center of bins in selectedBins
    vis.inputforHexbinFun.forEach((b) => b.isSelected = vis.selectedBins.some(((sb) => sb.x === b.x && sb.y === b.y)));

    // On initial load ONLY, create map of centers to ids from full dataset
    if (vis.hexbinMap.size === 0) {
      vis.inputforHexbinFun.forEach((b) => {
        vis.hexbinMap.set(`${b.x}+${b.y}`, b.map((g) => g.id));
      });
    }

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    vis.maxCountColorThreshold = 0;

    // Create Hexbin
    vis.hex = vis.chart
      .selectAll('path')
      .data(vis.inputforHexbinFun, (d) => d)
      .join('path')
      .attr('d', vis.hexbin.hexagon())
      .attr('class', 'hexbin-path')
      .classed('hexbin-active', (d) => d.isSelected)
      .attr('transform', (d) => {
        // Since we're iterating over each bin, get max count for color threshold on the way
        if (d.length > vis.maxCountColorThreshold) {
          vis.maxCountColorThreshold = d.length;
        }
        // Okay, back to transform
        return `translate(${d.x}, ${d.y})`;
      })
      .attr('stroke', (d) => (d.isSelected ? vis.activeStrokeColor : vis.inactiveStrokeColor))
      .attr('stroke-width', (d) => (d.isSelected ? vis.activeStrokeWidth : vis.inactiveStrokeWidth));

    // Now that we know what threshold to use, set a color palette
    vis.color.domain([0, vis.maxCountColorThreshold]); // Number of points in the bin
    // Apply color palette to the bins
    d3.selectAll('.hexbin-path').attr('fill', (d) => vis.color(d.length));

    // Process chosen game
    if (vis.chosenGame !== null) {
      // Remove robber
      d3.select('#robber-container').html('');
      // Place robber
      const binWithGame = vis.hex.filter((d) => d.some((g) => g.id === vis.chosenGame.id));
      d3.select('#robber-container').append('svg:image')
        .attr('x', binWithGame.data()[0].x)
        .attr('y', binWithGame.data()[0].y)
        .attr('width', 18)
        .attr('height', 18)
        .attr('xlink:href', 'images/robber.png')
        .attr('transform', 'translate(-10,-10)');
      vis.robberContainer.raise();
    } else {
      // Remove robber
      d3.select('#robber-container').html('');
    }

    vis.hex
      .on('mouseover', (event, d) => {
        vis.generateTooltip(event, d);
        const domEle = d3.select(event.target);
        // If hexbin is active, don't change the border
        if (!domEle.classed('hexbin-active')) {
          domEle.attr('stroke', vis.hoverColor);
          domEle.attr('stroke-width', vis.hoverWidth);
        }
      })
      .on('mousemove', (event) => {
        d3.select('#hexbin-tooltip')
          .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
          .style('top', `${event.pageY + vis.config.tooltipPadding}px`);
      })
      .on('mouseleave', (event) => {
        d3.select('#hexbin-tooltip').style('display', 'none');
        const domEle = d3.select(event.target);
        // If hexbin is active, don't change the color
        if (!domEle.classed('hexbin-active')) {
          // Set to active stroke color and width
          domEle.attr('stroke', vis.inactiveStrokeColor);
          domEle.attr('stroke-width', vis.inactiveStrokeWidth);
        }
      })
      .on('click', (event, d) => {
        const domEle = d3.select(event.target);
        const isActive = domEle.classed('hexbin-active');
        domEle.classed('hexbin-active', !isActive);

        // If hexbin is active...
        if (d3.select(event.target).classed('hexbin-active')) {
          // Set to active stroke color and width
          domEle.attr('stroke', vis.activeStrokeColor);
          domEle.attr('stroke-width', vis.activeStrokeWidth);

          // Add to selected bins array
          vis.selectedBins.push(d);

          // Get ids of games possible in selected bins (among all games via hexbinMap)
          const selectedBinIds = vis.selectedBins.map((b) => vis.hexbinMap.get(`${b.x}+${b.y}`));

          // Pass to main
          vis.dispatcher.call('filterBins', event, selectedBinIds);
        } else {
          // Set to inactive stroke color and width
          domEle.attr('stroke', vis.inactiveStrokeColor);
          domEle.attr('stroke-width', vis.inactiveStrokeWidth);

          // Remove from selected bins array
          vis.selectedBins = vis.selectedBins.filter((b) => !(b.x === d.x && b.y === d.y));

          // Get ids of games possible in selected bins (among all games via hexbinMap)
          const selectedBinIds = vis.selectedBins.map((b) => vis.hexbinMap.get(`${b.x}+${b.y}`));

          // Pass to main
          vis.dispatcher.call('filterBins', event, selectedBinIds);
        }

        // From barchart:
        // Filtering resets the selection in the graph, so we need to re-render multiple bars
        // Calling onGameSelect with argument of null will do this & handle rendering of bars
        // with correct styling for current selections
        vis.dispatcher.call('onGameSelect', event, null);
      });

    // Make the legend
    vis.makeLegend();

    // Update the axes/gridlines
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  }

  /** Helper Functions */

  clearSelection() {
    const vis = this;
    const arrayOfChildren = document.getElementById('hex-chart').children;
    // Deselect (class all hexbins as inactive)
    for (let i = 0; i < arrayOfChildren.length; i++) {
      if (arrayOfChildren[i].tagName === 'path') {
        arrayOfChildren[i].setAttribute('stroke', vis.inactiveStrokeColor);
        arrayOfChildren[i].setAttribute('stroke-width', vis.inactiveStrokeWidth);
        arrayOfChildren[i].setAttribute('class', 'hexbin-path');
      }
    }

    // Clear selected games and inform the other charts
    vis.selectedBins = [];
    vis.dispatcher.call('filterBins', event, []);
  }

  generateTooltip(event, d) {
    const vis = this;

    const dLength = d.length;

    // Get rating max/min
    const ratingMin = d3.min(d, (g) => g.rating);
    const ratingMax = d3.max(d, (g) => g.rating);

    // Get complexity max/min (max/min are inverted because range of yScale is inverted)
    const complexityMin = d3.min(d, (g) => g.complexity);
    const complexityMax = d3.max(d, (g) => g.complexity);

    // Get most popular game
    d.sort((a, b) => b.users_rated - a.users_rated);
    const mostPopularGame = d[0].name;

    if (dLength !== 1) {
      // Generate tooltip element for hex with multiple games
      d3.select('#hexbin-tooltip')
        .style('display', 'block')
        .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
        .style('top', `${event.pageY + vis.config.tooltipPadding}px`)
        .html(` <ul>
                    <li><span>Number of games</span> -- ${d.length}</li>
                    <li><span>Rating</span> ------------- ${ratingMin.toFixed(1)} - ${ratingMax.toFixed(1)}</li>
                    <li><span>Complexity</span> -------- ${complexityMin.toFixed(1)} - ${complexityMax.toFixed(1)}</li>
                    <li><span>Most popular game:</span> ${mostPopularGame}</li>
                </ul>
              `);
    } else {
      // Generate tooltip element for hex containing only one game
      d3.select('#hexbin-tooltip')
        .style('display', 'block')
        .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
        .style('top', `${event.pageY + vis.config.tooltipPadding}px`)
        .html(` <ul>
                    <li><span>Number of games</span> -- ${dLength}</li>
                    <li><span>Rating</span> ------------- ${ratingMin.toFixed(1)}</li>
                    <li><span>Complexity</span> -------- ${complexityMin.toFixed(1)}</li>
                    <li><span>Game:</span> ${mostPopularGame}</li>
                </ul>
              `);
    }
  }

  makeLegend() {
    const vis = this;

    d3.selectAll('.bin-count').html('');

    const numGames = [1, vis.maxCountColorThreshold];
    vis.leg = vis.legend
      .selectAll('g')
      .data(numGames)
      .join('g')
      .attr('class', 'bin-count')
      .attr('transform', (d, i) => `translate(23,${23 + i * 25})`);

    vis.leg.append('path')
      .attr('class', 'bin-count-hex')
      .attr('d', 'm 0 -10 l 8.66025 5 l 1.77636e-15 10 l -8.66025 5 l -8.66025 -5 l -5.32907e-15 -10 Z')
      .attr('stroke', vis.inactiveStrokeColor)
      .attr('stroke-width', vis.inactiveStrokeWidth)
      .attr('fill', (d) => vis.color(d));

    vis.text = vis.leg.append('text')
      .attr('class', 'legend-label')
      .attr('x', '20')
      .attr('y', '3')
      .text((d, i) => numGames[i]);

    vis.leg_title
      .on('mouseover', (event) => {
        // show tooltip
        const tooltipMessage = 'Number of games represented within each hexagonal bin. '
              + 'Darker shades represent more games';

        d3.select('#tooltip-hex-legend')
          .style('display', 'block')
          .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
          .style('top', `${event.pageY - vis.config.tooltipPadding}px`)
          .style('max-width', '100px')
          .html(`<div>${tooltipMessage}</div>`);
      })
      .on('mouseleave', () => {
        // hide tooltip
        d3.select('#tooltip-hex-legend').style('display', 'none');
      });
  }

  /**
     * Helper to adjust bins based on current data: any bins
     * previously selected that no longer have games in them
     * with the current dataset are removed from selected
     */
  adjustSelectedBins() {
    const vis = this;

    const currentGameIds = vis.data.map((g) => g.id);
    vis.selectedBins = vis.selectedBins.filter((b) => b.some((g) => currentGameIds.includes(g.id)));
    const selectedBinIds = vis.selectedBins.map((b) => vis.hexbinMap.get(`${b.x}+${b.y}`));

    return selectedBinIds;
  }
}
