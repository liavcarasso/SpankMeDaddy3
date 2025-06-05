// Select elements
let spankCount = 0;
let sps = 0; // Coins per second
let playerToken = localStorage.getItem("playerToken");
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

async function registerIfNeeded() {
    if (!playerToken || playerToken === 'undefined') {
        const name = prompt("Enter your name:");
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        const data = await res.json();
        playerToken = data.token;
        localStorage.setItem("playerToken", playerToken);
        localStorage.setItem("playerName", name);
    }
}

// ON START
registerIfNeeded().then(() => {
    waitForServer().then(() => {
        fetchPlayerData()
        fetchLeaderboard();
        fetchPendingFriendRequests();
        loadFriends();
    });
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



window.addEventListener('DOMContentLoaded', () => {
    fetchPlayerData()
    fetchPendingFriendRequests(); // Load pending requests on page load
    loadFriends();
});

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

async function fetchPlayerData() {
    if (!playerToken) return;

    const res = await fetch(`${API_URL}/player_data/${playerToken}`);
    const data = await res.json();

    spankCount = data.score;
    sps = data.sps;
    updateDisplay();
}


let actionQueue = [];

function queueAction(type, data = {}) {
    actionQueue.push({
        type,
        data
    });
}

setInterval(async () => {
    if (actionQueue.length === 0 || !playerToken) return;

    const payload = {
        actions: [...actionQueue]
    };

    try {
        const res = await fetch(`${API_URL}/game/actions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + playerToken
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Failed to send actions:", errorData);
        }
    } catch (err) {
        console.error("Network error sending actions:", err);
    }

    actionQueue = [];
}, 5000);


// Click event: Increase coins
spank.addEventListener("click", function(event) {
    spankCount++;
    updateDisplay();
    showFloatingText("+1", event.clientX, event.clientY);
    queueAction("click");

    spankSound.currentTime = 0;
    spankSound.volume = 0.1;
    spankSound.play();
});

autoSpankButton.addEventListener("click", function() {
    let price = (Math.pow(10*5.5,sps+1))
    if (sps !== 0){
        price = price/(10*sps)
    }
    if (spankCount >= price) {
        spankCount -= price;
        sps += 1;

        updateDisplay();
        queueAction("buy_upgrade", { upgrade: "auto_spank" });

        upgradeSound.currentTime = 0;
        upgradeSound.play();
    }
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

function checkPrice(){
    let price = (Math.pow(10*5.5,sps+1))
    if (sps !== 0){
        price = price/(10*sps)
    }
    return price
}

// Update coin display
function updateDisplay() {
    spankDisplay.textContent = spankCount;
    spsDisplay.textContent = sps;
    autoSpankButton.textContent = `Buy Auto-Spanker (Cost: ${checkPrice()} Spanks)`;
    // Disable button if not enough coins
    autoSpankButton.disabled = spankCount < checkPrice();
}

document.getElementById("addFriendButton").addEventListener("click", async () => {
    const playerName = localStorage.getItem("playerName");
    const friendName = document.getElementById("friendNameInput").value.trim();

    if (!friendName || friendName === playerName) {
        alert("Please enter a valid name.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/add_friend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_name: playerName, friend_name: friendName })
        });

        const result = await res.json();
        alert(result.message);
        loadFriends();
    } catch (err) {
        console.error("Error adding friend:", err);
        alert("Something went wrong.");
    }
});

async function loadFriends() {
    const playerName = localStorage.getItem("playerName");
    if (!playerName) return;

    try {
        const res = await fetch(`${API_URL}/friends/${playerName}`);
        const friends = await res.json();

        const list = document.getElementById("friendsList");
        list.innerHTML = "";
        friends.forEach(friend => {
            const li = document.createElement("li");
            li.textContent = `${friend.name}: ${friend.score}`;
            list.appendChild(li);
        });

        fetchPendingFriendRequests(); // Load pending requests after friends are loaded
    } catch (err) {
        console.error("Error loading friends:", err);
    }
}

function fetchPendingFriendRequests() {
    const playerName = localStorage.getItem("playerName"); // Retrieve playerName from localStorage
    if (!playerName) return; // Exit if playerName is not available

    fetch(`${API_URL}/get_friend_requests?username=${encodeURIComponent(playerName)}`)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('pending-requests-list');
            list.innerHTML = ''; // Clear old requests

            data.forEach(sender => { // Use data directly since it's an array of senders
                const li = document.createElement('li');
                li.textContent = `${sender} `;

                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = 'Accept';
                acceptBtn.onclick = () => respondToRequest(sender, true, li);

                const declineBtn = document.createElement('button');
                declineBtn.textContent = 'Decline';
                declineBtn.onclick = () => respondToRequest(sender, false, li);

                li.appendChild(acceptBtn);
                li.appendChild(declineBtn);

                list.appendChild(li);
            });
        })
        .catch(err => console.error("Error fetching friend requests:", err));
}

function respondToRequest(sender, accept, listItemElement) {
    const playerName = localStorage.getItem("playerName"); // Retrieve playerName from localStorage
    if (!playerName) return;

    fetch(`${API_URL}/respond_friend_request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: sender,
            receiver: playerName,
            accept: accept
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data.message);
        listItemElement.remove(); // Remove from list after responding
        fetchPendingFriendRequests(); // Refresh pending requests
    })
    .catch(err => console.error("Error responding to friend request:", err));
}

// Refresh pending requests every 30 seconds
setInterval(fetchPendingFriendRequests, 30000);

setInterval(score += sps, 1000)
