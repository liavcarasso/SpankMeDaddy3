// Select elements
let spankCount = 0;
let sps = 0; // Coins per second
let playerToken = localStorage.getItem("playerToken");
let playerName = localStorage.getItem("playerName")
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
    const gameContainer = document.getElementById('game-container'); // Get game container

    while (true) {
        try {
            const res = await fetch(`${API_URL}/leaderboard`, { method: "GET" });
            if (res.ok) {
                // Fade out loading screen and reveal game container
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    gameContainer.classList.remove('scale-95', 'opacity-0');
                    gameContainer.classList.add('scale-100', 'opacity-100');
                }, 500); // Match CSS transition duration
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
    const isValid = await checkToken();
    console.log(isValid)
    if (!isValid) {
        // Use a custom modal or element for name input instead of prompt()
        // For now, keeping prompt as per original logic, but a custom UI is recommended.
        const name = prompt(`Enter your name:`);
        if (!name) { // Handle case where user cancels prompt
            alert("Name is required to play!");
            return registerIfNeeded(); // Re-prompt
        }
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        const data = await res.json();
        playerToken = data.token;
        playerName = name;
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
            listItem.innerHTML = `<span class="font-bold text-gray-100">#${index + 1} ${player.name}:</span> <span class="text-yellow-400">${player.score}</span>`;
            leaderboardList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
    }
}

async function fetchPlayerData() {
    if (!playerToken) return;
    try {
        const res = await fetch(`${API_URL}/player_data`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + playerToken
            },
        });
        if (!res.ok) {
            const errorData = await res.json();
            console.error("Failed to get data:", errorData);
            // Implement a custom message box instead of alert for better UX
            // alert(`Error: ${errorData.detail || "Unknown error"}`);
        }
        } catch (err) {
        console.error("Network error getting data:", err);
    }
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
            // Implement a custom message box instead of alert for better UX
            // alert(`Error: ${errorData.detail || "Unknown error"}`);
        }
    } catch (err) {
        console.error("Network error sending actions:", err);
    }

    actionQueue = [];
}, 5000);

setInterval(function() {
  spankCount += sps;
  updateDisplay()
}, 1000);

window.addEventListener("beforeunload", () => {
    if (!playerToken) return;

    const payload = {
        token: "Bearer " + playerToken
    };

    const blob = new Blob(
        [JSON.stringify(payload)],
        { type: 'application/json' }
    );

    navigator.sendBeacon(`${API_URL}/game/updatesps`, blob);
});



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

async function checkToken() {
    if (!playerToken) return false;

    const res = await fetch(`${API_URL}/token_valid`, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + playerToken
        }
    });

    if (!res.ok) return false;

    const data = await res.json();
    return data === true || data.valid === true;
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
    autoSpankButton.textContent = `קנה מנפיק הצלפות אוטומטי (עלות: ${Math.round(checkPrice())} הצלפות)`;
    // Disable button if not enough coins
    autoSpankButton.disabled = spankCount < checkPrice();
}

document.getElementById("addFriendButton").addEventListener("click", async () => {
    const playerName = localStorage.getItem("playerName");
    const friendNameInput = document.getElementById("friendNameInput");
    const friendName = friendNameInput.value.trim();

    if (!friendName || friendName === playerName) {
        // Use a custom message box instead of alert
        showCustomAlert("אנא הזן שם חוקי.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/add_friend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ player_name: playerName, friend_name: friendName })
        });

        const result = await res.json();
        // Use a custom message box instead of alert
        showCustomAlert(result.message);
        if (res.ok) { // Clear input only if successful
            friendNameInput.value = "";
        }
        loadFriends();
    } catch (err) {
        console.error("Error adding friend:", err);
        // Use a custom message box instead of alert
        showCustomAlert("משהו השתבש.");
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
            li.innerHTML = `<span class="font-bold text-gray-100">${friend.name}:</span> <span class="text-green-400">${friend.score}</span>`;
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

            if (data.length === 0) {
                list.innerHTML = '<li class="text-gray-400">אין בקשות חברות ממתינות.</li>';
            } else {
                data.forEach(sender => { // Use data directly since it's an array of senders
                    const li = document.createElement('li');
                    li.classList.add('flex', 'items-center', 'justify-between', 'bg-gray-800', 'p-3', 'rounded-lg', 'shadow-md', 'mb-2');
                    li.innerHTML = `
                        <span class="font-semibold">${sender}</span>
                        <div class="flex gap-2">
                            <button class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200 accept-btn">אשר</button>
                            <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200 decline-btn">דחה</button>
                        </div>
                    `;

                    li.querySelector('.accept-btn').onclick = () => respondToRequest(sender, true, li);
                    li.querySelector('.decline-btn').onclick = () => respondToRequest(sender, false, li);

                    list.appendChild(li);
                });
            }
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
        showCustomAlert(data.message); // Show confirmation message
        listItemElement.remove(); // Remove from list after responding
        fetchPendingFriendRequests(); // Refresh pending requests
        loadFriends(); // Refresh friends list as well
    })
    .catch(err => console.error("Error responding to friend request:", err));
}

// Refresh pending requests every 30 seconds
setInterval(fetchPendingFriendRequests, 30000);
setInterval(fetchLeaderboard, 10000);


// Custom Alert / Message Box function (replaces native alert())
function showCustomAlert(message) {
    const alertBox = document.createElement('div');
    alertBox.classList.add('fixed', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'bg-gray-800', 'p-6', 'rounded-lg', 'shadow-xl', 'z-[10000]', 'flex', 'flex-col', 'items-center', 'gap-4', 'border', 'border-gray-600', 'transition-all', 'duration-300', 'transform', ' ' );
    alertBox.style.opacity = '0'; // Start invisible
    alertBox.style.transform = 'translate(-50%, -50%) scale(0.8)'; // Start smaller

    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.classList.add('text-white', 'text-lg', 'font-semibold', 'text-center');

    const closeButton = document.createElement('button');
    closeButton.textContent = 'אישור';
    closeButton.classList.add('px-6', 'py-2', 'bg-blue-600', 'text-white', 'rounded-md', 'hover:bg-blue-700', 'transition-colors', 'duration-200');
    closeButton.onclick = () => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => alertBox.remove(), 300); // Remove after fade out
    };

    alertBox.appendChild(messageText);
    alertBox.appendChild(closeButton);
    document.body.appendChild(alertBox);

    // Animate in
    setTimeout(() => {
        alertBox.style.opacity = '1';
        alertBox.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);
}
