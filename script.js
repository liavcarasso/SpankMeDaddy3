// Select elements
let spankCount = 0;
let sps = 0; // Coins per second
let autoSCost = 10
const spankDisplay = document.getElementById("spanksCount");
const spsDisplay = document.getElementById("spsCount");
const spank = document.getElementById("spank");
const autoSpankButton = document.getElementById("autoSpankButton");
const floatingNumbers = document.getElementById("floatingNumbers");
const spankSound = document.getElementById("spankSound");
const upgradeSound = document.getElementById("upgradeSound");
const bgMusic = document.getElementById("bgMusic");
const muteButton = document.getElementById("muteButton");
const volumeSlider = document.getElementById("volumeSlider");
const API_URL = "https://spankmedaddy3beackend.onrender.com";

async function waitForServer() {
    const loadingScreen = document.getElementById("loading-screen");

    while (true) {
        try {
            const res = await fetch(`${API_URL}/leaderboard`, { method: "GET" });
            if (res.ok) {
                loadingScreen.style.display = "none";
                break;
            }
        } catch (err) {
            console.log("Server still waking up...");
        }

        // Wait 2 seconds before trying again
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Start checking before running the rest of the game logic
waitForServer().then(() => {
    // Place everything else that should start after the server is ready here:
    loadGame();
    fetchLeaderboard();
    setInterval(submitScore, 60000);
});


function enableMusic() {
    bgMusic.volume = 0.5; // Set volume
    bgMusic.play().catch(error => console.log("Autoplay blocked:", error));

    // Remove event listener after first interaction
    document.removeEventListener("click", enableMusic);
}
document.addEventListener("click", enableMusic);

const savedVolume = localStorage.getItem("bgMusicVolume");
if (savedVolume !== null) {
    bgMusic.volume = parseFloat(savedVolume);
    volumeSlider.value = savedVolume;
}

const savedMute = localStorage.getItem("bgMusicMuted");
if (savedMute === "true") {
    bgMusic.muted = true;
    muteButton.textContent = "🔇 Unmute";
}

// Mute/Unmute Button
muteButton.addEventListener("click", function() {
    bgMusic.muted = !bgMusic.muted;
    muteButton.textContent = bgMusic.muted ? "🔇 Unmute" : "🔊 Mute";

    // Save mute state
    localStorage.setItem("bgMusicMuted", bgMusic.muted);
});

// Volume Slider
volumeSlider.addEventListener("input", function() {
    bgMusic.volume = volumeSlider.value;

    // Save volume setting
    localStorage.setItem("bgMusicVolume", volumeSlider.value);
});

function loadGame() {
    const savedSpanks = localStorage.getItem("spanksCount");
    const savedSPS = localStorage.getItem("sps");
    const savedAutoCost = localStorage.getItem("autoSCost");

    if (savedSpanks !== null) spankCount = parseInt(savedSpanks);
    if (savedSPS !== null) sps = parseInt(savedSPS);
    if (savedAutoCost !== null) autoSCost = parseInt(savedAutoCost);

    updateDisplay();
}

function saveGame() {
    localStorage.setItem("spanksCount", spankCount);
    localStorage.setItem("sps", sps);
    localStorage.setItem("autoSCost", autoSCost);
    localStorage.setItem("spankCount", spankCount);
    submitScore();
}


async function fetchLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const leaderboard = await response.json();

        const leaderboardList = document.getElementById("leaderboard-list");
        leaderboardList.innerHTML = "";
        leaderboard.forEach((player, index) => {
            const listItem = document.createElement("li");
            listItem.textContent = `#${index + 1} ${player.name}: ${player.score}`;
            leaderboardList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
    }
}

async function submitScore() {
    const playerName = localStorage.getItem("playerName") || prompt("Enter your name:");
    localStorage.setItem("playerName", playerName);

    const data = { name: playerName, score: spankCount };

    try {
        await fetch(`${API_URL}/submit_score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        fetchLeaderboard(); // Refresh leaderboard
    } catch (error) {
        console.error("Error submitting score:", error);
    }
}

fetchLeaderboard();

// Click event: Increase coins
spank.addEventListener("click", function() {
    spankCount++;
    updateDisplay();
    saveGame();
    showFloatingText("+1", event.clientX, event.clientY);

    spankSound.currentTime = 0; // Reset sound (avoid delays)
    spankSound.volume = 0.1
    spankSound.play();
});

function showFloatingText(text, x, y) {
    const floatingText = document.createElement("div");
    floatingText.classList.add("floating-text");
    floatingText.textContent = text;

    // Position text near mouse click
    floatingText.style.left = `${x - 20}px`;
    floatingText.style.top = `${y - 20}px`;

    floatingNumbers.appendChild(floatingText);

    // Remove after animation
    setTimeout(() => {
        floatingText.remove();
    }, 1000);
}


// Buy Auto-Miner
autoSpankButton.addEventListener("click", function() {
    if (spankCount >= autoSCost) {
        spankCount -= autoSCost;
        sps += 1; // Each Auto-Miner adds 1 CPS
        autoSCost = Math.floor(autoSCost * 5.5);
        autoSpankButton.textContent = `Buy Auto-Spanker (Cost: ${autoSCost} Spanks)`;
        updateDisplay();
        saveGame();

        upgradeSound.currentTime = 0;
        upgradeSound.play();
    }
});

// Auto-mining function
function autoSpank() {
    spankCount += sps;
    updateDisplay();
    saveGame();
}

// Update coin display
function updateDisplay() {
    spankDisplay.textContent = spankCount;
    spsDisplay.textContent = sps;
    autoSpankButton.textContent = `Buy Auto-Spanker (Cost: ${autoSCost} Spanks)`;
    // Disable button if not enough coins
    autoSpankButton.disabled = spankCount < autoSCost;
}

// Run auto-mining every second
setInterval(autoSpank, 1000);
loadGame()
