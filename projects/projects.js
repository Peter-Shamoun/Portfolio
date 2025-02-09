import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch projects data
        const projects = await fetchJSON('../lib/projects.json');
        
        // Initialize search query and selection
        let query = '';
        let filteredProjects = projects;
        let selectedIndex = -1;
        let yearData = []; // Store year data for filtering

        // Create arc generator
        const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

        // Function to update selection styling
        function updateSelection() {
            // Update pie wedges
            d3.select('#projects-pie-plot')
                .selectAll('path')
                .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

            // Update legend items
            d3.select('.legend')
                .selectAll('li')
                .attr('class', (_, idx) => idx === selectedIndex ? 'legend-item selected' : 'legend-item');
        }

        // Function to filter projects based on search and selection
        function filterProjects() {
            if (selectedIndex === -1) {
                // No selection, show all projects that match the search
                return projects.filter(project => {
                    const projectValues = Object.values(project)
                        .map(value => {
                            if (Array.isArray(value)) return value.join(' ');
                            return String(value);
                        })
                        .join('\n')
                        .toLowerCase();
                    return projectValues.includes(query);
                });
            } else {
                // Show only projects from the selected year
                const selectedYear = yearData[selectedIndex].label;
                return projects.filter(project => {
                    const matchesSearch = Object.values(project)
                        .map(value => {
                            if (Array.isArray(value)) return value.join(' ');
                            return String(value);
                        })
                        .join('\n')
                        .toLowerCase()
                        .includes(query);
                    return project.year.toString() === selectedYear && matchesSearch;
                });
            }
        }

        // Function to handle selection
        function handleSelection(index) {
            selectedIndex = selectedIndex === index ? -1 : index;
            updateSelection();

            // Update filtered projects
            filteredProjects = filterProjects();

            // Update project list
            const projectsContainer = document.querySelector('.projects');
            if (projectsContainer) {
                renderProjects(filteredProjects, projectsContainer, 'h2');
            }
        }

        // Function to render pie chart and legend
        function renderPieChart(projectsToShow) {
            // Process project data to get counts by year
            let rolledData = d3.rollups(
                projectsToShow,
                v => v.length,
                d => d.year
            );

            // Convert rolled data to the format we need
            yearData = rolledData.map(([year, count]) => {
                return { value: count, label: year.toString() };
            });

            // Sort data by year
            yearData.sort((a, b) => b.label - a.label);

            // Create color scale using D3's Tableau 10 color scheme
            let colors = d3.scaleOrdinal(d3.schemeTableau10);

            // Create pie generator with value accessor
            let sliceGenerator = d3.pie().value(d => d.value);
            let arcData = sliceGenerator(yearData);
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
                    .attr('fill', colors(idx))
                    .on('click', () => handleSelection(idx));
            });

            // Update legend
            yearData.forEach((d, idx) => {
                legend.append('li')
                    .attr('class', 'legend-item')
                    .attr('style', `--color: ${colors(idx)}`)
                    .html(`<span class="swatch"></span>${d.label}<em>(${d.value})</em>`)
                    .on('click', () => handleSelection(idx));
            });

            // Update selection styling
            updateSelection();
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
            // Don't reset selection when searching
            filteredProjects = filterProjects();
            updateVisualizations(filteredProjects);
        });

        // Initial render
        updateVisualizations(projects);

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}); 