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
        
        // Sample data with labels
        let data = [
            { value: 1, label: 'apples' },
            { value: 2, label: 'oranges' },
            { value: 3, label: 'mangos' },
            { value: 4, label: 'pears' },
            { value: 5, label: 'limes' },
            { value: 5, label: 'cherries' }
        ];

        // Create color scale using D3's Tableau 10 color scheme
        let colors = d3.scaleOrdinal(d3.schemeTableau10);

        // Create pie generator with value accessor
        let sliceGenerator = d3.pie().value(d => d.value);
        let arcData = sliceGenerator(data);
        let arcs = arcData.map(d => arcGenerator(d));

        // Remove any existing paths
        d3.select('#projects-pie-plot').selectAll('path').remove();

        // Add new paths for each slice
        arcs.forEach((arc, idx) => {
            d3.select('#projects-pie-plot')
                .append('path')
                .attr('d', arc)
                .attr('fill', colors(idx));
        });

        // Create legend
        let legend = d3.select('.legend');
        
        // Remove any existing legend items
        legend.selectAll('li').remove();
        
        // Add legend items
        data.forEach((d, idx) => {
            legend.append('li')
                .attr('class', 'legend-item')
                .attr('style', `--color: ${colors(idx)}`)
                .html(`<span class="swatch"></span>${d.label}<em>(${d.value})</em>`);
        });

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}); 