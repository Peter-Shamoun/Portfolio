// Theme handling code - consolidated at the top
function initializeTheme() {
  try {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedScheme = localStorage.getItem('colorScheme');
    const isDark = savedScheme === 'dark' || (savedScheme !== 'light' && prefersDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.style.setProperty('color-scheme', 'light');
    }
    
    return isDark ? 'dark' : 'light';
  } catch (error) {
    console.error('Error initializing theme:', error);
    return 'light'; // Fallback to light theme
  }
}

// Initialize theme immediately
const initialTheme = initializeTheme();

console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Handle contact form submission
const form = document.querySelector('#contactForm');
form?.addEventListener('submit', function(event) {
  event.preventDefault();
  
  const data = new FormData(event.target);
  let params = [];
  
  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }
  
  const url = `mailto:pshamoun@ucsd.edu?${params.join('&')}`;
  location.href = url;
});

// Add theme selector
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="system">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

// Add theme switching functionality
const select = document.querySelector('.color-scheme select');

// Set initial select value
try {
  const savedScheme = localStorage.getItem('colorScheme') || 'system';
  select.value = savedScheme;
} catch (error) {
  console.error('Error restoring theme preference:', error);
  select.value = 'system';
}

// Theme change handler
select.addEventListener('input', function (event) {
  try {
    const newScheme = event.target.value;
    console.log('color scheme changed to', newScheme);
    
    if (newScheme === 'system') {
      localStorage.removeItem('colorScheme');
      initializeTheme(); // This will apply system preference
    } else {
      if (newScheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
      document.documentElement.style.setProperty('color-scheme', newScheme);
      localStorage.setItem('colorScheme', newScheme);
    }
  } catch (error) {
    console.error('Error changing theme:', error);
  }
});

// Configuration for our site's pages
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contacts/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/Peter-Shamoun', title: 'GitHub Profile' }
];

// Check if we're on the home page
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Create and add the navigation
let nav = document.createElement('nav');
document.body.prepend(nav);

// Add links to the nav
for (let p of pages) {
  let url = p.url;
  
  // Add ../ prefix if we're not on home page and URL is not absolute
  url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
  
  // Create link element
  let a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;
  
  // Add current class if this is the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );
  
  // Add target="_blank" for external links
  if (a.host !== location.host) {
    a.target = '_blank';
  }
  
  nav.append(a);
}

console.log('Current link:', $$("nav a").find(
  (a) => a.host === location.host && a.pathname === location.pathname
)); // For debuggings

// Function to fetch JSON data
export async function fetchJSON(url) {
    try {
        // Fetch the JSON file from the given URL
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        return [];
    }
}

// Function to render projects
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement || !Array.isArray(projects)) {
        console.error('Invalid parameters provided to renderProjects');
        return;
    }

    // Clear existing content
    containerElement.innerHTML = '';

    // If no projects, show a message
    if (projects.length === 0) {
        containerElement.innerHTML = '<p>No projects available.</p>';
        return;
    }

    // Update the projects count in the title if it exists
    const titleElement = document.querySelector('.projects-title');
    if (titleElement) {
        titleElement.textContent = `Projects (${projects.length})`;
    }

    // Create and append project articles
    projects.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image || 'https://vis-society.github.io/labs/2/images/empty.svg'}" alt="${project.title}">
            <p>${project.description}</p>
        `;
        containerElement.appendChild(article);
    });
}

// Function to fetch GitHub data
export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}