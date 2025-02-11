import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

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
    
    // Process commits immediately after loading data
    processCommits();
    return commits;
  } catch (error) {
    console.error('Error loading data:', error);
    const errorMessage = d3.select('#stats')
      .append('div')
      .attr('class', 'error-message')
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

    // Also show error in chart area
    d3.select('#chart')
      .append('div')
      .attr('class', 'error-message')
      .html('<p>Chart data not available yet. Please wait for the GitHub Action to complete.</p>');
      
    return null;
  }
}

// Dimensions for the scatterplot
const width = 1000;
const height = 600;
const margin = { 
  top: 20,     // Increased from 10
  right: 30,   // Increased from 10
  bottom: 40,  // Increased from 30
  left: 50     // Increased from 20 to accommodate time labels
};

const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id.slice(0, 7);
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleString('en', {
    timeStyle: 'short',
  });
  author.textContent = commit.author;
  lines.textContent = `${commit.totalLines} lines`;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const padding = 10;
  
  // Get viewport dimensions
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  
  // Get tooltip dimensions
  const tooltipRect = tooltip.getBoundingClientRect();
  
  // Calculate position
  let left = event.clientX + padding;
  let top = event.clientY + padding;
  
  // Adjust if tooltip would go off screen
  if (left + tooltipRect.width > vw) {
    left = event.clientX - tooltipRect.width - padding;
  }
  if (top + tooltipRect.height > vh) {
    top = event.clientY - tooltipRect.height - padding;
  }
  
  // Apply position
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function createScatterplot(commits) {
  if (!commits || commits.length === 0) {
    console.error('No commit data available for scatter plot');
    d3.select('#chart')
      .append('div')
      .attr('class', 'error-message')
      .html('<p>No commit data available for visualization.</p>');
    return;
  }

  console.log('Creating scatter plot with commits:', commits.length);

  // Clear any existing chart
  d3.select('#chart').html('');

  // Create SVG with explicit dimensions and padding
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('max-width', '100%')
    .style('height', 'auto')
    .style('padding', '1rem');

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

  // Create color scale for time of day
  const colorScale = d3
    .scaleSequential()
    .domain([0, 24])
    .interpolator(d3.interpolateRdYlBu);

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableArea.width)
      .tickValues(d3.range(0, 25, 2)) // Add lines every 2 hours
  );

  // Create axes with more formatting
  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(1)) // Show one tick per day
    .tickFormat(d3.timeFormat('%b %d')); // Format as "Mar 21"

  const yAxis = d3
    .axisLeft(yScale)
    .ticks(12) // Show fewer ticks
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add axes to SVG with proper positioning
  svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .style('text-anchor', 'end')
    .attr('dx', '-.8em')
    .attr('dy', '.15em')
    .attr('transform', 'rotate(-45)');

  svg
    .append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // Add dots with enhanced styling and interactivity
  const dots = svg.append('g')
    .attr('class', 'dots')
    .attr('transform', `translate(0, 0)`);

  dots
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5)
    .attr('fill', (d) => colorScale(d.hourFrac))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('mouseenter', (event, commit) => {
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      d3.select(event.target)
        .transition()
        .duration(200)
        .attr('r', 8);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      updateTooltipContent({});
      updateTooltipVisibility(false);
      d3.select(event.target)
        .transition()
        .duration(200)
        .attr('r', 5);
    });

  console.log('Scatter plot created with dimensions:', { width, height, margin });
}

// Update the DOMContentLoaded event listener to create the scatterplot
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  try {
    const commits = await loadData();
    console.log('Data loaded:', commits ? commits.length : 0, 'commits');
    if (commits && commits.length > 0) {
      displayStats();
      createScatterplot(commits);
    }
  } catch (error) {
    console.error('Error:', error);
    d3.select('#stats').html('<p class="error">Error loading data</p>');
    d3.select('#chart').html('<p class="error">Error loading chart data</p>');
  }
}); 