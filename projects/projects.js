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

        // Create arc generator
        const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

        // Function to render pie chart and legend
        function renderPieChart(projectsToShow) {
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

            // Clear existing paths and legend
            let svg = d3.select('#projects-pie-plot');
            svg.selectAll('path').remove();

            let legend = d3.select('.legend');
            legend.selectAll('li').remove();

            // Add new paths for each slice
            arcs.forEach((arc, idx) => {
                svg.append('path')
                    .attr('d', arc)
                    .attr('fill', colors(idx));
            });

            // Update legend
            data.forEach((d, idx) => {
                legend.append('li')
                    .attr('class', 'legend-item')
                    .attr('style', `--color: ${colors(idx)}`)
                    .html(`<span class="swatch"></span>${d.label}<em>(${d.value})</em>`);
            });
        }

        // Function to update all visualizations
        function updateVisualizations(projectsToShow) {
            // Update projects list
            const projectsContainer = document.querySelector('.projects');
            if (projectsContainer) {
                renderProjects(projectsToShow, projectsContainer, 'h2');
            }
            // Update pie chart and legend
            renderPieChart(projectsToShow);
        }

        // Set up search functionality
        const searchInput = document.querySelector('.searchBar');
        searchInput.addEventListener('input', (event) => {
            query = event.target.value.toLowerCase();
            filteredProjects = projects.filter(project => {
                // Convert all project values to a searchable string
                const projectValues = Object.values(project)
                    .map(value => {
                        if (Array.isArray(value)) {
                            return value.join(' ');
                        }
                        return String(value);
                    })
                    .join('\n')
                    .toLowerCase();
                
                return projectValues.includes(query);
            });
            updateVisualizations(filteredProjects);
        });

        // Initial render
        updateVisualizations(projects);

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}); 