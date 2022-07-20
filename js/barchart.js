class Barchart {
  /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
  constructor(_config, _dispatcher, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth,
      containerHeight: _config.containerHeight,
      colourScale: _config.colourScale,
      themeClusterMap: _config.themeClusterMap,
      themeClusters: Object.keys(_config.themeClusterMap),
      margin: {
        top: 30, right: 170, bottom: 40, left: 45,
      },
      tooltipPadding: 15,
    };
    this.dispatcher = _dispatcher;
    this.data = _data;
    this.selectedThemes = [];
    this.chosenGame = null;
    this.binsSelected = false;

    this.initVis();
  }

  /**
     * Initialize scales/axes and append static elements, such as axis titles
     */
  initVis() {
    const vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Create elements related to overall chart
    // Initialize scales
    vis.xScale = d3.scaleLinear() // used across all clusters
      .range([0, vis.width]);

    // used to place clusters; y domain set now since we don't want it to change
    vis.yScale = d3.scaleBand()
      .domain(vis.config.themeClusters)
      .range([0, vis.height])
      .round(true)
      .paddingInner(0.1);

    // Initialize axes for overall chart
    vis.xAxis = d3.axisBottom(vis.xScale)
      .ticks(4)
      .tickSizeInner(-vis.height)
      .tickSizeOuter(0)
      .tickPadding(5)
      .tickFormat((t) => (Number.isInteger(t) ? d3.format('d')(t) : ''));

    vis.yAxis = d3.axisLeft(vis.yScale)
      .tickSize(0)
      .tickFormat((t) => vis.config.themeClusterMap[t].name);

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // SVG group containing the chart
    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Append empty axis groups and move them to their place
    vis.xAxisG = vis.chart.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0, ${vis.height})`);

    vis.yAxisG = vis.chart.append('g')
      .attr('class', 'axis y-axis');

    // Append axis title
    vis.svg.append('text')
      .attr('class', 'axis-title')
      .attr('y', vis.config.containerHeight)
      .attr('x', vis.width / 2)
      .attr('dy', '-0.2em')
      .text('# of Games');

    // Append axis title
    vis.svg.append('g')
      .attr('transform', `translate(${vis.width + vis.config.margin.right}, ${vis.height / 2})`)
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', 0)
      .attr('y', 0)
      .style('text-anchor', 'middle')
      .attr('transform', 'rotate(90)')
      .text('Themes');

    // Append chart title
    vis.svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.8em')
      .text('Games in the grand theme of things...');

    // Create elements related to small multiples
    // initialize scale to place theme bars (will be copied to get one scale per small multiple)
    vis.yClusterScale = d3.scaleBand()
      .range([0, vis.yScale.bandwidth()])
      .round(true)
      .paddingInner(0.1);

    // Set domains for y cluster scales per theme cluster since we have different themes per cluster
    vis.yClusterScales = new Map();
    vis.config.themeClusters.forEach((cluster) => {
      const subthemes = vis.config.themeClusterMap[cluster].themes;
      vis.yClusterScales.set(cluster, vis.yClusterScale.copy().domain(subthemes));
    });

    // Create groups containing the small multiple charts, each associated with a cluster name
    vis.clusterGroups = vis.chart.selectAll('.cluster-group')
      .data(vis.config.themeClusters).enter()
      .append('g')
      .attr('class', 'cluster-group')
      .attr('transform', (d) => `translate(0,${vis.yScale(d)})`);

    // Add cluster legend boxes for additional interactions
    vis.clusterLabels = vis.clusterGroups.append('rect')
      .attr('class', 'cluster-group-legend default')
      .attr('x', -vis.config.margin.left + 10)
      .attr('y', 0)
      .attr('width', vis.config.margin.left / 4)
      .attr('height', vis.yScale.bandwidth())
      .attr('fill', (d) => vis.config.colourScale(d));

    // Add empty axes groups for small multiples
    vis.yClusterAxesG = vis.clusterGroups.append('g')
      .attr('class', 'y-axis-cluster')
      .attr('transform', `translate(${vis.width}, 0)`);
  }

  /**
     * Prepare data and scales before we render it
     */
  updateVis() {
    const vis = this;

    // initialize and fill map
    const aggregatedDataMap = new Map();
    vis.data.forEach((d) => {
      vis.config.themeClusters.forEach((cluster) => {
        d[cluster].forEach((theme) => {
          if (!aggregatedDataMap.has(cluster)) {
            aggregatedDataMap.set(cluster, new Map());
          }
          const subthemes = aggregatedDataMap.get(cluster);
          if (subthemes.has(theme)) {
            subthemes.get(theme).push(d);
          } else {
            subthemes.set(theme, [d]);
          }
        });
      });
    });

    // convert to array with additional info
    vis.aggregatedData = [];
    aggregatedDataMap.forEach((v, k) => {
      const themeArray = [];
      v.forEach((w, l) => themeArray.push({
        theme: l,
        cluster: k,
        games: w,
        num: w.length,
        numWithSelectedRatingAndComplexity: w.filter((g) => g.selectedInHexbin).length,
        hasChosenGame: vis.chosenGame ? w.some((g) => g.id === vis.chosenGame.id) : false,
      }));
      vis.aggregatedData.push({ key: k, themes: themeArray });
    });

    // Specify accessor functions
    vis.xValue = (d) => d.num;
    vis.xHighlightValue = (d) => d.numWithSelectedRatingAndComplexity;
    vis.yCluster = (d) => d.cluster;
    vis.yTheme = (d) => d.theme;
    vis.gameIds = (d) => d.games;

    // Set the x scale domain based on largest # of games across all clusters since axis is shared
    // If there are no games, set it to 0
    vis.xScale.domain([
      0,
      d3.max(vis.aggregatedData.map((cluster) => cluster.themes).flat(), (d) => d.num) || 0,
    ]);

    vis.renderVis();
  }

  /**
     * Bind data to visual elements
     */
  renderVis() {
    const vis = this;

    const styleAsDefault = vis.selectedThemes.length === 0;

    // Decide if cluster label should be styled as default or selected (otherwise lowered opacity)
    vis.clusterLabels
      .classed('default', styleAsDefault) // default, no themes selected
      .classed('selected', (c) => vis.config.themeClusterMap[c].themes.some((t) => vis.selectedThemes.includes(t)));

    // Add groups containing the bars
    vis.clusters = vis.clusterGroups.selectAll('.cluster')
      .data((d) => vis.aggregatedData.filter((cluster) => cluster.key === d), (d) => d.key)
      .join('g')
      .attr('class', 'cluster');

    // Add theme groups
    vis.barGroups = vis.clusters.selectAll('.bar-group')
      .data((d) => d.themes, vis.yTheme)
      .join('g')
      .attr('class', 'bar-group')
      .classed('default', styleAsDefault)
      .classed('selected', (d) => vis.selectedThemes.includes(vis.yTheme(d)))
      .attr('transform', (d) => `translate(0, ${vis.yClusterScales.get(vis.yCluster(d))(vis.yTheme(d))})`);

    // Add background bars
    vis.barsFixed = vis.barGroups.selectAll('.bar-fixed')
      .data((d) => [d])
      .join('rect')
      .attr('class', 'bar-fixed')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', (d) => vis.xScale(vis.xValue(d)))
      .attr('height', (d) => vis.yClusterScales.get(vis.yCluster(d)).bandwidth())
      .attr('fill', (d) => vis.config.colourScale(vis.yCluster(d)));

    // Add highlighted bar for bar groups that are selected
    vis.bars = vis.barGroups.selectAll('.bar')
      .data((d) => (vis.selectedThemes.length === 0 || vis.selectedThemes.includes(vis.yTheme(d)) ? [d] : []))
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', (d) => vis.xScale(vis.xHighlightValue(d)))
      .attr('height', (d) => vis.yClusterScales.get(vis.yCluster(d)).bandwidth())
      .attr('fill', (d) => vis.config.colourScale(vis.yCluster(d)));

    // Add settlement if there's a game chosen in the graph
    vis.settlement = vis.barGroups.selectAll('.settlement')
      .data((d) => (d.hasChosenGame ? [d] : []))
      .join('path')
      .attr('class', 'settlement')
      .attr('d', 'M 0 0 v 15 h 15 v -15 l -6 -6 h -3 l -6 6')
      .attr('fill', 'black')
      .attr('transform', (d) => {
        const x = vis.xScale(vis.xValue(d)) + 5;
        const y = vis.yClusterScales.get(vis.yCluster(d)).bandwidth() / 2 - 3;
        return `translate(${x}, ${y}) scale(0.5)`;
      });

    // Add lines from bar to axis
    vis.barConnectors = vis.barGroups.selectAll('.bar-connector')
      .data((d) => [d])
      .join('path')
      .attr('class', 'bar-connector')
      .attr('d', (d) => {
        const yPos = vis.yClusterScales.get(vis.yCluster(d)).bandwidth() / 2;
        return d3.line()([[vis.xScale(vis.xValue(d)), yPos], [vis.width + 15, yPos]]);
      })
      .attr('stroke', (d) => vis.config.colourScale(vis.yCluster(d)));

    // Update axes
    vis.xAxisG
      .call(vis.xAxis)
      .call((g) => g.select('.domain').remove());

    vis.yAxisG
      .call(vis.yAxis)
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dy', '-0.8em')
      .attr('dx', '0.3em')
      .attr('transform', 'rotate(-90)');

    vis.yClusterAxesG.each(function (d) {
      const axis = d3.axisRight(vis.yClusterScales.get(d))
        .tickSize(0)
        .tickPadding(20);
      return d3.select(this).call(axis);
    })
      .call((g) => g.select('.domain').remove());

    // Style ticks as default or selected, as needed
    vis.yClusterAxesG.selectAll('.tick')
      .classed('default', styleAsDefault)
      .classed('selected', (t) => vis.selectedThemes.includes(t));

    // Interaction for bars
    vis.barGroups
      .on('mouseover', function (event, d) {
        d3.select(this).classed('hovered', true);
        vis.yClusterAxesG.selectAll('.tick').filter((t) => t === d.theme)
          .classed('hovered', true);
        vis.generateThemeTooltip(event, d);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).classed('hovered', false);
        vis.yClusterAxesG.selectAll('.tick').filter((t) => t === d.theme)
          .classed('hovered', false);
        d3.select('#tooltip-barchart-theme').style('display', 'none');
      })
      .on('click', (event, d) => {
        vis.handleThemeClick(event, d);
      });

    // Interaction for axis ticks for bars
    vis.yClusterAxesG.selectAll('.tick')
      .on('mouseover', function (event, d) {
        d3.select(this).classed('hovered', true);
        vis.barGroups.filter((b) => d === b.theme)
          .classed('hovered', true);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).classed('hovered', false);
        vis.barGroups.filter((b) => d === b.theme)
          .classed('hovered', false);
      })
      .on('click', (event, d) => {
        vis.handleThemeClick(event, d);
      });

    // Interaction for legend rectangles
    vis.clusterLabels
      .on('mouseover', function (event, d) {
        d3.select(this).classed('hovered', true);
        vis.generateLegendTooltip(event, d);
      })
      .on('mouseleave', function () {
        d3.select(this).classed('hovered', false);
        d3.select('#tooltip-barchart-cluster').style('display', 'none');
      })
      .on('click', (event, d) => {
        vis.handleThemeClusterClick(event, d);
      });

    // Interaction for legend ticks
    vis.yAxisG.selectAll('.tick')
      .on('mouseover', function (event, d) {
        d3.select(this).classed('hovered', true);
        vis.clusterLabels.filter((c) => c === d)
          .classed('hovered', true);
        vis.generateLegendTooltip(event, d);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this).classed('hovered', false);
        vis.clusterLabels.filter((c) => c === d)
          .classed('hovered', false);
        d3.select('#tooltip-barchart-cluster').style('display', 'none');
      })
      .on('click', (event, d) => {
        vis.handleThemeClusterClick(event, d);
      });

    // Interaction to clear selection on clicking background
    vis.svg.on('click', (event) => {
      // if things are filtered, clear them, else do nothing
      if (vis.selectedThemes.length > 0) {
        // Reset selection arrays to none
        vis.selectedThemes = [];

        // Dispatch filter event
        vis.dispatcher.call('filterThemes', event, []);

        // Filtering resets the selection in the graph, so we need to re-render multiple bars
        // Calling onGameSelect with argument of null will do this & handle rendering of bars
        // with correct styling for current selections
        vis.dispatcher.call('onGameSelect', event, null);
      }
    });
  }

  /**
     *  Helper to get the list of unique game ids corresponding to the currently selected themes
     * */
  getSelectedGames() {
    const vis = this;

    const selectedGames = vis.selectedThemes.length === 0
      ? [] // if there are no selected themes, handler will use all game ids
      : vis.aggregatedData.flatMap((c) => c.themes.flatMap((t) => (vis.selectedThemes.includes(t.theme) ? t.games : [])));
    const selectedGameIds = selectedGames.map((g) => g.id);
    return [...new Set(selectedGameIds)];
  }

  /**
   * Helper to do actions needed to set/unset selected status of theme clusters
   * */
  handleThemeClusterClick(event, d) {
    const vis = this;

    event.stopPropagation(); // so reset not called

    // Add or remove themes to/from selected array (to preserve when filtering)
    // Clicking bar selects all themes EXCEPT if all  already selected, then it deselects all
    const shouldSelect = !vis.config.themeClusterMap[d].themes.every((t) => vis.selectedThemes.includes(t));
    if (shouldSelect) {
      vis.config.themeClusterMap[d].themes.forEach((t) => {
        if (!vis.selectedThemes.includes(t)) vis.selectedThemes.push(t);
      });
    } else {
      vis.selectedThemes = vis.selectedThemes.filter((t) => !vis.config.themeClusterMap[d].themes.includes(t));
    }

    // Get the ids of selected games, if any, trigger filter event and pass array with the ids
    const uniqueSelectedGames = vis.getSelectedGames();
    vis.dispatcher.call('filterThemes', event, uniqueSelectedGames);

    // Filtering resets the selection in the graph, so we need to re-render multiple bars
    // Calling onGameSelect with argument of null will do this & handle rendering of bars
    // with correct styling for current selections
    vis.dispatcher.call('onGameSelect', event, null);
  }

  /**
   * Helper to do actions needed to set/unset selected status of theme clusters
   * */
  handleThemeClick(event, d) {
    const vis = this;

    event.stopPropagation(); // so reset not called

    const theme = d.theme || d; // can be called from a bar or a tick

    // Add or remove theme to/from selected array (to preserve when filtering)
    const shouldSelect = !vis.selectedThemes.includes(theme);
    if (shouldSelect) {
      vis.selectedThemes.push(theme);
    } else {
      vis.selectedThemes = vis.selectedThemes.filter((t) => t !== theme);
    }

    // Get ids of selected games, if any, and trigger filter event and pass array with the ids
    const uniqueSelectedGames = vis.getSelectedGames();
    vis.dispatcher.call('filterThemes', event, uniqueSelectedGames);

    // Filtering resets the selection in the graph, so we need to re-render multiple bars
    // Calling onGameSelect with argument of null will do this & handle rendering of bars
    // with correct styling for current selections
    vis.dispatcher.call('onGameSelect', event, null);
  }

  /**
     * Tooltip generator for hover on bar
     */
  generateThemeTooltip(event, d) {
    const vis = this;
    var html = "";
    if (vis.binsSelected) {
      html = `
              <ul>
                <li><span>Number of games:</span> ${d.num}</li>
                <li><span>Number of games with selected complexity and rating:</span> ${d.numWithSelectedRatingAndComplexity}</li>     
              </ul>
             `;
    } else {
      html = `
              <ul>
                <li><span>Number of games:</span> ${d.num}</li>
              </ul>
             `;
    }


    return d3.select('#tooltip-barchart-theme')
      .style('display', 'block')
      .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
      .style('top', `${event.pageY + vis.config.tooltipPadding}px`)
      .html(html);
  }

  /**
     * Tooltip generator for hover on legend (cluster names)
     */
  generateLegendTooltip(event, d) {
    const vis = this;

    const cluster_name_slice = d.slice(14);
    var cluster_name = "";
    var cluster_description = "";
    switch (cluster_name_slice) {
      case "nature":
        cluster_name = "(Super) Natural";
        cluster_description = "With 407 games, this includes themes such " +
            "as fantasy, the environment, and animals. Some of the most popular games exclusive to " +
            "this category include Catan, Wingspan and Agricola.";
        break;
      case "war":
        cluster_name = "Fight Night";
        cluster_description = "With 348 games, this category deals with themes involving conflict " +
            "or competition such as war, politics, and spies. Some of the most popular games exclusive to " +
            "this category include Codenames, Coup, and Twilight Struggle.";
        break;
      case "journey":
        cluster_name = "On A Journey";
        cluster_description = "With 341 games, this category includes themes such as adventure, " +
            "exploration, and transporation. Some of the most popular games exclusive to this category " +
            "include Ticket to Ride and Lost Cities.";
        break;
      case "science":
        cluster_name = "Science (Fiction)";
        cluster_description = "With 294 games, this category includes themes such as " +
            "horror, industry, medicine, and of course, science fiction. Some of the most popular games " +
            "exclusive to this category include Pandemic and Power Grid.";
        break;
      case "history":
        cluster_name = "Past Tense";
        cluster_description = "With 250 games, this category includes themes of a more " +
            "historically-rich nature, such as the American West and the Medieval age. Some of the " +
            "most popular games exclusive to this category include 7 Wonders and Carcasonne.";
        break;
      case "culture":
        cluster_name = "Popular Culture";
        cluster_description = "With 163 games, this category includes themes related to " +
            "modern subjects. Such themes include movies & tv, comic books, and video games." +
            " Some of the most popular games exclusive to this category include Sushi Go and Dixit.";
        break;
      default:
        break;
    }

    return d3.select('#tooltip-barchart-cluster')
      .style('display', 'block')
      .style('left', `${event.pageX + vis.config.tooltipPadding}px`)
      .style('top', `${event.pageY + vis.config.tooltipPadding}px`)
      .html(`<div class="tooltip-name"><text>${cluster_name}</text></div>
                    <div class="tooltip-description"><text>${cluster_description}</text></div>`);
  }
}
