# Board Game Explorer
Link: https://www.students.cs.ubc.ca/~cs-436v/22Jan/fame/projects/project_g22/index.html

## Created by
Michelle Langlois, Nicole Gaboury, Andrew Tsai

## Summary
A web app using data from BoardGameGeek. Users interact with visualizations, widgets, and linked views to explore board games.

## Stack
HTML, CSS, JavaScript (D3.js)

# Project citations

## Shared
- [color scale: categorical Tableau10 from D3](https://observablehq.com/@d3/color-schemes)
- [svg path maker](https://mavo.io/demos/svgpath/) : used to create paths for settlement and city shapes


## Force Directed Graph
### Hexagon shapes
- [path definition](https://gist.github.com/korakot/ce1b04761079a59b6cb40a77d20f7da9) : used for node shape
- [calculating geometries of a hexagon](https://www.mathopenref.com/coordpolycalc.html) : used when calculating positioning
- [scaling shapes with d3](https://stackoverflow.com/questions/18537004/trouble-with-d3-js-scaling-a-path-shape) : used to scale node sizes

### Positioning of nodes within hexagon
- [make a force directed graph converge on a calculated point](http://bl.ocks.org/larsenmtl/39a028da44db9e8daf14578cb354b5cb) : used to contain the nodes within the hexagon shape
- [changing link strength](
https://stackoverflow.com/questions/39379299/how-do-you-customize-the-d3-link-strength-as-a-function-of-the-links-and-nodes-c)
- [using forceInABox](https://observablehq.com/@john-guerra/force-in-a-box) : library used for overall placement

### Interactions
- [highlighting an element when hovering over another](https://stackoverflow.com/questions/40528400/d3-js-highlight-an-element-when-hovering-over-another) : used for highlighting neighbour nodes of the hovered node

## Barchart
### Small multiples of bar charts
- [grouped barchart example](https://bl.ocks.org/mbostock/3887051) : adapted the ideas around using multiple scales
- [scatterplot small multiples](https://observablehq.com/@d3/brushable-scatterplot-matrix) and [line chart small multiples](https://d3-graph-gallery.com/graph/line_smallmultiple.html) : adapted the ideas around how to make different axes for small multiples and share an axis

### Styling
- [rotated axis labels](https://bl.ocks.org/d3noob/3c040800ff6457717cca586ae9547dbf) : used on left-hand side y-axis


## Hexbin
### Setup and usage
- [library](https://github.com/d3/d3-hexbin) : documentation used for understanding how to set up and display hexbins
- [hexbins example](https://d3-graph-gallery.com/graph/density2d_hexbin.html) : used for understanding how to format input data for hexbins

## Deck
### Setup and Usage
- [flip card instruction and example](https://www.w3schools.com/howto/howto_css_flip_card.asp)
- [how to slide card in/out](https://www.w3schools.com/css/css3_transitions.asp)




## Filters and search
- [using the HTML select element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select)
- [animating the circle in the background of the dice](https://github.com/d3/d3-transition) and also [here](https://www.d3indepth.com/transitions/)
- [using a callback to populate an autocomplete -- see last demo](https://api.jqueryui.com/autocomplete/)
- [css styling for dropdown and general structure of using jquery for autocomplete](https://www.students.cs.ubc.ca/~cs-436v/21Jan/fame/projects/data-breaches)
- [clear error text when user cancels bad input](https://stackoverflow.com/questions/16190870/what-event-is-triggered-when-the-user-cancels-input-via-the-webkit-cancel-button)
- [hiding inserted status node](https://stackoverflow.com/questions/14300161/jquery-mobile-ui-helper-hidden-accessible)

## CSS
### Layout
- [grid layout used for filters section](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-flow)


## Data
- [BoardGameGeek website](https://boardgamegeek.com/)
- [list of category hierarchy](https://boardgamegeek.com/wiki/page/Category) and [category descriptions](https://boardgamegeek.com/wiki/page/Category#toc2)
- [dataset from Kaggle scrapped by James van Elteren](https://www.kaggle.com/datasets/jvanelteren/boardgamegeek-reviews)
- [James van Elteren's analysis of the Kaggle data](https://jvanelteren.github.io/blog/2022/01/19/boardgames.html)


## Images
- [Catan Robber](https://images.app.goo.gl/sNNYYBhv3A9zC9MSA)
- [Dice](https://commons.wikimedia.org/wiki/File:Dice.svg)
- [Hexagonal Background](https://www.vecteezy.com/free-vector/hexagon-pattern)


## Preprocessing
- [using MultiLabelBinarizer](https://stackoverflow.com/questions/45312377/how-to-one-hot-encode-from-a-pandas-column-containing-a-list) : used to create vectors out of games so that we could calculate cosine similarity
- [how to reassign columns in a loop](https://github.com/pandas-dev/pandas/issues/29435)


## Inspiration
- [Horrified](https://www.alhadaqa.com/wp-content/uploads/2020/04/horrified.html) : original inspiration for using this dataset
- [Intangible Cultural Heritage](https://www.visualcinnamon.com/portfolio/intangible-cultural-heritage/)
- [Linked Jazz](https://linkedjazz.org/network/?mode=clique)
- [EdgeMaps: Philosophers](https://mariandoerk.de/edgemaps/demo/#phils;map;;;) : inspired the idea of dynamic link highlighting
- [Actor Adaptability](https://www.students.cs.ubc.ca/~cs-436v/20Jan/fame/projects/20jan/actors/index.html) : inspired the idea to place games by theme cluster
- [DelicaSee](https://www.students.cs.ubc.ca/~cs-436v/21Jan/fame/projects/delicasee/index.html) : inspired the idea to derive a link attribute between games based on similarities
