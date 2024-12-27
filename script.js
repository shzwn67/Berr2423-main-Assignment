document.addEventListener("DOMContentLoaded", function() {
  const container = document.getElementById("container");

  // Function to clear the container
  function clearContainer() {
    container.innerHTML = '';
  }

  // Function to display welcome message with Register and Login buttons
  function displayWelcomeMessage() {
    container.innerHTML = `
        <h1>Hello! Welcome to Pinggu World!</h1>
        <div id="welcome-buttons">
            <button id="showRegisterButton">Register</button>
            <button id="showLoginButton">Login</button>
        </div>
    `;

    document.getElementById("showRegisterButton").addEventListener("click", showRegistrationForm);
    document.getElementById("showLoginButton").addEventListener("click", showLoginForm);
}

  // Function to show registration form
  function showRegistrationForm() {
    clearContainer();
    container.innerHTML = `
      <h2>Registration Form</h2>
      <form id="registrationForm">
        <div class="form-group">
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
        </div>
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required>
        </div>
        <button type="submit">Register</button>
      </form>
    `;

    const registrationForm = document.getElementById("registrationForm");

    registrationForm.addEventListener("submit", async function(event) {
      event.preventDefault(); // Prevent form submission

      const formData = new FormData(registrationForm);
      const username = formData.get("username");
      const password = formData.get("password");
      const name = formData.get("name");
      const email = formData.get("email");

      try {
        const response = await fetch("http://localhost:5500/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: username,
            password: password,
            name: name,
            email: email
          })
        });
        if (response.ok) {
          // Registration successful, set a flag for new user and redirect to login form
          localStorage.setItem("isNewUser", true);
          showLoginForm();
        } else {
          console.error("Registration failed");
          alert("Registration failed. Please try again.");
        }
      } catch (error) {
        console.error("Error during registration:", error);
        alert("An error occurred during registration. Please try again later.");
      }
    });
  }

  function showLoginForm() {
    clearContainer();
    container.innerHTML = `
      <h2>Login Form</h2>
      <form id="loginForm">
        <div class="form-group">
          <label for="username">Username:</label>
          <input type="text" id="loginUsername" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="loginPassword" name="password" required>
        </div>
        <button type="submit">Login</button>
      </form>
    `;

    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", async function(event) {
      event.preventDefault(); // Prevent form submission

      const formData = new FormData(loginForm);
      const username = formData.get("username");
      const password = formData.get("password");

      try {
        const response = await fetch("http://localhost:5500/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: username,
            password: password
          })
        });
        if (response.ok) {
          // Clear all relevant local storage data to ensure a fresh start, but keep coins
          const currentCoins = localStorage.getItem('coins') || 0;
          
          localStorage.clear();
          
          // Reset score and level
          localStorage.setItem("level", 1);
          localStorage.setItem("score", 0);
          localStorage.setItem("coins", currentCoins);  // Preserve coins

          // Show interface with play and setting buttons
          const isNewUser = localStorage.getItem("isNewUser");
          localStorage.setItem("username", username); // Save username in local storage
          showInterface(username, isNewUser);
          localStorage.removeItem("isNewUser");
        } else {
          const errorText = await response.text();
          console.error("Login failed:", errorText);
          alert(errorText);
        }
      } catch (error) {
        console.error("Error during login:", error);
        alert("An error occurred during login. Please try again later.");
      }
    });
  }

  // Function to show interface with play and setting buttons
  function showInterface(username, isNewUser) {
    clearContainer();
    container.innerHTML = `
      <h2>Welcome, ${username}!</h2>
      <button id="playButton">Play</button>
      <button id="settingButton">Setting</button>
      <button id="inventoryButton">Inventory</button>
      <button id="leaderboardButton">Leaderboard</button>
    `;

    document.getElementById("playButton").addEventListener("click", function() {
      if (isNewUser) {
        showInstructions(startGame);
      } else {
        startGame();
      }
    });
    document.getElementById("settingButton").addEventListener("click", function() {
      showSettings(username);
    });

    document.getElementById("inventoryButton").addEventListener("click", function() {
      openInventoryModal(); // Open the inventory modal when the button is clicked
    });

    document.getElementById("leaderboardButton").addEventListener("click", function() {
      showLeaderboard(username);
    });
  }

  function showSettings(username) {
    clearContainer();
    container.innerHTML = `
      <h2>Settings</h2>
      <button id="updateInfoButton">Update Info</button>
      <button id="deleteAccountButton">Delete Account</button>
      <button id="closeSettingsButton">Close</button>
    `;

    document.getElementById("updateInfoButton").addEventListener("click", function() {
      showUpdateForm(username);
    });

    document.getElementById("deleteAccountButton").addEventListener("click", function() {
      deleteAccount(username);
    });

    document.getElementById("closeSettingsButton").addEventListener("click", function() {
      showInterface(username);
    });
  }

  // Function to start the game
  function startGame() {
    clearContainer();
    container.innerHTML = `
      <canvas id="gameCanvas" width="750" height="450"></canvas> <!-- Adjusted canvas size -->
      <div id="game-stats">
        <p>Level: <span id="level">1</span></p>
        <p>Score: <span id="score">0</span></p>
        <p>Coins: <span id="coins">${localStorage.getItem('coins') || 0}</span></p>
      </div>
      <div id="gameOverModal">
        <p>Game Over! Your score: <span id="finalScore"></span></p>
        <button id="continueWithCoinsBtn">Continue with 3 Coins</button>
        <button id="restartLevelBtn">Restart Level</button>
        <button id="quitGameBtn">Quit Game</button>
        <button id="showInventoryBtn">Inventory</button>
      </div>
    `;
//
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Game variables
    let level = 1;
    let score = 0;
    let coins = localStorage.getItem('coins') ? parseInt(localStorage.getItem('coins')) : 0;
    let gameSpeed = 4; // Initial game speed
    let obstacles = [];
    let powerUps = [];
    let isJumping = false;
    let isBow = false;
    let dinoY = canvas.height - 40; // Starting Y position for the character
    let dinoHeight = 40;
    let dinoWidth = 40;
    const gravity = 0.3; // Gravity affecting jump descent
    const jumpPower = -10; // Jump strength
    let velocityY = 0;
    let lastObstacleType = null; // Track the last obstacle type for variety
    let isPoweredUp = false; // Track if the character is powered up
    let powerUpEndTime = 0; // When the power-up ends
    let powerUpCount = 0; // Number of active power-ups
    let powerUpsSpawned = 0; // Number of power-ups spawned in the current level
    let hasSecondLife = false; // Track if the character has a second life
    let isBlinking = false; // Track blinking state
    let blinkCount = 0; // Number of blinks during blinking state
    let isRunningBackward = false; // Track if running backward
    let backwardDuration = 0; // Duration of running backward
    let coinArray = [];
    let gameRunning = true;

    // Function to save only the collected coins into the inventory
    function saveCoins() {
      localStorage.setItem('coins', coins);
    }

    // Function to save inventory data in MongoDB
    async function saveInventoryToServer(inventory) {
      try {
        const response = await fetch("http://localhost:5500/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(inventory)
        });
        if (!response.ok) {
          console.error("Failed to save inventory to server");
        }
      } catch (error) {
        console.error("Error saving inventory to server:", error);
      }
    }

    // Function to save inventory data in local storage
    function saveInventory() {
      const inventory = {
        score: score,
        coins: coins,
        level: level,
        username: localStorage.getItem("username") // Ensure username is sent with inventory
      };
      localStorage.setItem('inventory', JSON.stringify(inventory));
      saveInventoryToServer(inventory); // Save inventory to server as well
    }

    // Function to load inventory data from MongoDB
    async function loadInventoryFromServer(username) {
      try {
        const response = await fetch(`http://localhost:5500/inventory?username=${username}`);
        if (response.ok) {
          const inventory = await response.json();
          score = inventory.score;
          coins = inventory.coins;
          level = inventory.level;
        } else {
          console.error("Failed to load inventory from server");
        }
      } catch (error) {
        console.error("Error loading inventory from server:", error);
      }
    }

    // Function to load inventory data from local storage
    async function loadInventory() {
      const username = localStorage.getItem("username");
      await loadInventoryFromServer(username); // Load inventory from server
      const inventory = JSON.parse(localStorage.getItem('inventory'));
      if (inventory) {
        score = inventory.score;
        coins = inventory.coins;
        level = inventory.level;
      }
    }

    // Load inventory when the game starts
    loadInventory();

    // Display initial level and score
    document.getElementById('level').innerText = level;
    document.getElementById('score').innerText = score;
    document.getElementById('coins').innerText = coins;

    // Handle keydown events for jump and bow actions
    document.addEventListener('keydown', function(event) {
      if ((event.code === 'Space' || event.code === 'ArrowUp')) {
        if (!isJumping || isPoweredUp) { // Allow jump if not jumping or if powered up
          isJumping = true;
          velocityY = jumpPower;
          console.log('Jump initiated');
        }
      } else if (event.code === 'ArrowDown') {
        isBow = true;
        console.log('Bow initiated');
      }
    });

    // Handle keyup event to stop bowing
    document.addEventListener('keyup', function(event) {
      if (event.code === 'ArrowDown') {
        isBow = false;
        console.log('Bow stopped');
      }
    });

    function update() {
      if (!gameRunning) return;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update character position if jumping
      if (isJumping) {
        dinoY += velocityY;
        velocityY += gravity;
        if (dinoY >= canvas.height - dinoHeight) {
          dinoY = canvas.height - dinoHeight;
          isJumping = false;
          console.log('Landed');
        }
      }

      // Handle power-up state
      if (isPoweredUp && Date.now() > powerUpEndTime) {
        isPoweredUp = false;
        powerUpCount = 0;
        dinoHeight = 40; // Reset size after power-up ends
        hasSecondLife = false; // Reset second life state
      }

      // Handle running backward state
      if (isRunningBackward) {
        if (backwardDuration < 5000) { // Run backward for 5 seconds
          gameSpeed = -2; // Move backward
          backwardDuration += 16; // Increment duration (assuming 60 FPS)
        } else {
          gameSpeed = 2; // Reset game speed
          isRunningBackward = false; // Stop running backward
          backwardDuration = 0; // Reset duration
        }
      }

      // Draw character (penguin)
      if (!isBlinking || blinkCount % 20 < 10) {
        ctx.fillStyle = 'pink'; // Character color
        const currentHeight = isBow ? dinoHeight / 2 : dinoHeight; // Adjust height when bowing
        const currentY = isBow ? dinoY + dinoHeight / 2 : dinoY; // Adjust Y position when bowing

        // Body
        ctx.beginPath();
        ctx.moveTo(40, currentY + currentHeight / 2); // Adjust body position when bowing
        ctx.lineTo(50, currentY + currentHeight / 4);
        ctx.lineTo(60, currentY + currentHeight / 2);
        ctx.lineTo(50, currentY + currentHeight);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(50, currentY + currentHeight / 4, 8, 0, Math.PI * 2); // Adjust head position when bowing
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white'; // Eye color
        ctx.beginPath();
        ctx.arc(48, currentY + currentHeight / 4 - 2, 2, 0, Math.PI * 2); // Left eye
        ctx.arc(52, currentY + currentHeight / 4 - 2, 2, 0, Math.PI * 2); // Right eye
        ctx.fill();

        // Beak
        ctx.fillStyle = 'orange'; // Beak color
        ctx.beginPath();
        ctx.moveTo(47, currentY + currentHeight / 4 + 2); // Beak start
        ctx.lineTo(50, currentY + currentHeight / 4 + 5); // Beak mid
        ctx.lineTo(53, currentY + currentHeight / 4 + 2); // Beak end
        ctx.fill();

        // Wings (optional)
        ctx.fillStyle = 'pink'; // Wing color
        ctx.fillRect(40, currentY + currentHeight / 2, 5, 10); // Left wing
        ctx.fillRect(55, currentY + currentHeight / 2, 5, 10); // Right wing
      }

      // Update and draw obstacles
      for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].x -= gameSpeed;

        // Draw obstacle based on type
        if (obstacles[i].type === 'fire') {
          drawFire(obstacles[i].x, canvas.height - 30, 20, 20);
        } else if (obstacles[i].type === 'monster') {
          drawMonster(obstacles[i].x, canvas.height - 50);
        }

        // Check collision
        if (
          obstacles[i].x < 50 + dinoWidth &&
          obstacles[i].x + 40 > 50 &&
          canvas.height - 30 < dinoY + dinoHeight &&
          canvas.height - 30 + 20 > dinoY
        ) {
          if (hasSecondLife) {
            hasSecondLife = false;
            isBlinking = true;
            blinkCount = 0;
            console.log('Second life activated');
            setTimeout(() => {
              isBlinking = false;
            }, 1500); // Blink for 1.5 seconds
            obstacles.splice(i, 1); // Remove the obstacle
            i--; // Adjust index after removal
            continue; // Skip to next iteration
          } else {
            if (obstacles[i].type === 'monster') {
              isRunningBackward = true; // Activate running backward state
              backwardDuration = 0; // Reset backward duration
            } else {
              gameOver();
              return; // Stop the game loop
            }
          }
        }

        // Increase score if obstacle passes
        if (obstacles[i].x + 40 < 0) { // Increased width for monster obstacles
          score++; // Increment score
          document.getElementById('score').innerText = score; // Update score display
          obstacles.splice(i, 1); // Remove obstacle
          i--; // Adjust index after removal
        }
      }

      // Update and draw power-ups
      for (let i = 0; i < powerUps.length; i++) {
        powerUps[i].x -= gameSpeed;

        // Draw power-up (mushroom)
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(powerUps[i].x + 10, powerUps[i].y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(powerUps[i].x + 5, powerUps[i].y + 5, 3, 0, Math.PI * 2);
        ctx.arc(powerUps[i].x + 15, powerUps[i].y + 5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Check collision with power-up
        if (
          powerUps[i].x < 50 + dinoWidth &&
          powerUps[i].x + 20 > 50 &&
          powerUps[i].y < dinoY + dinoHeight &&
          powerUps[i].y + 20 > dinoY
        ) {
          isPoweredUp = true;
          powerUpCount++; // Increment power-up count
          dinoHeight = 40 + (20 * powerUpCount); // Increase size based on power-up count
          powerUpEndTime = Date.now() + 15000; // Set end time for power-up
          hasSecondLife = true; // Grant second life
          powerUps.splice(i, 1); // Remove power-up
          i--; // Adjust index after removal
        }
      }

      // Update and draw coins
      for (let i = 0; i < coinArray.length; i++) {
        coinArray[i].x -= gameSpeed;

        // Draw coin
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(coinArray[i].x, coinArray[i].y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Check collision with coin
        if (
          coinArray[i].x < 50 + dinoWidth &&
          coinArray[i].x + 10 > 50 &&
          coinArray[i].y < dinoY + dinoHeight &&
          coinArray[i].y + 10 > dinoY
        ) {
          coins++;
          document.getElementById('coins').innerText = coins; // Update coins display
          coinArray.splice(i, 1); // Remove coin
          i--; // Adjust index after removal
          saveCoins(); // Save coins when a coin is collected
        }
      }

      // Check if score reaches level up threshold
      if (score >= 10 * level) {
        level++; // Increment level
        gameSpeed += 0.5; // Increase game speed for next level
        powerUpsSpawned = 0; // Reset power-ups spawned count
        document.getElementById('level').innerText = level;
        if (level > 3) {
          // Generate monster shape obstacle
          let newObstacle = { x: canvas.width, type: 'monster' };
          obstacles.push(newObstacle);
        }
        alert('Congratulations! You\'ve leveled up to Level ' + level + '!');
        saveInventory(); // Save inventory when leveling up
      }

      // Add new obstacle with adjusted distance
      if (Math.random() < 0.005) { // Further reduced probability for fewer obstacles
        let newObstacle = { x: canvas.width, type: 'fire' };
        obstacles.push(newObstacle);
      }

      // Add new power-up with lower probability and limit to two per level
      if (Math.random() < 0.005 && powerUpsSpawned < 2) { // Lower probability for power-ups
        let newPowerUp = { x: canvas.width, y: canvas.height - (Math.random() * 100 + 20) }; // Random height
        powerUps.push(newPowerUp);
        powerUpsSpawned++; // Increment power-ups spawned count
      }

      // Add new coin with some probability
      if (Math.random() < 0.01) { // Adjust the frequency of coin generation
        let coinX = canvas.width;
        let coinY = Math.random() * canvas.height;
        coinArray.push({ x: coinX, y: coinY });
      }

      if (isBlinking) {
        blinkCount++;
      }

      requestAnimationFrame(update);
    }

    // Function to draw fire obstacle
    function drawFire(x, y, width, height) {
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(x, y + height);
      ctx.lineTo(x + width / 4, y);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x + (3 * width) / 4, y);
      ctx.lineTo(x + width, y + height);
      ctx.closePath();
      ctx.fill();
    }

    // Function to draw monster obstacle
    function drawMonster(x, y) {
      // Draw tree obstacle
      const treeX = x + 5;
      const treeY = y;

      // Trunk
      ctx.fillStyle = 'brown';
      ctx.fillRect(treeX + 5, treeY, 10, 30);

      // Crown
      ctx.fillStyle = 'green';
      ctx.beginPath();
      ctx.moveTo(treeX, treeY);
      ctx.lineTo(treeX + 20, treeY);
      ctx.lineTo(treeX + 10, treeY - 30);
      ctx.closePath();
      ctx.fill();
    }

    // Function to update inventory display
    function updateInventory() {
      document.getElementById('score').innerText = score;
      document.getElementById('coins').innerText = coins;
    }

    // Function to end the game
    function gameOver() {
      gameRunning = false;
      const modal = document.getElementById("gameOverModal");
      document.getElementById("finalScore").innerText = score;
      modal.style.display = "block";
      localStorage.setItem("lastScore", score); // Save the last score
      localStorage.setItem("lastLevel", level); // Save the last level
      localStorage.setItem("lastCoins", coins); // Save the last coins
      saveInventory(); // Save inventory when the game is over
    }

    // Event listeners for modal buttons
    document.getElementById("continueWithCoinsBtn").addEventListener("click", () => {
      if (coins >= 3) {
        coins -= 3; // Deduct 3 coins
        saveCoins(); // Save coins after deduction
        updateInventory(); // Update inventory display
        document.getElementById("gameOverModal").style.display = "none"; // Close modal
        resumeGame(); // Resume the game
      } else {
        alert("Insufficient coins. Restarting level.");
        resetGame(level); // Reset the game to the current level
        document.getElementById("gameOverModal").style.display = "none"; // Close modal
        gameRunning = true; // Continue game
        update(); // Restart game loop
      }
    });

    document.getElementById("restartLevelBtn").addEventListener("click", () => {
      resetGame(level); // Reset the game to the current level
      document.getElementById("gameOverModal").style.display = "none"; // Close modal
      gameRunning = true; // Continue game
      update(); // Restart game loop
    });

    document.getElementById("quitGameBtn").addEventListener("click", () => {
      // Reset level and score without saving
      level = 1;
      score = 0;
      document.getElementById("gameOverModal").style.display = "none"; // Close modal
      displayWelcomeMessage(); // Go back to the welcome screen
    });

    document.getElementById("showInventoryBtn").addEventListener("click", () => {
      openInventoryModal();
    });

    // Function to resume the game
    function resumeGame() {
      const lastScore = localStorage.getItem("lastScore");
      const lastLevel = localStorage.getItem("lastLevel");
      const lastCoins = localStorage.getItem("lastCoins");
      score = lastScore;
      level = lastLevel;
      coins = lastCoins;
      gameRunning = true; // Continue game
      update(); // Restart game loop
    }

    function resetGame() {
      score = 0;
      level = 1;
      dinoY = canvas.height - 40;
      velocityY = 0;
      obstacles = [];
      powerUps = [];
      coinArray = [];
      gameSpeed = 4;
      isJumping = false;
      isPoweredUp = false;
      powerUpCount = 0;
      powerUpEndTime = 0;
      hasSecondLife = false;
      isBlinking = false;
      blinkCount = 0;
      isRunningBackward = false;
      backwardDuration = 0;
      updateInventory();
      saveInventory(); // Save inventory on game reset
    }

    // Start the game loop
    update();
  }

  // Function to show update form
  function showUpdateForm(currentUsername) {
    clearContainer();
    container.innerHTML = `
      <h2>Update Info</h2>
      <form id="updateForm">
        <div class="form-group">
          <label for="newUsername">New Username:</label>
          <input type="text" id="newUsername" name="newUsername">
        </div>
        <div class="form-group">
          <label for="newPassword">New Password:</label>
          <input type="password" id="newPassword" name="newPassword">
        </div>
        <button type="submit">Update</button>
      </form>
      <button id="closeButton">Close</button>
    `;

    const updateForm = document.getElementById("updateForm");

    updateForm.addEventListener("submit", async function(event) {
      event.preventDefault(); // Prevent form submission

      const formData = new FormData(updateForm);
      const updatedInfo = {
        username: formData.get("newUsername") || currentUsername,
        password: formData.get("newPassword")
      };

      try {
        const response = await fetch('http://localhost:5500/updateUser', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentUsername: currentUsername,
            updatedInfo: updatedInfo
          })
        });
        if (response.ok) {
          console.log('User information updated successfully');
          alert('User information updated successfully');
          showInterface(updatedInfo.username); // Update the interface with the new username
        } else {
          const errorText = await response.text();
          console.error('Failed to update user information:', errorText);
          alert('Failed to update user information. Please try again.');
        }
      } catch (error) {
        console.error('Error updating user information:', error);
        alert('An error occurred while updating user information. Please try again later.');
      }
    });

    document.getElementById("closeButton").addEventListener("click", () => {
      showInterface(currentUsername);
    });
  }

  // Function to delete account
  async function deleteAccount(username) {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5500/deleteUser/${username}`, {
        method: "DELETE"
      });
      if (response.ok) {
        console.log("User account deleted successfully");
        alert("User account deleted successfully");
        displayWelcomeMessage();
      } else {
        const errorText = await response.text();
        console.error("Failed to delete user account:", errorText);
        alert("Failed to delete user account. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting user account:", error);
      alert("An error occurred while deleting user account. Please try again later.");
    }
  }

  // Function to show inventory modal
  function showInventoryModal() {
    // Create the modal element
    var inventoryModal = document.createElement('div');
    inventoryModal.id = 'inventoryModal';
    inventoryModal.style.display = 'none';
    inventoryModal.style.position = 'fixed';
    inventoryModal.style.zIndex = '1';
    inventoryModal.style.left = '0';
    inventoryModal.style.top = '0';
    inventoryModal.style.width = '100%';
    inventoryModal.style.height = '100%';
    inventoryModal.style.overflow = 'auto';
    inventoryModal.style.backgroundColor = 'rgba(0,0,0,0.4)';

    // Create the modal content container
    var modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fefefe';
    modalContent.style.margin = '15% auto';
    modalContent.style.padding = '20px';
    modalContent.style.border = '1px solid #888';
    modalContent.style.width = '80%';

    // Add text to the modal content
    modalContent.innerHTML = '<h1>Inventory</h1><div id="inventoryContent"></div>';

    // Append the modal content to the modal
    inventoryModal.appendChild(modalContent);

    // Append the modal to the document body
    document.body.appendChild(inventoryModal);

    // Function to open the modal
    function openModal() {
      const inventoryContent = document.getElementById('inventoryContent');
      const inventory = JSON.parse(localStorage.getItem('inventory')) || { score: 0, coins: 0, level: 1 };
      inventoryContent.innerHTML = `
        <p>Score: ${inventory.score}</p>
        <p>Coins: ${inventory.coins}</p>
        <p>Level: ${inventory.level}</p>
      `;
      inventoryModal.style.display = 'block';
    }

    // Function to close the modal
    function closeModal() {
      inventoryModal.style.display = 'none';
    }

    // Add a close button inside the modal content
    var closeButton = document.createElement('button');
    closeButton.innerHTML = 'Close';
    closeButton.onclick = closeModal;
    modalContent.appendChild(closeButton);

    // Return the openModal function to attach it to the inventory button
    return openModal;
  }

  // Call the function to set up the inventory modal and get the openModal function
  const openInventoryModal = showInventoryModal();

  // Function to show leaderboard
  async function showLeaderboard(currentUsername) {
    clearContainer();
    container.innerHTML = `<h2>Leaderboard</h2><div id="leaderboardContent"></div><button id="closeLeaderboardButton">Close</button>`;

    try {
      const response = await fetch('http://localhost:5500/leaderboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const leaderboard = await response.json();
        const leaderboardContent = document.getElementById("leaderboardContent");
        leaderboard.forEach((user, index) => {
          leaderboardContent.innerHTML += `<p>${index + 1}. ${user.username}: ${user.highestScore}</p>`;
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to load leaderboard:', errorText);
        alert('Failed to load leaderboard. Please try again.');
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      alert('An error occurred while loading leaderboard. Please try again later.');
    }

    document.getElementById("closeLeaderboardButton").addEventListener("click", () => {
      showInterface(currentUsername);
    });
  }

  // Function to show instructions
  function showInstructions(callback) {
    clearContainer();
    container.innerHTML = `
      <h2>Instructions</h2>
      <p><img src="fire_icon.png" alt="Fire Icon">: Jump</p>
      <p><img src="coin_icon.png" alt="Coin Icon">: Pick Coins</p>
      <p><img src="level_up_icon.png" alt="Level Up Icon">: Level Up</p>
      <button id="startGameBtn">Start Game</button>
    `;

    document.getElementById("startGameBtn").addEventListener("click", function() {
      callback();
    });
  }

  displayWelcomeMessage();
});
