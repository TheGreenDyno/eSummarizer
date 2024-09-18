let typingTimeouts = [];
let isClearing = false;

// Function to summarize the input text
async function summarizeText() {
    const text = document.getElementById('inputText').value;

    // Check if the input is empty
    if (text.trim() === '') {
        alert('Please enter some text to summarize.');
        return;
    }

    try {
        const response = await fetch('/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: text
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const summaryInfo = await response.json();

        // Display the summary
        let cleanedSummary = summaryInfo.summarizedText;

        // Clear any existing typewriter animations before starting a new one
        clearAllTimeouts();
        isClearing = false;
        document.getElementById('summaryText').value = ''; // Clear the textarea before starting the animation
        typeWriter(cleanedSummary, document.getElementById('summaryText'), 0, 0.1);

        // Update statistics
        document.getElementById('originalSentences').textContent = summaryInfo.originalSentenceCount;
        document.getElementById('summarizedSentences').textContent = summaryInfo.summarizedSentenceCount;
        document.getElementById('originalWords').textContent = summaryInfo.originalWordCount;
        document.getElementById('summarizedWords').textContent = summaryInfo.summarizedWordCount;
        document.getElementById('reductionRate').textContent = (summaryInfo.reductionRate * 100).toFixed(2) + '%';

        // Display ranking information with more decimal places
        const rankingList = document.getElementById('rankingList');
        rankingList.innerHTML = ''; // Clear existing content
        summaryInfo.sentenceRanks.forEach((sentenceRank, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. Rank: ${sentenceRank.rank.toFixed(6)} - "${sentenceRank.sentence}"`;
            rankingList.appendChild(li);
        });

        // Log nodes and links for debugging
        console.log("Nodes:", summaryInfo.graphNodes);
        console.log("Links:", summaryInfo.graphLinks);

        // Create force-directed graph
        createForceGraph(summaryInfo.graphNodes, summaryInfo.graphLinks);

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while summarizing the text. Please try again.');
    }
}

// Function to type text letter by letter
function typeWriter(text, textArea, index, speed) {
    if (isClearing) {
        return;
    }

    if (index < text.length) {
        textArea.value += text.charAt(index);
        index++;
        const timeoutId = setTimeout(function () {
            typeWriter(text, textArea, index, speed);
        }, speed);
        typingTimeouts.push(timeoutId);
    }
}

// Function to clear all timeouts
function clearAllTimeouts() {
    for (const timeoutId of typingTimeouts) {
        clearTimeout(timeoutId);
    }
    typingTimeouts = [];
}

// Optional: Add event listener for Enter key in input textarea
document.getElementById('inputText').addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault(); // Prevent default action
        summarizeText(); // Call the summarize function
    }
});

// Optional: Add function to clear input and results
function clearAll() {
    isClearing = true;
    clearAllTimeouts();
    document.getElementById('inputText').value = '';
    document.getElementById('summaryText').value = '';
    document.getElementById('originalSentences').textContent = '';
    document.getElementById('summarizedSentences').textContent = '';
    document.getElementById('originalWords').textContent = '';
    document.getElementById('summarizedWords').textContent = '';
    document.getElementById('reductionRate').textContent = '';
}

// Function to create a force-directed graph
function createForceGraph(nodes, links) {
    const width = document.getElementById('graph').clientWidth;
    const height = 400;

    // Clear existing SVG
    d3.select("#graph").selectAll("*").remove();

    const svg = d3.select("#graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(1)) // Updated strength
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line");

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", d => d3.interpolateViridis(d.rank))
        .call(drag(simulation));

    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .text(d => d.id)
        .attr("font-size", "10px")
        .attr("dx", 8)
        .attr("dy", 3)
        .attr("fill", "white");

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}

document.getElementById('logoutButton').addEventListener('click', function() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'same-origin'
    }).then(() => {
        window.location.href = '/login';
    }).catch(error => {
        console.error('Logout failed:', error);
    });
});

// Footer year update
document.addEventListener('DOMContentLoaded', function () {
    const yearSpan = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    yearSpan.textContent = currentYear;
});