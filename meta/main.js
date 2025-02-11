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

  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total commits
  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commits.length);

  // Add number of files
  dl.append('dt').text('FILES');
  dl.append('dd').text(d3.group(data, d => d.file).size);

  // Add total LOC
  dl.append('dt').html('TOTAL LOC');
  dl.append('dd').text(data.length);

  // Add maximum depth
  dl.append('dt').text('MAX DEPTH');
  dl.append('dd').text(d3.max(data, d => d.depth));

  // Add longest line
  dl.append('dt').text('LONGEST LINE');
  dl.append('dd').text(d3.max(data, d => d.length));

  // Add max lines per file
  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  dl.append('dt').text('MAX LINES');
  dl.append('dd').text(d3.max(fileLengths, d => d[1]));
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
  }
}

// Wait for DOM to load before starting
document.addEventListener('DOMContentLoaded', () => {
  loadData();
}); 