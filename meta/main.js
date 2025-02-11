let data = [];
let commits = [];

function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      
      let ret = {
        id: commit,
        url: 'https://github.com/Peter-Shamoun/Portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
        // Additional useful stats
        totalLength: d3.sum(lines, d => d.length),
        avgLineLength: d3.mean(lines, d => d.length),
        types: Array.from(new Set(lines.map(d => d.type))),
        files: Array.from(new Set(lines.map(d => d.file)))
      };

      // Add lines as a hidden property
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,  // Won't show up in console.log
        configurable: true, // Can be changed later
        writable: true      // Can be modified
      });

      return ret;
    });
    
  // Sort commits by date
  commits.sort((a, b) => a.datetime - b.datetime);
}

function displayStats() {
  // Process commits first
  processCommits();

  // Create sections for different types of stats
  const container = d3.select('#stats');
  
  // Add summary section
  const summary = container.append('section')
    .attr('class', 'summary-stats');
  
  summary.append('h2')
    .text('Summary Statistics');

  const summaryDl = summary.append('dl')
    .attr('class', 'stats');

  // Basic stats
  const basicStats = [
    { label: 'COMMITS', value: commits.length },
    { label: 'FILES', value: d3.group(data, d => d.file).size },
    { label: 'TOTAL LOC', value: data.length },
    { label: 'MAX DEPTH', value: d3.max(data, d => d.depth) }
  ];

  // File stats
  const fileStats = d3.rollups(
    data,
    v => ({
      lines: d3.max(v, d => d.line),
      depth: d3.max(v, d => d.depth),
      avgDepth: d3.mean(v, d => d.depth)
    }),
    d => d.file
  );

  const longestFile = d3.greatest(fileStats, d => d[1].lines);
  const avgFileLength = d3.mean(fileStats, d => d[1].lines);
  const avgFileDepth = d3.mean(fileStats, d => d[1].avgDepth);

  // Line stats
  const longestLine = d3.greatest(data, d => d.length);
  const avgLineLength = d3.mean(data, d => d.length);

  // Time stats
  const workByHour = d3.rollups(
    commits,
    v => v.length,
    d => d.datetime.getHours()
  );

  const workByDay = d3.rollups(
    commits,
    v => v.length,
    d => d.datetime.getDay()
  );

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeOfDay = hour => {
    if (hour < 6) return 'Night';
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  const workByTimeOfDay = d3.rollups(
    commits,
    v => v.length,
    d => timeOfDay(d.datetime.getHours())
  );

  const mostActiveTime = d3.greatest(workByTimeOfDay, d => d[1])[0];
  const mostActiveDay = dayNames[d3.greatest(workByDay, d => d[1])[0]];

  // Add all stats
  const allStats = [
    { label: 'COMMITS', value: commits.length },
    { label: 'FILES', value: d3.group(data, d => d.file).size },
    { label: 'TOTAL LOC', value: data.length },
    { label: 'MAX DEPTH', value: d3.max(data, d => d.depth) },
    { label: 'LONGEST FILE', value: longestFile[0], detail: `${longestFile[1].lines} lines` },
    { label: 'AVG FILE LENGTH', value: Math.round(avgFileLength), detail: 'lines' },
    { label: 'LONGEST LINE', value: longestLine.length, detail: 'characters' },
    { label: 'AVG LINE LENGTH', value: Math.round(avgLineLength), detail: 'characters' },
    { label: 'AVG FILE DEPTH', value: avgFileDepth.toFixed(1), detail: 'levels' },
    { label: 'MOST ACTIVE TIME', value: mostActiveTime },
    { label: 'MOST ACTIVE DAY', value: mostActiveDay }
  ];

  // Add stats to the display
  allStats.forEach(stat => {
    const dt = summaryDl.append('dt').text(stat.label);
    const dd = summaryDl.append('dd').text(stat.value);
    if (stat.detail) {
      dd.append('small').text(` ${stat.detail}`);
    }
  });
}

async function loadData() {
  try {
    const response = await fetch('loc.csv');
    if (!response.ok) {
      throw new Error(`
        The loc.csv file is not available yet. 
        This file will be generated when the GitHub Action runs.
        Please commit and push your changes to trigger the action.
      `);
    }

    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line),
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
    
    displayStats();
    return commits;
  } catch (error) {
    console.error('Error loading data:', error);
    d3.select('#stats')
      .append('div')
      .attr('class', 'error-message')
      .style('padding', '1em')
      .style('background', 'var(--form-background)')
      .style('border-radius', '8px')
      .style('margin', '1em 0')
      .html(`
        <h3 style="margin-top: 0">Data Not Available Yet</h3>
        <p>The code statistics file (loc.csv) is not available yet. This file will be generated automatically when you:</p>
        <ol>
          <li>Commit your changes</li>
          <li>Push to the main branch</li>
          <li>Wait for the GitHub Action to complete</li>
        </ol>
        <p>After the action completes, refresh this page to see the statistics.</p>
      `);
    return null;
  }
}

// Dimensions for the scatterplot
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 20 };

const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

function createScatterplot(commits) {
  // Create SVG
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Create scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Create axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add axes to SVG
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Add dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', 'steelblue');
}

// Update the DOMContentLoaded event listener to create the scatterplot
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const commits = await loadData();
    displayStats();
    createScatterplot(commits);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('stats').innerHTML = '<p class="error">Error loading data</p>';
  }
}); 