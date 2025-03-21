const express = require ('express');
const fetch = require('node-fetch');
const path = require('path');
const pool = require('../model/db');
const cors = require('cors');

const app = express();
app.listen(3000, () => console.log('listening at 3000'));
//app.use(express.static(path.join(__dirname, '../../frontend')));
app.use(express.json());

// Temporarily set adminPage.html as the default page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/signup.html'));
});

app.use(cors());


//FOR FETCHING RECIPE MATCHES ACCORDING TO INPUTTED INGREDIENTS, CUISINES, AND DIETARY RESTRICTIONS
app.post('/api', async (request, response) => {
    //showing that the request has been recieved from the server end; the request has the list of ingredients in a json array! 
    //This will be requested when the 'submit' button is hit on the recipe search page. I used an event listener for this!
    console.log('I got a request!');
    console.log(request.body);
    
    const ingred = request.body.ingredients;
    console.log(ingred);

    const cuis = request.body.cuisine;
    console.log(cuis);

    const d = request.body.diet;
    console.log(d);

    const api_key = "2fad0aa51e7a4e4398d7dc8fcd94dc66";

    //now let's work on the response to send back! This is the part where we use the request data to search for recipes in the spoonacular API :)

    //so this line of code takes the recieved ingredients in the request, the api key, and the api URL to get the recipes using the fetch function
    const api_url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${api_key}&query=${ingred}&cuisine=${cuis}&diet=${d}`;
    const fetch_response = await fetch(api_url);

    //the fetched recipes have been stored in the variable fetch_response, and we now need to turn it into json data
    const json = await fetch_response.json();
    //console.log(json.results);

    //now that it is all converted, send the response back to the client that requested this data!
    response.json(json);
});



//FOR LOADING THE RECIPE DATA SELECTED IN MAIN RECIPE SEARCH PAGE
app.post('/viewRecipe', async (request, response) => {
    console.log("A recipe has been chosen!");
    console.log(request.body);

    const recipe_id = request.body.id;
    console.log(recipe_id);

    const api = "2fad0aa51e7a4e4398d7dc8fcd94dc66"; 
    const api_url = `https://api.spoonacular.com/recipes/${recipe_id}/information?apiKey=${api}`;
    const fetch_response = await fetch(api_url);

    const json = await fetch_response.json();
    console.log(json);

    response.json(json);
});


//FOR ADMIN LOGIN
app.post('/adminLogin', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(username);  
    console.log(password);

    try
    {
        //connect to the database
        const conn = await pool.getConnection();
        console.log("Conected to mariaDB...");
        //make query and put in the username and password sent in from the frontend
        const query = "SELECT * FROM Admins WHERE username = ? AND password = ?";
        const rows = await conn.query(query, [username, password]);
        console.log("Here are the rows: ", rows.length);
        conn.release();
        
        if (rows.length > 0)
        {
            res.json({success: true, message: "Login successful"});
            console.log("Credentials Valid!! :)", res.message)
        }
        else
        {
            res.json({success: false, message: "Invalid credentials"});
            console.log("Invalid credentials", res.message)
        }
    }

    catch (err)
    {
        console.error(err);
        res.status(500).json({ success: false, message: "Database query failed" });
    }
        
});

//For signup
app.post('/signup', async (req, res) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const cpassword = req.body.cpassword;

    // Validate email format (RFC 5322)
    const emailRegex = /^(?:[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,})|\[(?:(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)|IPv6:(?:[a-fA-F0-9:]+))\])$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    try {
        // Check if the email already exists in the database
        const conn = await pool.getConnection();

        const query = "SELECT * FROM Users WHERE email = ?";
        const existingUser = await conn.query(query, [email]);
        conn.release();

        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        // Save the user in the database (no hashing, no file upload)
        const insertQuery = "INSERT INTO Users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)";
        const conn2 = await pool.getConnection();
        const result = await conn.query(insertQuery, [firstName, lastName, email, password]);
        conn.release();

        // Respond with success
        res.json({ success: true, message: 'Signup successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'An error occurred. Please try again' });
    }
});