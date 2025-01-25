console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Add theme selector
const isDarkMode = matchMedia("(prefers-color-scheme: dark)").matches;
const autoText = `Automatic (${isDarkMode ? "Dark" : "Light"})`;

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">${autoText}</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

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