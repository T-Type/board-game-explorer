class ForceDirectedGraph {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _dispatcher, _nodes, _links, _themeMapKeys) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 800,
      containerHeight: _config.containerHeight || 800,
      margin: {
        top: 12, right: 12, bottom: 12, left: 12,
      },
      colourScale: _config.colourScale,
    };
    this.dispatcher = _dispatcher;
    this.nodes = _nodes;
    this.links = _links;
    this.themes = _themeMapKeys;
    this.themeMapKeys = Object.keys(themeMap);
    this.chosenGame = null;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.width = vis.config.containerWidth
      - vis.config.margin.left
      - vis.config.margin.right;

    vis.height = vis.config.containerHeight
      - vis.config.margin.top
      - vis.config.margin.bottom;

    vis.svg = d3
      .select(vis.config.parentElement)
      .attr('class', 'chart-outline')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.center = [vis.width / 2, vis.height / 2];

    // outer hex for drawing border
    vis.hexBorderOuter = getHexagonForceGraphBorder(vis.center, vis.config.containerWidth-5, vis.themes);

    // get hex points (2 sizes one inner, one outer)
    // inner hex
    vis.hexBorderInner = getHexagonForceGraphBorder(vis.center, (vis.width / 2), vis.themes);

    // middle hex to find centrods for single themed games
    vis.hexBorderMiddle = getHexagonForceGraphBorder(vis.center, ((vis.width * 2) / 3), vis.themes);

    // for the force graph to not overlap the border for drawing border,
    // contain within a hex that is slighly smaller than border hex
    vis.hexBorderBoundary = getHexagonForceGraphBorder(vis.center, vis.width - 12.5, vis.themes);

    // center games that have two themes on an inner hexagon between the two themes (at the vertex)
    vis.centroidForGroupNumber = {};
    vis.themeMapKeys.forEach((key) => vis.centroidForGroupNumber[vis.hexBorderInner[key].twoThemesGroup] = vis.hexBorderMiddle[key].vertex);

    // center games that have 1 theme in the middle of the 'theme' side
    vis.themeMapKeys.forEach((key, i) => vis.centroidForGroupNumber[1 << i] = vis.hexBorderMiddle[key].centroid);
    // all other are centered in the middle

    // initialize scales
    // below 5000, between 5 and 10 and above 10
    vis.weightScale = d3
      .scaleLinear()
      .domain(d3.extent(vis.links, (d) => d.weight))
      .range([0, 1]);

    vis.nodeRadius = d3
      .scaleSqrt()
      .range([4, 15])
      .domain(d3.extent(vis.nodes, d=> d.users_rated));

    // setup force simulation, using force in a box
    vis.groupingForce = forceInABox()
      .template('force')
      .groupBy('group')
      .size([vis.width, vis.height])
      .enableGrouping(true)
      .linkStrengthInterCluster(0.1)
      .linkStrengthIntraCluster(0.2)
      .strength(0.15)
      .forceLinkStrength(0.15)
      .forceLinkDistance(100)
      .forceCharge(800);

    vis.forceSim = d3
      .forceSimulation()
      .tick(100)
      .force(
        'link',
        d3
          .forceLink()
          .id((d) => d.id)
          .distance(20)
          .strength((d) => vis.weightScale(d.weight)),
      )
      .force('group', vis.groupingForce)
      .force('charge', d3.forceManyBody().strength(-15))
      .force(
        'collision',
        d3.forceCollide().radius((d) => vis.nodeRadius(d.users_rated) + 3),
      )
      .force(
        'x',
        d3
          .forceX()
          .x((d) => (vis.centroidForGroupNumber[d.group] ? vis.centroidForGroupNumber[d.group][0] : vis.center[0]))
          .strength((d) => (vis.centroidForGroupNumber[d.group] ? 0.7 : 0.2)),
      )
      .force(
        'y',
        d3
          .forceY()
          .y((d) => (vis.centroidForGroupNumber[d.group] ? vis.centroidForGroupNumber[d.group][1] : vis.center[1]))
          .strength((d) => (vis.centroidForGroupNumber[d.group] ? 0.7 : 0.2)),
      );

    // static elements
    // mask for clearing selection
    vis.chartBackground = vis.chart.append('path')
      .attr('class', 'mask')
      .attr('d', ' M 0,-1 L .866,-.5 v 1 L 0,1 L -.866,.5 v -1 Z')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .attr('transform', `translate(${vis.center[0]},${vis.center[1]}) scale(${0.65 * (vis.config.containerWidth / 2)}) rotate(-20)`);

    // setup paths for the text
    const pathsToFlip = [0, 4, 5];

    vis.chart
      .selectAll('.force-hex-border-path')
      .data(vis.themeMapKeys)
      .enter().append('path')
      .attr('class', 'force-hex-border-path')
      .attr('id', (d) => `border-${d}`)
      .attr('d', (d) => {
        // flip some of the paths so text appears right side up
        const { x1 } = vis.hexBorderOuter[d];
        const { x2 } = vis.hexBorderOuter[d];
        const { y1 } = vis.hexBorderOuter[d];
        const { y2 } = vis.hexBorderOuter[d];
        if (pathsToFlip.includes(vis.themeMapKeys.indexOf(d))) {
          return `M ${x2} ${y2} L ${x1} ${y1}`;
        }
        return `M ${x1} ${y1} L ${x2} ${y2}`;
      })
      .style('stroke', 'black')
      .style('opacity', 0);

    // set text for border
    vis.chart
      .selectAll('.force-hex-border-text')
      .data(vis.themeMapKeys)
      .enter().append('text')
      .attr('dy', (d) => {
        if (pathsToFlip.includes(vis.themeMapKeys.indexOf(d))) {
          return -25;
        }
        return 40;
      })
      .append('textPath')
      .attr('class', 'force-hex-border-text')
      .attr('xlink:href', (d) => `#border-${d}`)
      .attr('startOffset', '50%')
      .style('text-anchor', 'middle')
      .text((d) => themeMap[d].name);

    // setup rectangles for border
    vis.border = vis.chart
      .selectAll('.force-hex-border')
      .data(vis.themeMapKeys)
      .enter().append('rect')
      .attr('class', 'force-hex-border')
      .attr('x', (d) => vis.hexBorderOuter[d].centroid[0] - 365 / 2)
      .attr('y', (d) => vis.hexBorderOuter[d].centroid[1] - (25 / 2))
      .attr('transform', (d) => `rotate(${vis.hexBorderOuter[d].angle}, ${vis.hexBorderOuter[d].centroid[0]}, ${vis.hexBorderOuter[d].centroid[1]})`)
      .attr('width', 370)
      .attr('height', 25)
      .style('fill', (d) => vis.config.colourScale(d));

    // background so when settlement/city becomes opaque you don't see the border underneath
    // settlement
    vis.chart.append('path')
      .attr('d', 'm 20 20 v 20.3 h 30 v -13 h -15 v -8 l -6 -6 h -3 l -6 7')
      .attr('fill', 'white')
      .attr('transform', `translate(${vis.hexBorderOuter[vis.themeMapKeys[5]].x1 - 60},${vis.hexBorderOuter[vis.themeMapKeys[5]].y1 - 117}) scale(3)`);

    // settlement for mixed theme
    vis.settlement = vis.chart.append('path')
      .attr('id', 'settlement-mixed')
      .attr('class', 'themeIndicator')
      .attr('d', 'm 20 20 v 20.3 h 30 v -13 h -15 v -8 l -6 -6 h -3 l -6 7')
      .attr('fill', vis.config.colourScale('mixed'))
      .attr('transform', `translate(${vis.hexBorderOuter[vis.themeMapKeys[5]].x1 - 60},${vis.hexBorderOuter[vis.themeMapKeys[5]].y1 - 117}) scale(3)`);

    // label for mixed settlement
    vis.chart
      .attr('class', 'force-hex-border-text')
      .append('text')
      .attr('dy', 18)
      .append('textPath')
      .attr('xlink:href', '#settlement-mixed')
      .attr('startOffset', '46%')
      .attr('id', 'force-hex-border-text-multi')
      .style('text-anchor', 'middle')
      .text('Multi-theme');

    // CITY
    // city
    // background so when settlement/city becomes opaque you don't see the border underneath
    vis.chart.append('path')
      .attr('d', ' m 20 20 v 15.3 h 15 v -15 l -6 -6 h -3 l -6 6')
      .attr('fill', 'white')
      .attr('transform', `translate(${vis.hexBorderOuter[vis.themeMapKeys[2]].x1 - 100},${vis.hexBorderOuter[vis.themeMapKeys[2]].y1 - 50}) scale(3)`);

    // city for mixed theme
    vis.city = vis.chart.append('path')
      .attr('id', 'city-none')
      .attr('class', 'themeIndicator')
      .attr('d', ' m 20 20 v 15.3 h 15 v -15 l -6 -6 h -3 l -6 6')
      .attr('fill', vis.config.colourScale('none'))
      .attr('transform', `translate(${vis.hexBorderOuter[vis.themeMapKeys[2]].x1 - 100},${vis.hexBorderOuter[vis.themeMapKeys[2]].y1 - 50}) scale(3)`);

    // label for none city
    vis.chart
      .attr('class', 'force-hex-border-text')
      .append('text')
      .attr('dy', 17)
      .append('textPath')
      .attr('xlink:href', '#city-none')
      .attr('startOffset', '30%')
      .attr('id', 'force-hex-border-text-multi')
      .style('text-anchor', 'middle')
      .text('No Theme');

    // initialize legend
    vis.legend = new Legend({
      parentElement: '#legend',
      containerWidth: document.getElementById('legend').clientWidth,
      containerHeight: document.getElementById('legend').clientHeight,
      colourScale: vis.config.colourScale,
      hexScale: vis.nodeRadius,
    });
  }

  updateVis() {
    const vis = this;

    vis.clearStyling();

    vis.forceSim.nodes(vis.nodes);

    vis.forceSim.force('link').links(vis.links);

    vis.groupingForce.links(vis.links);

    // store into {id:[{links}]}
    vis.linksMap = {};

    vis.nodes.forEach((node) => {
      const links = vis.links.filter((n) => n.source.id === node.id);
      vis.linksMap[node.id] = links;
    });

    // store top 3
    vis.topThree = vis.nodes
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map((n) => n.id);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;
    // draw hexagon nodes with path
    const nodeMark = vis.chart
      .selectAll('.node')
      .data(vis.nodes)
      .join('path')
      .attr('id', (d) => `node-${d.id}`)
      .attr('d', ' M 0,-1 L .866,-.5 v 1 L 0,1 L -.866,.5 v -1 Z')
      .attr('fill', (d) => vis.config.colourScale(groupNumberToColourMap(d.group)))
      .attr('class', (d) => {
        if (vis.topThree.indexOf(d.id) >= 0) {
          const index = vis.topThree.indexOf(d.id);
          if (index === 0) return 'node rankFirst topThree';
          if (index === 1) return 'node rankSecond topThree';
          if (index === 2) return 'node rankThird topThree';
        }
        return 'node defaultNode';
      });

    // interactions
    nodeMark
      .on('mouseover', function (event, d) {
        d3.select('#node-tooltip').style('opacity', 1).html(tooltip(d));
        // vis.popOutSelectedNode(d, true);
        vis.renderHoverLinks(true, d.id);
        d3.select(this).raise();

        // Andrew edit: Hovering triggers css slide out
        const card = d3.select('#node-tooltip');
        card.attr('class', 'is-hovered');
      })

      .on('mouseleave', (event, d) => {
        // vis.popOutSelectedNode(d, false);
        vis.renderHoverLinks(false, d.id);

        // Andrew edit: Mouse leave triggers css slide in
        const card = d3.select('#node-tooltip');
        card.attr('class', null); // Removes the attribute
      })

      .on('click', function (event) {
        vis.dispatcher.call('onGameSelect', event, d3.select(this).data()[0]);
      });

    // // Update positions
    vis.forceSim.on('tick', () => {
      nodeMark
        .attr('transform', (d) => {
          const [x, y] = containWithinHex(d, vis.hexBorderBoundary, vis.center);
          // reset the center of the node
          d.x = x;
          d.y = y;
          return `translate(${x},${y}) scale(${vis.nodeRadius(d.users_rated)})`;
        });

      if (vis.linkHover) {
        vis.linkHover
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);
      }

      if (vis.linkSelected) {
        vis.linkSelected
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);
      }
      nodeMark.selectAll('.topThree').raise();
    });

    vis.forceSim.alpha(0.5).restart();

    vis.chartBackground
      .on('click', (event) => {
        vis.dispatcher.call('onGameSelect', event, null);
      });
  }

  clearStyling() {
    const vis = this;
    vis.chart.selectAll('.selectedNode').classed('selectedNode', false);
    vis.chart.selectAll('.linkSelected')
      .attr('opacity', 0)
      .classed('linkSelected', false);

    vis.chart.selectAll('.rankFirstSelected').classed('rankFirstSelected', false);
    vis.chart.selectAll('.rankSecondSelected').classed('rankSecondSelected', false);
    vis.chart.selectAll('.rankThirdSelected').classed('rankThirdSelected', false);

    vis.chart.selectAll('.node')
      .classed('unfocused', false)
      .classed('focused', false);

    vis.chart.selectAll('.force-hex-border')
      .classed('unfocused', false);

    vis.city
      .classed('unfocused', false);

    vis.settlement.classed('unfocused', false);

    // Andrew edit: Keeping node card opacity at 1 for deck transitions
    // d3.select("#node-card").style("opacity", 0);
  }

  popOutSelectedNode(node) {
    const vis = this;

    if (!node) {
      vis.clearStyling();
      return;
    }

    const { id } = node;

    // deactivate the other node
    vis.chart.selectAll('.selectedNode').classed('selectedNode', false);

    d3.select(`#node-${id}`).classed('selectedNode', true);

    d3.select(`#node-${id}`).raise();

    d3.select(`#node-${id}`).classed('rankFirstSelected', d3.select(`#node-${id}`).classed('rankFirst'));
    d3.select(`#node-${id}`).classed('rankSecondSelected', d3.select(`#node-${id}`).classed('rankSecond'));
    d3.select(`#node-${id}`).classed('rankSecondSelected', d3.select(`#node-${id}`).classed('rankSecond'));

    const targetNodes = vis.linksMap[id].map((link) => link.target.id);
    targetNodes.push(id);

    vis.chart.selectAll('.node')
      .classed('unfocused', (d) => !targetNodes.includes(d.id))
      .classed('focused', (d) => targetNodes.includes(d.id));

    vis.renderSelectedLinks(1, id);

    vis.chart.selectAll('.focused').raise();

    // get top level themes for this node
    const nodeThemeKeys = vis.themeMapKeys.reduce((arr, key) => {
      if (node[key].length > 0) {
        arr.push(key);
      }
      return arr;
    }, []);

    vis.chart.selectAll('.force-hex-border')
      .classed('unfocused', (d) => !nodeThemeKeys.includes(d));

    vis.city.classed('unfocused', nodeThemeKeys.length > 0);
    vis.settlement.classed('unfocused', nodeThemeKeys.length <= 1);

    // set tooltip
    d3.select('#node-card').style('opacity', 1).html(tooltip(node));
  }

  renderHoverLinks(isFocus, id) {
    const vis = this;

    const targetNodes = vis.linksMap[id].map((g) => g.target.id);
    vis.linkHover = vis.chart
      .selectAll('.linkHover')
      .data(vis.linksMap[id])
      .join('line')
      .attr('class', 'linkHover link')
      .attr('opacity', isFocus ? 1 : 0)
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .raise();

    vis.chart.selectAll('.node')
      .classed('focusedTemp', (d) => targetNodes.includes(d.id) && isFocus);

    vis.chart.selectAll('.focusedTemp')
      .raise();
  }

  renderSelectedLinks(opacity, id) {
    const vis = this;

    vis.linkSelected = vis.chart
      .selectAll('.linkSelected')
      .data(vis.linksMap[id])
      .join('line')
      .attr('class', 'linkSelected link')
      .attr('opacity', opacity)
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
      .raise();
  }
}
