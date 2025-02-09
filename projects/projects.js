import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

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

        // Create arc generator
        let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
        
        // Sample data and colors
        let data = [1, 2];
        let colors = ['gold', 'purple'];

        // Create pie generator
        let sliceGenerator = d3.pie();
        let arcData = sliceGenerator(data);
        let arcs = arcData.map(d => arcGenerator(d));

        // Remove any existing paths
        d3.select('#projects-pie-plot').selectAll('path').remove();

        // Add new paths for each slice
        arcs.forEach((arc, idx) => {
            d3.select('#projects-pie-plot')
                .append('path')
                .attr('d', arc)
                .attr('fill', colors[idx]);
        });

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}); 