import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch projects data
        const projects = await fetchJSON('../lib/projects.json');
        
        // Initialize search query
        let query = '';
        let filteredProjects = projects;

        // Function to update visualizations
        function updateVisualizations(projectsToShow) {
            // Update projects list
            const projectsContainer = document.querySelector('.projects');
            if (projectsContainer) {
                renderProjects(projectsToShow, projectsContainer, 'h2');
            }

            // Process project data to get counts by year
            let rolledData = d3.rollups(
                projectsToShow,
                v => v.length,
                d => d.year
            );

            // Convert rolled data to the format we need
            let data = rolledData.map(([year, count]) => {
                return { value: count, label: year.toString() };
            });

            // Sort data by year
            data.sort((a, b) => b.label - a.label);

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

            // Update legend
            let legend = d3.select('.legend');
            legend.selectAll('li').remove();
            
            data.forEach((d, idx) => {
                legend.append('li')
                    .attr('class', 'legend-item')
                    .attr('style', `--color: ${colors(idx)}`)
                    .html(`<span class="swatch"></span>${d.label}<em>(${d.value})</em>`);
            });
        }

        // Create arc generator
        let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

        // Set up search functionality
        const searchInput = document.querySelector('.searchBar');
        searchInput.addEventListener('input', (event) => {
            query = event.target.value.toLowerCase();
            filteredProjects = projects.filter(project => 
                project.title.toLowerCase().includes(query) ||
                project.description.toLowerCase().includes(query) ||
                (project.technologies && project.technologies.some(tech => 
                    tech.toLowerCase().includes(query)
                ))
            );
            updateVisualizations(filteredProjects);
        });

        // Initial render
        updateVisualizations(projects);

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}); 