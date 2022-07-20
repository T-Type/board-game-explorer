// from http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect
const getLineIntersection = (p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) => {
  const s1x = p1x - p0x;
  const s1y = p1y - p0y;
  const s2x = p3x - p2x;
  const s2y = p3y - p2y;
  const s = (-s1y * (p0x - p2x) + s1x * (p0y - p2y)) / (-s2x * s1y + s1x * s2y);
  const t = (s2x * (p0y - p2y) - s2y * (p0x - p2x)) / (-s2x * s1y + s1x * s2y);

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    const intX = p0x + (t * s1x);
    const intY = p0y + (t * s1y);
    return {
      x: intX,
      y: intY,
    };
  }
  return false;
};

const getHexagonForceGraphBorder = (center, diameter, themes) => {
  // center of drawing area
  const px = center[0];
  const py = center[1];

  // circumradius
  const r = diameter / 2;
  // taken from https://www.mathopenref.com/coordpolycalc.html
  const centerAng = (2 * Math.PI) / 6;
  const startAng = (Math.PI * 110) / 180;
  const points = d3.range(6).map((i) => {
    const ang = startAng + (i * centerAng);
    const vx = Math.round(px + r * Math.cos(ang));
    const vy = Math.round(py - r * Math.sin(ang));
    return { x: vx, y: vy, ang: ((startAng * 180) / Math.PI + 200) - 60 * (i) };
  });

  const hexagonCoordinates = {};
  d3.range(6).forEach((i) => {
    const x1 = points[i].x;
    const x2 = points[(i + 1) % 6].x;
    const y1 = points[i].y;
    const y2 = points[(i + 1) % 6].y;

    let group = 0;
    const mask1 = 1 << i;
    const mask2 = 1 << (i + 1) % 6;
    group |= mask1;
    group |= mask2;
    hexagonCoordinates[themes[i]] = {
      x1,
      y1,
      x2,
      y2,
      vertex: [x2, y2],
      angle: points[i].ang,
      twoThemesGroup: group,
      centroid: [(x1 + x2) / 2, (y1 + y2) / 2],
    };
  });

  hexagonCoordinates[themes[6]] = {
    centroid: [px, py],
  };

  hexagonCoordinates[themes[7]] = {
    centroid: [px, py],
  };

  return hexagonCoordinates;
};

const containWithinHex = (d, hexPoints, hexCenter) => {
  let { x } = d;
  let { y } = d;
  let inter = false;
  Object.keys(themeMap).forEach((key) => {
    const side = hexPoints[key];
    inter = getLineIntersection(side.x1, side.y1, side.x2, side.y2, hexCenter[0], hexCenter[1], x, y);
    if (inter) {
      x = inter.x;
      y = inter.y;
    }
  });

  return [x, y];
};

const tooltip = (d) => `
<div class="tooltip-background">
    <img src="images/hexagonal_background.jpg" alt="card-front">
</div>
<div class="tooltip-title">${d.name}</div>
<div class="tooltip-img">
    <img src="${d.thumbnail}" alt="${d.name}-thumbnail">
</div>
<ul class="tooltip-subtext">
    <li>
        <text class="deck-metric"> Rank: </text> 
        <div class="tooltip-line" id="rank-line"></div> 
        <text class ="deck-metric-value"> ${d.rank} </text>
    </li>
    <li>
        <text class="deck-metric">Rating:</text> 
        <div class="tooltip-line" id="rating-line"></div>
        <text class ="deck-metric-value"> ${d.rating.toFixed(1)}</text>
    </li>
    <li>
        <text class="deck-metric">No. Users Rated:</text> 
        <div class="tooltip-line" id="pop-line"></div>
        <text class ="deck-metric-value"> ${d3.format(',')(d.users_rated)}</text>
    </li>
    <li>
        <text class="deck-metric">Complexity:</text> 
        <div class="tooltip-line" id="comp-line"></div>
        <text class ="deck-metric-value"> ${d.complexity.toFixed(1)}</text>
    </li>
    <li>
        <text class="deck-metric">Min. Age:</text> 
        <div class="tooltip-line" id="age-line"></div>
        <text class ="deck-metric-value"> ${d.min_age}</text>
    </li>
    <li>
        <text class="deck-metric">No. of Players:</text> 
        <div class="tooltip-line" id="players-line"></div>
        <text class ="deck-metric-value"> ${d.min_players}-${d.max_players}</text>
    </li>
    <li>
        <text class="deck-metric">Avg. Play Time:</text> 
        <div class="tooltip-line" id="play-line"></div>
        <text class ="deck-metric-value"> ${d.playing_time}</text>
    </li>
</ul>
<div class="tooltip-qmark">
    <a href="${d.url}"><img src="images/question_mark.svg" alt="q_mark"></a>
    <div class="tooltip" id="game-link-tooltip">
        <text>Click to see more info at BoardGameGeek.com!</text>
    </div>
</div>

`;

// 000000 flip the bit for the theme they have
// e.g. if they have theme_cluster_history then group number is 000001 = 1
// if they had all themes then their group number is 111111 = 63

const getGroupNumber = (game) => {
  let group = 0;
  Object.keys(themeMap).forEach((key, index) => {
    if (game[key].length > 0) {
      const mask = 1 << index;
      group |= mask;
    }
  });
  return group;
};

const groupNumberToColourMap = (groupNumber) => {
  switch (groupNumber) {
    case 0:
      return 'none';
    case 1 << 0:
      return themeMapKeys[0];
    case 1 << 1:
      return themeMapKeys[1];
    case 1 << 2:
      return themeMapKeys[2];
    case 1 << 3:
      return themeMapKeys[3];
    case 1 << 4:
      return themeMapKeys[4];
    case 1 << 5:
      return themeMapKeys[5];
    default:
      return 'mixed';
  }
};
