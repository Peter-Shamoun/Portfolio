let data = [];
let commits = [];
let selectedCommits = [];
let filteredCommits = [];

// Global variables for scales
let xScale;
let yScale;
let fileTypeColors; // Color scale for file types

// Scrollytelling variables for commits
let NUM_ITEMS = 0; // Will be set to commits.length
let ITEM_HEIGHT = "auto"; // Height of each item in the scrolly
let VISIBLE_COUNT = 10; // Number of visible items
let totalHeight = 0; // Will be calculated based on commits.length
let scrollContainer;
let spacer;
let itemsContainer;

// Scrollytelling variables for files
let filesData = []; // Will store file data for scrollytelling
let FILES_ITEM_HEIGHT = "auto"; // Height of each file item
let FILES_VISIBLE_COUNT = 10; // Number of visible file items
let filesTotalHeight = 0; // Will be calculated based on filesData.length
let filesScrollContainer;
let filesSpacer;
let filesItemsContainer;

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
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
    
  // Initialize scrollytelling variables for commits
  NUM_ITEMS = commits.length;
  totalHeight = NUM_ITEMS * 200; // Estimate 200px per commit
  
  // Set initial filteredCommits to all commits
  filteredCommits = [...commits];
  
  // Process file data for file scrollytelling
  processFileData();
}

// Function to process file data for scrollytelling
function processFileData() {
  if (commits.length === 0) {
    filesData = [];
    filesTotalHeight = 0;
    return;
  }
  
  // Extract all lines from all commits
  const allLines = commits.flatMap(commit => commit.lines);
  
  // Group lines by file
  const fileGroups = d3.groups(allLines, d => d.file);
  
  // Create file data objects
  filesData = fileGroups.map(([name, lines]) => {
    return {
      name,
      lines,
      extension: name.split('.').pop(),
      totalLines: lines.length,
      types: Array.from(new Set(lines.map(d => d.type))),
      firstCommitDate: d3.min(lines, d => new Date(d.datetime)),
      lastCommitDate: d3.max(lines, d => new Date(d.datetime))
    };
  });
  
  // Sort files by total lines in descending order
  filesData.sort((a, b) => b.totalLines - a.totalLines);
  
  // Initialize scrollytelling variables for files
  filesTotalHeight = filesData.length * 200; // Estimate 200px per file
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
    
    // Set filteredCommits to all commits initially
    filteredCommits = [...commits];
    
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

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function updateSelection() {
  // Select all circles and update their 'selected' class
  d3.select('#chart')
    .selectAll('circle')
    .classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : filteredCommits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Sort languages by line count in descending order
  const sortedBreakdown = Array.from(breakdown).sort((a, b) => b[1] - a[1]);

  // Update DOM with breakdown
  container.innerHTML = '';

  // Format numbers with thousands separator
  const formatNumber = d3.format(',d');
  const formatPercent = d3.format('.1%');

  // Calculate total lines for percentage
  const totalLines = lines.length;

  for (const [language, count] of sortedBreakdown) {
    const proportion = count / totalLines;
    const dt = document.createElement('dt');
    dt.textContent = language;
    
    const dd = document.createElement('dd');
    dd.innerHTML = `
      <span class="count">${formatNumber(count)} lines</span>
      <span class="percentage">${formatPercent(proportion)}</span>
    `;
    
    container.appendChild(dt);
    container.appendChild(dd);
  }

  return breakdown;
}

function brushed(event) {
  const brushSelection = event.selection;
  
  selectedCommits = !brushSelection
    ? []
    : filteredCommits.filter((commit) => {
        const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
        const max = { x: brushSelection[1][0], y: brushSelection[1][1] };
        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);

        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });
      
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function updateScatterplot(commits) {
  if (!commits || commits.length === 0) {
    console.error('No commit data available for scatter plot');
    d3.select('#chart')
      .append('div')
      .attr('class', 'error-message')
      .html('<p>No commit data available for visualization.</p>');
    return;
  }

  console.log('Updating scatter plot with commits:', commits.length);

  // Sort commits by total lines in descending order for better overlapping
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  // Calculate the range of edited lines
  const [minLines, maxLines] = d3.extent(sortedCommits, d => d.totalLines);
  console.log('Lines range:', { minLines, maxLines });

  // Create a square root scale for the radius to ensure area is proportional to lines
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]); // Adjusted range to match requirements

  // Clear any existing chart
  d3.select('#chart svg').remove();

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

  // Update global scales
  xScale = d3
    .scaleTime()
    .domain(d3.extent(sortedCommits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
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

  // Use enter-update-exit pattern for better transitions
  const circles = dots
    .selectAll('circle')
    .data(sortedCommits, d => d.id); // Use commit ID as the key for better data binding
  
  // Remove old circles
  circles.exit().remove();
  
  // Update existing circles
  circles
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', (d) => colorScale(d.hourFrac));
  
  // Add new circles
  const newCircles = circles.enter()
    .append('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', (d) => colorScale(d.hourFrac))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .style('fill-opacity', 0.7);
  
  // Merge new and existing circles for event handling
  newCircles.merge(circles)
    .on('mouseenter', (event, commit) => {
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .style('fill-opacity', 1)
        .attr('r', d => rScale(d.totalLines) * 1.2)
        .classed('selected', isCommitSelected(commit));
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event, commit) => {
      updateTooltipContent({});
      updateTooltipVisibility(false);
      d3.select(event.currentTarget)
        .transition()
        .duration(200)
        .style('fill-opacity', 0.7)
        .attr('r', d => rScale(d.totalLines))
        .classed('selected', isCommitSelected(commit));
    });

  // Create brush and raise dots
  const brush = d3.brush()
    .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
    .on('start brush end', brushed);

  // Add brush to SVG
  svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  // Raise dots above brush overlay
  dots.raise();

  console.log('Scatter plot updated with dimensions:', { width, height, margin });
}

// New function to update the file visualization
function updateFileVisualization() {
  // Extract lines from filtered commits
  let lines = filteredCommits.flatMap((d) => d.lines);
  
  // Group lines by file and create file objects
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { 
        name, 
        lines,
        // Extract file extension for display
        extension: name.split('.').pop()
      };
    });
  
  // Sort files based on the selected sort option
  const fileSort = document.getElementById('file-sort');
  const sortOption = fileSort ? fileSort.value : 'lines';
  
  if (sortOption === 'lines') {
    // Sort files by number of lines in descending order
    files = d3.sort(files, (d) => -d.lines.length);
  } else if (sortOption === 'name') {
    // Sort files by name in ascending order
    files = d3.sort(files, (d) => d.name.toLowerCase());
  } else if (sortOption === 'extension') {
    // Sort files by extension in ascending order
    files = d3.sort(files, (d) => d.extension.toLowerCase());
  }
  
  // Get unique file types for the legend
  const fileTypes = Array.from(new Set(lines.map(d => d.type)));
  
  // Initialize color scale for file types if not already done
  if (!fileTypeColors) {
    fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  }
  
  // Update the file stats
  const fileStatsElement = d3.select('.file-section-header p');
  fileStatsElement.html(`
    <strong>${files.length}</strong> files with a total of <strong>${lines.length}</strong> lines of code. 
    Each dot represents one line of code. Files are sorted by ${
      sortOption === 'lines' ? 'number of lines' : 
      sortOption === 'name' ? 'file name' : 'file extension'
    }.
  `);
  
  // Clear existing visualization
  d3.select('.files').selectAll('div').remove();
  
  // If no files, show a message
  if (files.length === 0) {
    d3.select('.files')
      .append('div')
      .attr('class', 'no-files')
      .text('No files to display. Try adjusting the time slider.');
    return;
  }
  
  // Create container for files
  let filesContainer = d3.select('.files')
    .selectAll('div.file-item')
    .data(files)
    .enter()
    .append('div')
    .attr('class', 'file-item');
  
  // Add file names with line count and extension
  filesContainer.append('dt')
    .append('code')
    .html(d => {
      // Get the most common file type for this file
      const typeCount = d3.rollup(d.lines, v => v.length, l => l.type);
      const mostCommonType = Array.from(typeCount).sort((a, b) => b[1] - a[1])[0][0];
      const typeColor = fileTypeColors(mostCommonType);
      
      return `
        <span class="file-type-indicator" style="background-color: ${typeColor}"></span>
        ${d.name}
        <small>${d.lines.length} lines</small>
        <small class="extension">.${d.extension}</small>
      `;
    });
  
  // Add dots for each line
  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type))
    .attr('title', d => {
      const date = new Date(d.datetime).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return `Type: ${d.type}\nLine: ${d.line}\nAdded: ${date}\nCommit: ${d.commit.slice(0, 7)}`;
    })
    .on('mouseenter', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .style('transform', 'scale(2)')
        .style('opacity', '1')
        .style('z-index', '10');
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .style('transform', 'scale(1)')
        .style('opacity', '0.8')
        .style('z-index', '1');
    });
  
  // Create legend for file types
  updateFileTypeLegend(fileTypes);
  
  console.log(`Rendered ${files.length} files with a total of ${lines.length} lines`);
}

// New function to update the file type legend
function updateFileTypeLegend(fileTypes) {
  const legendContainer = d3.select('.file-type-legend');
  
  // Clear existing legend
  legendContainer.html('');
  
  // Add legend title and description
  legendContainer.append('h3').text('File Types');
  legendContainer.append('p')
    .style('font-size', '0.9em')
    .style('margin-top', '0.5em')
    .style('margin-bottom', '1em')
    .text('Each dot is colored by its file type:');
  
  // Count lines by type
  const linesByType = d3.rollup(
    filteredCommits.flatMap(d => d.lines),
    v => v.length,
    d => d.type
  );
  
  // Format numbers with thousands separator
  const formatNumber = d3.format(',d');
  
  // Create legend items
  const legendItems = legendContainer
    .selectAll('.legend-item')
    .data(fileTypes)
    .enter()
    .append('div')
    .attr('class', 'legend-item')
    .on('mouseenter', function(event, type) {
      // Highlight dots of this type
      d3.selectAll('.line')
        .style('opacity', d => d.type === type ? 1 : 0.3)
        .style('transform', d => d.type === type ? 'scale(1.2)' : 'scale(1)');
      
      // Highlight this legend item
      d3.select(this).classed('highlighted', true);
    })
    .on('mouseleave', function() {
      // Reset all dots
      d3.selectAll('.line')
        .style('opacity', 0.8)
        .style('transform', 'scale(1)');
      
      // Reset this legend item
      d3.select(this).classed('highlighted', false);
    });
  
  // Add color swatch
  legendItems
    .append('div')
    .attr('class', 'swatch')
    .style('background', d => fileTypeColors(d));
  
  // Add type name and count
  legendItems
    .append('span')
    .html(d => `${d} <small>(${formatNumber(linesByType.get(d))} lines)</small>`);
}

// Function to generate varied narrative text for commits
function generateCommitNarrative(commit, index, filesCount) {
  // Array of possible narrative templates
  const narrativeTemplates = [
    `During this ${getTimeOfDay(commit.datetime)}, I made ${index === 0 ? 'my first commit' : 'another important update'}. I edited ${commit.totalLines} lines across ${filesCount} file${filesCount !== 1 ? 's' : ''}.`,
    
    `At ${commit.datetime.toLocaleTimeString('en', {hour: '2-digit', minute: '2-digit'})}, I ${index === 0 ? 'started this project' : 'continued development'} with a commit that changed ${commit.totalLines} lines in ${filesCount} file${filesCount !== 1 ? 's' : ''}.`,
    
    `This ${getTimeOfDay(commit.datetime)} brought ${commit.totalLines} line changes to ${filesCount} file${filesCount !== 1 ? 's' : ''}. ${index === 0 ? 'The journey begins!' : 'The project continues to grow.'}`,
    
    `${index === 0 ? 'The first commit!' : 'Another step forward.'} Made during a ${getTimeOfDay(commit.datetime)}, this update touched ${commit.totalLines} lines across ${filesCount} file${filesCount !== 1 ? 's' : ''}.`,
    
    `${commit.datetime.toLocaleString('en', {weekday: 'long'})} ${getTimeOfDay(commit.datetime)}: ${commit.totalLines} lines modified in ${filesCount} file${filesCount !== 1 ? 's' : ''}.`
  ];
  
  // Select a random narrative template based on the commit index
  const narrativeIndex = Math.floor((index + commit.id.charCodeAt(0)) % narrativeTemplates.length);
  return narrativeTemplates[narrativeIndex];
}

// Helper function to get the time of day description
function getTimeOfDay(datetime) {
  const hour = datetime.getHours();
  
  if (hour < 6) return "late-night coding session";
  if (hour < 12) return "morning productivity sprint";
  if (hour < 18) return "afternoon development session";
  return "evening coding time";
}

// Function to render items in the commits scrolly
function renderItems(startIndex) {
  console.log(`Rendering commits from index ${startIndex}`);
  
  // Clear previous items
  itemsContainer.selectAll('div').remove();
  
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let visibleCommits = commits.slice(startIndex, endIndex);
  let newCommitSlice = commits.slice(0, endIndex); // Show commits up to the current point
  
  // Update the scatterplot with all commits up to current point
  updateScatterplot(newCommitSlice);
  
  // Update file visualization
  filteredCommits = newCommitSlice;
  displayCommitFiles();
  
  // Create items in the scrolly
  const items = itemsContainer.selectAll('div.item')
    .data(visibleCommits)
    .enter()
    .append('div')
    .attr('class', 'item')
    .style('margin-bottom', '20px'); // Ensure spacing between items
  
  // Add narrative content to each item
  items.html((commit, index) => {
    const commitIndex = startIndex + index;
    const filesCount = d3.rollups(commit.lines, D => D.length, d => d.file).length;
    const narrative = generateCommitNarrative(commit, commitIndex, filesCount);
    
    // Get the most common file type
    const typeCount = d3.rollup(commit.lines, v => v.length, d => d.type);
    const sortedTypes = Array.from(typeCount).sort((a, b) => b[1] - a[1]);
    const mainType = sortedTypes[0][0];
    
    return `
      <p style="font-weight: bold; margin-bottom: 8px;">
        Commit #${commitIndex + 1} - ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}
      </p>
      <p>
        ${narrative}
        <a href="${commit.url}" target="_blank">View commit ${commit.id.slice(0, 7)}</a>
      </p>
      <p>
        This commit primarily focused on <strong>${mainType}</strong> files, 
        with changes to ${commit.files.slice(0, 3).map(f => `<code>${f}</code>`).join(', ')}
        ${commit.files.length > 3 ? `and ${commit.files.length - 3} other files` : ''}.
        ${sortedTypes.length > 1 ? `Other file types affected: ${sortedTypes.slice(1).map(t => t[0]).join(', ')}.` : ''}
      </p>
      <p>
        Average line length: ${Math.round(commit.avgLineLength)} characters.
        ${commit.author ? `Committed by: ${commit.author}` : ''}
      </p>
    `;
  });
  
  // Add the visible class with a slight delay for each item
  items.each(function(d, i) {
    const item = d3.select(this);
    setTimeout(() => {
      item.classed('visible', true);
    }, i * 100); // 100ms delay between each item
  });
  
  // Update date indicator
  updateDateIndicator(startIndex);
}

// Function to render items in the files scrolly
function renderFileItems(startIndex) {
  // Clear previous items
  filesItemsContainer.selectAll('.item').remove();
  
  // Calculate end index
  const endIndex = Math.min(startIndex + FILES_VISIBLE_COUNT, filesData.length);
  
  // Get the current visible files
  const currentFiles = filesData.slice(startIndex, endIndex);
  
  // Update file visualization with current files
  displaySelectedFiles(currentFiles);
  
  // Create items in the scrolly
  const items = filesItemsContainer
    .selectAll('.item')
    .data(currentFiles)
    .enter()
    .append('div')
    .attr('class', 'item')
    .classed('visible', true);
  
  // Add narrative content to each item
  items.append('p')
    .html(d => {
      const avgLineLength = d.lines.reduce((sum, line) => sum + line.length, 0) / d.lines.length;
      const commitCount = new Set(d.lines.map(line => line.commit)).size;
      const percentOfCodebase = ((d.lines.length / totalLines) * 100).toFixed(1);
      
      return `<strong>${d.name}</strong>`;
    });
  
  items.append('p')
    .html(d => {
      const avgLineLength = d.lines.reduce((sum, line) => sum + line.length, 0) / d.lines.length;
      const commitCount = new Set(d.lines.map(line => line.commit)).size;
      const percentOfCodebase = ((d.lines.length / totalLines) * 100).toFixed(1);
      
      let narrative = `This file has <strong>${d.lines.length} lines</strong> of code`;
      
      // Add information about file size
      if (d.lines.length > 500) {
        narrative += `, making it one of the <strong>largest files</strong> in the codebase`;
      } else if (d.lines.length < 50) {
        narrative += `, making it one of the <strong>smallest files</strong> in the codebase`;
      }
      
      narrative += `. It represents <strong>${percentOfCodebase}%</strong> of the entire codebase.`;
      
      // Add information about file types
      const fileTypes = [...new Set(d.lines.map(line => line.type))];
      if (fileTypes.length > 1) {
        narrative += ` This file contains <strong>multiple languages</strong>: ${fileTypes.join(', ')}.`;
      } else if (fileTypes.length === 1) {
        narrative += ` This file is written in <strong>${fileTypes[0]}</strong>.`;
      }
      
      // Add information about commits
      if (commitCount > 1) {
        narrative += ` It has been modified across <strong>${commitCount} different commits</strong>.`;
      } else {
        narrative += ` It was created or modified in <strong>a single commit</strong>.`;
      }
      
      // Add information about average line length
      narrative += ` The average line length is <strong>${Math.round(avgLineLength)} characters</strong>.`;
      
      return narrative;
    });
  
  // Update file date indicator
  if (currentFiles.length > 0) {
    updateFileDateIndicator(startIndex);
  }
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
}

// Function to update the date indicator for commits
function updateDateIndicator(startIndex) {
  const dateIndicator = d3.select('#date-indicator');
  
  if (commits.length === 0) return;
  
  const currentCommit = commits[Math.min(startIndex, commits.length - 1)];
  const formattedDate = currentCommit.datetime.toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  
  dateIndicator.text(formattedDate);
}

// Function to update the date indicator for files
function updateFileDateIndicator(startIndex) {
  const dateIndicator = d3.select('#files-date-indicator');
  
  if (filesData.length === 0) return;
  
  const currentFile = filesData[Math.min(startIndex, filesData.length - 1)];
  dateIndicator.text(`${currentFile.name} (${currentFile.totalLines} lines)`);
}

// Function to display selected files
function displaySelectedFiles(files) {
  // Initialize color scale for file types if not already done
  if (!fileTypeColors) {
    fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  }
  
  // Get all lines from the selected files
  const lines = files.flatMap(file => file.lines);
  
  // Get unique file types for the legend
  const fileTypes = Array.from(new Set(lines.map(d => d.type)));
  
  // Clear existing visualization
  d3.select('.files').selectAll('div').remove();
  
  // If no files, show a message
  if (files.length === 0) {
    d3.select('.files')
      .append('div')
      .attr('class', 'no-files')
      .text('No files to display for the current selection.');
    return;
  }
  
  // Create container for files
  let filesContainer = d3.select('.files')
    .selectAll('div.file-item')
    .data(files)
    .enter()
    .append('div')
    .attr('class', 'file-item');
  
  // Add file names with line count and extension
  filesContainer.append('dt')
    .append('code')
    .html(d => {
      // Get the most common file type for this file
      const typeCount = d3.rollup(d.lines, v => v.length, l => l.type);
      const mostCommonType = Array.from(typeCount).sort((a, b) => b[1] - a[1])[0][0];
      const typeColor = fileTypeColors(mostCommonType);
      
      return `
        <span class="file-type-indicator" style="background-color: ${typeColor}"></span>
        ${d.name}
        <small>${d.lines.length} lines</small>
        <small class="extension">.${d.extension}</small>
      `;
    });
  
  // Add dots for each line
  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type))
    .attr('title', d => {
      const date = new Date(d.datetime).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      return `Type: ${d.type}\nLine: ${d.line}\nAdded: ${date}\nCommit: ${d.commit.slice(0, 7)}`;
    })
    .on('mouseenter', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .style('transform', 'scale(2)')
        .style('opacity', '1')
        .style('z-index', '10');
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .style('transform', 'scale(1)')
        .style('opacity', '0.8')
        .style('z-index', '1');
    });
  
  // Create legend for file types
  updateFileTypeLegend(fileTypes);
}

// Function to display file visualization for commits
function displayCommitFiles() {
  const lines = filteredCommits.flatMap((d) => d.lines);
  
  // Initialize color scale for file types if not already done
  if (!fileTypeColors) {
    fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  }
  
  // Group lines by file and create file objects
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });
  
  // Sort files by number of lines in descending order
  files = d3.sort(files, (d) => -d.lines.length);
  
  // Clear existing visualization
  d3.select('.files').selectAll('div').remove();
  
  // Create container for files
  let filesContainer = d3.select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div')
    .attr('class', 'file-item');
  
  // Add file names with line count
  filesContainer.append('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  
  // Add dots for each line
  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
}

// Update the DOMContentLoaded event listener to initialize both scrollytelling sections
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  try {
    const commits = await loadData();
    console.log('Data loaded:', commits ? commits.length : 0, 'commits');
    if (commits && commits.length > 0) {
      displayStats();
      
      // Set up the file sort dropdown
      const fileSort = document.getElementById('file-sort');
      if (fileSort) {
        fileSort.addEventListener('change', () => {
          updateFileVisualization();
        });
      }
      
      // Initialize commits scrollytelling
      scrollContainer = d3.select('#scroll-container');
      spacer = d3.select('#spacer');
      itemsContainer = d3.select('#items-container');
      
      // Estimate a reasonable spacer height
      totalHeight = commits.length * 200; // Estimate 200px per commit
      spacer.style('height', `${totalHeight}px`);
      
      // Add scroll event listener for commits
      scrollContainer.on('scroll', debounce(() => {
        const scrollTop = scrollContainer.property('scrollTop');
        const totalScrollHeight = totalHeight - scrollContainer.node().clientHeight;
        const scrollRatio = scrollTop / totalScrollHeight;
        let startIndex = Math.floor(scrollRatio * Math.max(0, commits.length - VISIBLE_COUNT));
        startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
        renderItems(startIndex);
      }, 100));
      
      // Initialize files scrollytelling
      filesScrollContainer = d3.select('#files-scroll-container');
      filesSpacer = d3.select('#files-spacer');
      filesItemsContainer = d3.select('#files-items-container');
      
      // Estimate a reasonable spacer height for files
      filesTotalHeight = filesData.length * 200; // Estimate 200px per file
      filesSpacer.style('height', `${filesTotalHeight}px`);
      
      // Add scroll event listener for files
      filesScrollContainer.on('scroll', debounce(() => {
        const scrollTop = filesScrollContainer.property('scrollTop');
        const totalScrollHeight = filesTotalHeight - filesScrollContainer.node().clientHeight;
        const scrollRatio = scrollTop / totalScrollHeight;
        let startIndex = Math.floor(scrollRatio * Math.max(0, filesData.length - FILES_VISIBLE_COUNT));
        startIndex = Math.max(0, Math.min(startIndex, filesData.length - FILES_VISIBLE_COUNT));
        renderFileItems(startIndex);
      }, 100));
      
      // Initial renders
      renderItems(0);
      renderFileItems(0);
      
      // Initialize date indicators
      if (commits.length > 0) {
        updateDateIndicator(0);
      }
      if (filesData.length > 0) {
        updateFileDateIndicator(0);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    d3.select('#stats').html('<p class="error">Error loading data</p>');
    d3.select('#chart').html('<p class="error">Error loading chart data</p>');
  }
});

// Debounce function to limit how often a function is called
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
} 