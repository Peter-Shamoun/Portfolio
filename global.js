console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Configuration for our site's pages
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contacts/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/Peter-Shamoun', title: 'GitHub Profile', target: '_blank' }
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
  
  // Create the link with optional target attribute
  const targetAttr = p.target ? ` target="${p.target}"` : '';
  nav.insertAdjacentHTML('beforeend', `<a href="${url}"${targetAttr}>${p.title}</a>`);
}

// Add current class to the active link
const navLinks = $$("nav a");
let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);
currentLink?.classList.add('current');

console.log('Current link:', currentLink); // For debuggings