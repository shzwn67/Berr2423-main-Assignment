//Aasignment IS

// Import necessary modules
const express = require('express'); // Import Express framework
const app = express(); // Create an Express application
const port = process.env.PORT || 5500; // Set the port to 5500 or environment variable
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const jwt = require('jsonwebtoken'); // Import JSON Web Token for authentication
const path = require('path'); // Import path module for working with file and directory paths
const cors = require('cors'); // Import CORS for cross-origin resource sharing
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb'); // Import MongoDB client and necessary classes
require('dotenv').config(); // Import dotenv for environment variables

// MongoDB connection URI
const uri = "mongodb+srv://b022210091:Ew%40nx45%23@cluster0.d52rwim.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // MongoDB URI for connection

// MongoDB client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1, // Specify server API version
    strict: true, // Enable strict mode for MongoDB
    deprecationErrors: true, // Enable deprecation errors for MongoDB
  }
});

// Function to connect to MongoDB
async function run() {
  try {
    // Attempt to connect to MongoDB
    await client.connect();
    console.log('Connected successfully to MongoDB'); // Log success message
  } catch (err) {
    // Log connection errors
    console.error('Failed to connect to MongoDB', err);
  }
}

// Execute the connection function
run().catch(console.dir); // Catch and log any errors

// Middleware setup
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON bodies in incoming requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

////
// Function to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization; // Get authorization header from the request
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from header

  if (token == null) return res.sendStatus(401); // If no token, return 401 Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403); // If token is invalid, return 403 Forbidden
    req.tokenData = decoded; // Attach decoded token data to request
    next(); // Proceed to next middleware
  });
}

// Middleware to verify if the user exists in either player or admin collection
async function verifyUser(req, res, next) {
  const { username } = req.body; // Get username from request body

  // Check if user exists in player collection
  let user = await client.db("Database_Assignment").collection("player").findOne({ username });

  // If not found in player collection, check admin collection
  if (!user) {
    user = await client.db("Database_Assignment").collection("admin").findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'Username not found' }); // If user not found in either collection, return 404
    }
  }

  req.user = user; // Attach user to the request object
  next(); // Proceed to next middleware or route handler
}

// Register endpoint
// Register endpoint
app.post('/register', async (req, res) => {
  try {
    // Check if username already exists in player collection
    let existingPlayer = await client.db("Database_Assignment").collection("player").findOne({ username: req.body.username });
    // Check if username already exists in admin collection
    let existingAdmin = await client.db("Database_Assignment").collection("admin").findOne({ username: req.body.username });

    if (existingPlayer || existingAdmin) {
      // If username exists in either collection, return 400 status
      return res.status(400).json({ error: "Username already exists" });
    }

    // Determine role based on password provided and hash password
    const role = req.body.password === process.env.ADMIN_PASSWORD ? 'admin' : 'player';
    const hash = bcrypt.hashSync(req.body.password, 10); // Hash the password with bcrypt

    // Insert new user into the appropriate collection based on role
    let result = await client.db("Database_Assignment").collection(role).insertOne({
      username: req.body.username,
      password: hash,
      name: req.body.name,
      email: req.body.email,
      role: role
    });

    // Respond based on role
    if (role === 'admin') {
      console.log('Admin registration successful:', result); // Log admin registration success
      res.status(201).json({ message: 'Admin registration successful', result }); // Send success response for admin
    } else if (role === 'player') {
      console.log('Player registration successful:', result); // Log player registration success
      res.status(201).json({ message: 'Player registration successful', result }); // Send success response for player
    }
  } catch (err) {
    console.error('Error during registration:', err); // Log any errors during registration
    res.status(500).json({ error: 'Registration failed' }); // Send error response
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  try {
    console.log('Login attempt for username:', req.body.username); // Log login attempt

    // Check if user exists in player collection
    let user = await client.db("Database_Assignment").collection("player").findOne({
      username: req.body.username
    });

    // If not found in player collection, check admin collection
    if (!user) {
      console.log('Username not found in player collection, checking admin collection');

      user = await client.db("Database_Assignment").collection("admin").findOne({
        username: req.body.username
      });

      if (!user) {
        console.log('Username not found in admin collection');
        return res.status(404).json({ error: "Username not found" }); // If user not found in admin collection, return 404
      }
    }

    console.log('User found:', user); // Log user found

    // Check password
    if (bcrypt.compareSync(req.body.password, user.password)) {
      console.log('Password match'); // Log password match
      const role = user.role; // Get user role
      res.json({ message: "Login successful", role }); // Send success response with role
    } else {
      console.log('Password mismatch'); // Log password mismatch
      res.status(401).json({ error: "Wrong password" }); // Send error response for wrong password
    }
  } catch (err) {
    console.error('Error during login:', err); // Log any errors during login
    res.status(500).json({ error: 'Login failed' }); // Send error response
  }
});

// Update user endpoint
app.patch('/updateUser', verifyToken, verifyUser, async (req, res) => {
  try {
    const { currentUsername, updatedInfo } = req.body; // Get current username and updated info from request body

    // Hash new password if provided in the update info
    if (updatedInfo.password) {
      updatedInfo.password = bcrypt.hashSync(updatedInfo.password, 10);
    }

    // Ensure role is not changed during update
    updatedInfo.role = req.user.role;

    console.log(`Updating user: ${currentUsername}`, updatedInfo); // Log user update info

    // Update user information in the database
    const updateResult = await client.db('Database_Assignment').collection(req.user.role).updateOne(
      { username: currentUsername },
      { $set: updatedInfo }
    );

    if (updateResult.modifiedCount === 1) {
      res.json({ message: 'User information updated successfully' }); // Send success response if update is successful
    } else {
      console.error(`Failed to update user information for ${currentUsername}`); // Log failure to update
      res.status(500).json({ error: 'Failed to update user information' }); // Send error response for update failure
    }
  } catch (err) {
    console.error('Error during user update:', err); // Log any errors during user update
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Request delete token endpoint
app.post('/requestDeleteToken', async (req, res) => {
  const { passkey, username } = req.body; // Get passkey and username from request body

  try {
    // Check if the username exists in the player collection
    const playerUser = await client.db("Database_Assignment").collection("player").findOne({ username });

    if (playerUser) {
      return res.status(403).json({ error: "Not authorized" }); // If user is a player, return 403
    }

    // Check if the username exists in the admin collection
    const adminUser = await client.db("Database_Assignment").collection("admin").findOne({ username });

    if (!adminUser) {
      return res.status(404).json({ error: "Admin username not found" }); // If admin not found, return 404
    }

    // Check if the passkey is correct
    if (passkey === process.env.JWT_SECRET) {
      const token = jwt.sign({ role: "admin", username }, process.env.JWT_SECRET, { expiresIn: "1h" }); // Generate JWT token
      console.log("Generated token:", token); // Log the generated token
      res.json({ token }); // Send the token as response
    } else {
      res.status(403).json({ error: "Invalid passkey" }); // Send error response for invalid passkey
    }
  } catch (err) {
    console.error('Error during token request:', err); // Log any errors during token request
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});


// Delete user endpoint
app.delete('/deleteUser/:username', verifyToken, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters

    // Ensure only admin can delete user accounts
    if (req.tokenData.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete user accounts' }); // Return error if not admin
    }

    // Attempt to delete from player collection
    let deleteResult = await client.db('Database_Assignment').collection('player').deleteOne({ username });
    if (deleteResult.deletedCount !== 1) {
      // Attempt to delete from admin collection if not found in player collection
      deleteResult = await client.db('Database_Assignment').collection('admin').deleteOne({ username });
      if (deleteResult.deletedCount !== 1) {
        return res.status(404).json({ error: 'User not found' }); // Return error if user not found in either collection
      }
    }

    res.json({ message: 'User account deleted successfully' }); // Send success response for deletion
  } catch (err) {
    console.error('Error deleting user account:', err); // Log any errors during user deletion
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Function to generate level messages
function generateLevelMessage(level) {
  let message = '';

  if (level === 1) {
    message = 'Welcome to the game! You are at level 1, a beginner!'; // Message for level 1
  } else if (level >= 2 && level <= 5) {
    message = `Congratulations, you are now at level ${level}, still a beginner, keep going!`; // Message for levels 2-5
  } else if (level >= 6 && level <= 10) {
    message = `Great job! You are now at level ${level}, you are advancing, keep it up!`; // Message for levels 6-10
  } else if (level >= 11 && level <= 15) {
    message = `You are now at level ${level}, almost halfway, stay motivated!`; // Message for levels 11-15
  } else if (level >= 16 && level <= 20) {
    message = `Awesome! Level ${level} reached, keep pushing towards higher levels!`; // Message for levels 16-20
  } else if (level >= 21 && level <= 25) {
    message = `Impressive! You are now at level ${level}, the expert zone is close!`; // Message for levels 21-25
  } else if (level >= 26 && level <= 29) {
    message = `Incredible! Level ${level} achieved, you are almost a master!`; // Message for levels 26-29
  } else if (level === 30) {
    message = 'Congratulations, You are now at level 30, the master level! Keep up the great work!'; // Message for level 30
  } else {
    message = `You are now at level ${level}, keep going!`; // Default message for other levels
  }

  return message; // Return the generated message
}

// Function to generate level descriptions
function generateLevelDescription(level) {
  const descriptions = {
    1: "Welcome to pinggu game! Jump over small blue fire and get used to the controls.", // Description for level 1
    2: "Take the powerups to have a great effect.", // Description for level 2
    3: "Keep an eye out for obstacles, collect coins for the benefits.", // Description for level 3
    4: "If you lose, use the coins you've collected to continue the game.", // Description for level 4
    5: "Speed is increasing! Watch out for the obstacles!", // Description for level 5
    6: "You’ve reached the intermediate level! Keep going!", // Description for level 6
    7: "You are doing great! Keep collecting coins and powerups!", // Description for level 7
    8: "You are halfway there! Keep going!", // Description for level 8
    9: "You are doing amazing! Keep going!", // Description for level 9
    10: "You’ve reached the expert level! Keep going!", // Description for level 10
    11: "You are doing great! Keep collecting coins and powerups!", // Description for level 11
    12: "You are halfway there! Keep going!", // Description for level 12
    13: "You are doing amazing! Keep going!", // Description for level 13
    14: "You’ve reached the expert level! Keep going!", // Description for level 14
    15: "You are doing great! Keep collecting coins and powerups!", // Description for level 15
    // Add more descriptions as needed
  };

  return descriptions[level] || "No description available for this level."; // Return description or default message
}

// Create level endpoint
app.post('/createLevel', verifyUser, async (req, res) => {
  try {
    const { username, level } = req.body; // Get username and level from request body
    const levelDescription = generateLevelDescription(level); // Generate level description

    const result = await client.db("Database_Assignment").collection("gamelevels").insertOne({
      username,
      level,
      levelDescription
    });

    const levelMessage = generateLevelMessage(level); // Generate level message

    console.log('Game level created:', result); // Log level creation success
    res.status(201).json({ message: 'Game level created successfully', levelMessage, result }); // Send success response
  } catch (err) {
    console.error('Error creating game level:', err); // Log any errors during level creation
    res.status(500).json({ error: 'Failed to create game level' }); // Send error response
  }
});

// Get level endpoint
app.get('/getLevel/:username', verifyUser, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters
    const level = await client.db("Database_Assignment").collection("gamelevels").findOne({ username }); // Find level by username

    if (!level) {
      return res.status(404).json({ error: 'Game level not found' }); // Return error if level not found
    }
    const levelMessage = generateLevelMessage(level.level); // Generate level message
    const levelDescription = generateLevelDescription(level.level); // Generate level description

    console.log(`Game level fetched for username ${username}:`, level); // Log level fetched
    res.json({ level, levelMessage, levelDescription }); // Send level details as response
  } catch (err) {
    console.error(`Error fetching game level for username ${username}:`, err); // Log any errors during level fetch
    res.status(500).json({ error: 'Failed to fetch game level' }); // Send error response
  }
});

// Update level endpoint
app.patch('/updateLevel/:username', verifyUser, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters
    const { level } = req.body; // Get level from request body

    const levelMessage = generateLevelMessage(level); // Generate level message
    const levelDescription = generateLevelDescription(level); // Generate level description

    const updateResult = await client.db("Database_Assignment").collection("gamelevels").updateOne(
      { username },
      { $set: { level, levelDescription } }
    );

    if (updateResult.modifiedCount === 1) {
      res.json({ message: 'Game level updated successfully', level: { level, levelDescription }, levelMessage }); // Send success response
    } else {
      console.error('Failed to update game level:', updateResult); // Log failure to update
      res.status(500).json({ error: 'Failed to update game level' }); // Send error response
    }
  } catch (err) {
    console.error('Error updating game level:', err); // Log any errors during level update
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Delete level endpoint
app.delete('/deleteLevel/:username', verifyUser, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters

    const deleteResult = await client.db("Database_Assignment").collection("gamelevels").deleteOne({ username }); // Delete level by username

    if (deleteResult.deletedCount === 1) {
      res.json({ message: 'Game level deleted successfully' }); // Send success response
    } else {
      res.status(404).json({ error: 'Game level not found' }); // Send error response if level not found
    }
  } catch (err) {
    console.error('Error deleting game level:', err); // Log any errors during level deletion
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Predefined list of powerups
const powerupList = [
  { name: 'rainbow mushrooms', details: 'Increase player size and unlimited jump' }, // Powerup 1
  { name: 'mini purple mushroom', details: 'Shrink 10 percent in size' }, // Powerup 2
  { name: 'mega purple mushroom', details: 'Grow to a massive size' }, // Powerup 3
  { name: 'super crown', details: 'Can shutdown one fire/obstacle by pressing w' }, // Powerup 4
  { name: 'hot air balloon', details: 'Float in the air for 10 seconds' }, // Powerup 5
];

// Function to randomly select a powerup
function getRandomPowerup() {
  const randomIndex = Math.floor(Math.random() * powerupList.length); // Generate random index
  return powerupList[randomIndex]; // Return random powerup
}

// Create a powerup and randomly apply to a user
app.post('/createPowerup', verifyUser, async (req, res) => {
  try {
    const { username } = req.body; // Get username from request body
    const randomPowerup = getRandomPowerup(); // Get a random powerup

    const result = await client.db("Database_Assignment").collection("powerups").insertOne({
      username,
      powerupName: randomPowerup.name,
      powerupDetails: randomPowerup.details
    });

    console.log('Powerup created:', result); // Log powerup creation success
    res.status(201).json({ message: 'Powerup created successfully', powerup: randomPowerup, result }); // Send success response
  } catch (err) {
    console.error('Error creating powerup:', err); // Log any errors during powerup creation
    res.status(500).json({ error: 'Failed to create powerup' }); // Send error response
  }
});

// Read a powerup
app.get('/getPowerup/:username', verifyUser, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters
    const powerup = await client.db("Database_Assignment").collection("powerups").findOne({ username }); // Find powerup by username

    if (!powerup) {
      return res.status(404).json({ error: 'Powerup not found' }); // Send error response if powerup not found
    }

    console.log(`Powerup fetched for username ${username}:`, powerup); // Log powerup fetched
    res.json({ powerup }); // Send powerup details as response
  } catch (err) {
    console.error(`Error fetching powerup for username ${username}:`, err); // Log any errors during powerup fetch
    res.status(500).json({ error: 'Failed to fetch powerup' }); // Send error response
  }
});

// Update a powerup
app.patch('/updatePowerup/:username', verifyUser, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters
    const randomPowerup = getRandomPowerup(); // Get a random powerup

    const updateResult = await client.db("Database_Assignment").collection("powerups").updateOne(
      { username },
      { $set: { powerupName: randomPowerup.name, powerupDetails: randomPowerup.details } }
    );

    if (updateResult.modifiedCount === 1) {
      res.json({ message: 'Powerup updated successfully', powerup: { powerupName: randomPowerup.name, powerupDetails: randomPowerup.details } }); // Send success response
    } else {
      console.error('Failed to update powerup:', updateResult); // Log failure to update
      res.status(500).json({ error: 'Failed to update powerup' }); // Send error response
    }
  } catch (err) {
    console.error('Error updating powerup:', err); // Log any errors during powerup update
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Delete a powerup
app.delete('/deletePowerup/:username', verifyUser, async (req, res) => {
  try {
    const username = req.params.username; // Get username from request parameters

    const deleteResult = await client.db("Database_Assignment").collection("powerups").deleteOne({ username }); // Delete powerup by username

    if (deleteResult.deletedCount === 1) {
      res.json({ message: 'Powerup deleted successfully' }); // Send success response
    } else {
      res.status(404).json({ error: 'Powerup not found' }); // Send error response if powerup not found
    }
  } catch (err) {
    console.error('Error deleting powerup:', err); // Log any errors during powerup deletion
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Create inventory endpoint
app.post('/inventory', verifyUser, async (req, res) => {
  try {
    const coin = Math.floor(Math.random() * 100); // Generate random number of coins between 0 and 99

    const result = await client.db("Database_Assignment").collection("inventory").insertOne({
      username: req.body.username,
      coin: coin,
      transactionCount: 0
    });

    res.status(201).json({ message: 'Inventory item created successfully', data: result }); // Send success response
  } catch (err) {
    console.error('Error creating inventory item:', err); // Log any errors during inventory creation
    res.status (500).json({ error: 'Failed to create inventory item' }); // Send error response
  }
});

// Get inventory items endpoint
app.get('/inventory/:username', verifyUser, async (req, res) => {
  try {
    const { username } = req.params; // Get username from request parameters
    console.log(`Fetching inventory items for username: ${username}`); // Log fetch request
    const items = await client.db("Database_Assignment").collection("inventory").find({ username }).toArray(); // Find inventory items by username
    console.log(`Found items: ${JSON.stringify(items)}`); // Log found items
    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory items not found for this username' }); // Send error response if no items found
    }
    res.json({ message: 'Inventory items fetched successfully', data: items }); // Send success response with items
  } catch (err) {
    console.error('Error fetching inventory items:', err); // Log any errors during inventory fetch
    res.status(500).json({ error: 'Failed to fetch inventory items' }); // Send error response
  }
});

// Update inventory endpoint
app.patch('/inventory', verifyUser, async (req, res) => {
  try {
    const { username, level } = req.body; // Get username and level from request body

    const coin = Math.floor(Math.random() * 100) * level; // Update coin based on level

    const result = await client.db("Database_Assignment").collection("inventory").updateOne(
      { username },
      { $set: { coin: coin, level: level } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Inventory item not found' }); // Send error response if item not found
    }

    res.json({ message: 'Inventory item updated successfully', data: result }); // Send success response
  } catch (err) {
    console.error('Error updating inventory item:', err); // Log any errors during inventory update
    res.status(500).json({ error: 'Failed to update inventory item' }); // Send error response
  }
});

// Delete inventory endpoint
app.delete('/inventory/:username', verifyUser, async (req, res) => {
  try {
    const { username } = req.params; // Extract username from request parameters
    const result = await client.db("Database_Assignment").collection("inventory").deleteMany({ username: username }); // Delete items by username

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Inventory item not found' }); // Send error response if item not found
    }

    res.json({ message: 'Inventory items deleted successfully', data: result }); // Send success response
  } catch (err) {
    console.error('Error deleting inventory items:', err); // Log any errors during inventory deletion
    res.status(500).json({ error: 'Failed to delete inventory items' }); // Send error response
  }
});

// Buy coin endpoint
app.post('/buyCoin', async (req, res) => {
  const { passkey } = req.body; // Get passkey from request body

  if (passkey === process.env.PASSKEY) {
    const token = jwt.sign({ role: "buyCoin" }, process.env.PASSKEY, { expiresIn: "1h" }); // Generate JWT token
    console.log("Generated token:", token); // Log the generated token
    res.json({ token }); // Send the token as response
  } else {
    res.status(403).json({ error: "Invalid passkey" }); // Send error response for invalid passkey
  }
});

// Continue with coins endpoint
app.post('/continueWithCoins', verifyUser, async (req, res) => {
  try {
    const { username } = req.body; // Get username from request body

    const inventory = await client.db("Database_Assignment").collection("inventory").findOne({ username }); // Find inventory by username

    if (!inventory || inventory.coin < 3) {
      return res.status(400).json({ error: "Not enough coins" }); // Send error response if not enough coins
    }

    const updatedResult = await client.db("Database_Assignment").collection("inventory").updateOne(
      { username },
      { $inc: { coin: -3, transactionCount: 1 } } // Decrease coins by 3 and increase transaction count
    );

    if (updatedResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Inventory item not found' }); // Send error response if item not found
    }

    res.json({
      message: "Coin transaction successful.",
    });
  } catch (err) {
    console.error('Error during continueWithCoins:', err); // Log any errors during coin transaction
    res.status(500).json({ error: 'Internal server error' }); // Send error response
  }
});

// Create score endpoint
app.post('/scores', verifyUser, async (req, res) => {
  try {
    const score = Math.floor(Math.random() * 50); // Generate random score between 0 and 50
    const result = await client.db('Database_Assignment').collection('scores').insertOne({
      username: req.body.username,
      score: score
    });
    res.status(201).json({ message: 'Score created successfully', score }); // Send success response
  } catch (err) {
    console.error('Error creating score:', err); // Log any errors during score creation
    res.status(500).json({ error: 'Failed to create score' }); // Send error response
  }
});

// Get score by username endpoint
app.get('/scores/:username', verifyUser, async (req, res) => {
  try {
    const score = await client.db('Database_Assignment').collection('scores').findOne({ username: req.params.username }); // Find score by username
    if (!score) {
      return res.status(404).json({ error: 'Score not found' }); // Send error response if score not found
    } else {
      res.json(score); // Send score as response
    }
  } catch (err) {
    console.error('Error reading score:', err); // Log any errors during score fetch
    res.status(500).json({ error: 'Failed to read score' }); // Send error response
  }
});

// Update score by username endpoint
app.patch('/scores/:username', verifyUser, async (req, res) => {
  try {
    const { level } = req.body; // Get level from request body

    const currentScore = await client.db('Database_Assignment').collection('scores').findOne({ username: req.params.username }); // Find current score by username

    if (!currentScore) {
      return res.status(404).json({ error: 'Score not found' }); // Send error response if score not found
    }

    const newScore = currentScore.score + (Math.floor(Math.random() * 100) * level); // Increment score based on level

    const updateData = { score: newScore, level: level };
    const result = await client.db('Database_Assignment').collection('scores').updateOne(
      { username: req.params.username },
      { $set: updateData }
    );

    if (result.modifiedCount === 1) {
      res.json({ message: 'Score updated successfully', newScore }); // Send success response
    } else {
      res.status(404).json({ error: 'Score not found' }); // Send error response if score not found
    }
  } catch (err) {
    console.error('Error updating score:', err); // Log any errors during score update
    res.status(500).json({ error: 'Failed to update score' }); // Send error response
  }
});

// Get high score endpoint
app.get('/highscore', async (req, res) => {
  try {
    // Fetch the highest score from the scores collection
    const highScore = await client.db('Database_Assignment').collection('scores').findOne({}, { sort: { score: -1 } });

    // If there is no score yet, handle this case
    if (!highScore) {
      console.log('No scores available');
      return res.status(404).json({ error: 'No scores available' });
    }

    console.log(`Highest score found: ${highScore.username} with score ${highScore.score}`);

    // Fetch the current high score from the highscore collection
    const currentHighScore = await client.db('Database_Assignment').collection('highscore').findOne({});
    console.log(`Current highscore in collection: ${JSON.stringify(currentHighScore)}`);

    // If no high score exists in the highscore collection or the new high score is greater, update the highscore collection
    if (!currentHighScore || highScore.score > currentHighScore.score) {
      if (currentHighScore) {
        await client.db('Database_Assignment').collection('highscore').deleteOne({ _id: currentHighScore._id });
        console.log(`Previous highscore deleted: ${currentHighScore.username} with score ${currentHighScore.score}`);
      }

      const insertResult = await client.db('Database_Assignment').collection('highscore').insertOne({
        username: highScore.username,
        score: highScore.score
      });
      console.log(`New highscore inserted: ${highScore.username} with score ${highScore.score}`);
      console.log(`Insert result: ${JSON.stringify(insertResult)}`);
    }

    // Fetch the updated high score from the highscore collection
    const updatedHighScore = await client.db('Database_Assignment').collection('highscore').findOne({});
    console.log(`Updated highscore in collection: ${JSON.stringify(updatedHighScore)}`);

    // Return the high score information
    res.json({ highScore: updatedHighScore.score, username: updatedHighScore.username });
  } catch (err) {
    console.error('Error fetching high score:', err);
    res.status(500).send('Failed to fetch high score');
  }
});

// Delete score by username endpoint
app.delete('/scores/:username', verifyUser, async (req, res) => {
  try {
    const { username } = req.params; // Get username from request parameters
    const result = await client.db('Database_Assignment').collection('scores').deleteOne({ username });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Score not found' }); // Send error response if score not found
    }

    res.json({ message: 'Score deleted successfully', data: result }); // Send success response
  } catch (err) {
    console.error('Error deleting score:', err); // Log any errors during score deletion
    res.status(500).json({ error: 'Failed to delete score' }); // Send error response
  }
});

// Serve the main HTML page
//app.get('/', (req, res) => {
 // res.sendFile(path.join(__dirname, 'public', 'assignment.html')); // Serve HTML file
//});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// Start the Express server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`); // Log server start
});
