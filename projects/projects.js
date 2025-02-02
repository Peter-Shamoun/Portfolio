import { fetchJSON, renderProjects } from '../global.js';

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch projects data
        const projects = await fetchJSON('../lib/projects.json');
        
        // Get the projects container
        const projectsContainer = document.querySelector('.projects');
        
        if (!projectsContainer) {
            console.error('Projects container not found');
            return;
        }
        
        // Render the projects
        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}); 