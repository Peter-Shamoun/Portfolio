import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch all projects
        const projects = await fetchJSON('./lib/projects.json');
        
        // Get only the first 3 projects
        const latestProjects = projects.slice(0, 3);
        
        // Get the projects container
        const projectsContainer = document.querySelector('.projects');
        
        if (!projectsContainer) {
            console.error('Projects container not found on home page');
            return;
        }
        
        // Render the latest projects
        renderProjects(latestProjects, projectsContainer, 'h3');

        // Fetch GitHub data
        const githubData = await fetchGitHubData('peter-shamoun');
        
        // Get the profile stats container
        const profileStats = document.querySelector('#profile-stats');
        
        if (profileStats) {
            profileStats.innerHTML = `
                <dl>
                    <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
                    <dt>Public Gists</dt><dd>${githubData.public_gists}</dd>
                    <dt>Followers</dt><dd>${githubData.followers}</dd>
                    <dt>Following</dt><dd>${githubData.following}</dd>
                </dl>
            `;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}); 