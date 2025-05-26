// app.js - This script now initializes its own Supabase client instance.
// It expects config.js to have already run and set window.SUPABASE_URL and window.SUPABASE_ANON_KEY.

// Initialize window.supabaseClient for this page's context
try {
    // Configuration Checks
    if (!window.SUPABASE_URL || window.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error("Supabase URL is missing or invalid. Ensure config.js is loaded and correctly configured before app.js.");
    }
    if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error("Supabase anon key is missing or invalid. Ensure config.js is loaded and correctly configured before app.js.");
    }
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        throw new Error("Supabase client library (supabase-js) not found. Ensure CDN link is in HTML and loaded before app.js.");
    }

    // Initialize Supabase client and assign to window.supabaseClient
    const { createClient } = supabase; // Destructure from the global supabase object (from CDN)
    window.supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    if (!window.supabaseClient) {
        throw new Error("Failed to create Supabase client instance in app.js. Check URL and Key.");
    }
    console.log('app.js: Supabase client initialized successfully and assigned to window.supabaseClient.');

} catch (error) {
    console.error('CRITICAL: Supabase initialization error in app.js:', error.message);
    // Displaying error on UI might be tricky if DOM isn't ready or specific elements don't exist on all pages using app.js
    // For now, a prominent console error is key.
    // Optionally, you could try a generic alert for critical failure:
    // alert('Critical error initializing application services in app.js: ' + error.message + ' Please check console and configuration.');
}


// Ensure that window.supabaseClient is available before proceeding with function definitions that use it.
// This check is somewhat redundant if the above try/catch block is comprehensive,
// but serves as a clear marker.
if (typeof window.supabaseClient === 'undefined') {
    console.error('CRITICAL: window.supabaseClient is still not defined in app.js after initialization attempt. Halting further script execution for safety.');
    // Throwing an error here would stop the script, which might be desired
    // throw new Error("Supabase client failed to initialize in app.js.");
} else {
    console.log('app.js: Confirmed window.supabaseClient is defined before defining functions.');
}

// The rest of the original app.js code should follow here.
// All functions will now use window.supabaseClient.

// --- Authentication ---
// This function now primarily checks auth and redirects if needed.
// It returns true if authenticated, false otherwise.
async function checkUserLoggedIn() {
    if (typeof window.supabaseClient === 'undefined') { // Extra safety check
        console.error('checkUserLoggedIn: window.supabaseClient is not defined.');
        window.location.href = 'login.html'; // Redirect if client is missing
        return false;
    }
    const { data: { user }, error: getUserError } = await window.supabaseClient.auth.getUser();
    if (getUserError || !user) {
        const path = window.location.pathname;
        if (!path.endsWith('login.html')) { // Only redirect if not already on login page
            console.log('User not logged in or error. Redirecting to login.html from:', path);
            window.location.href = 'login.html';
        }
        return false;
    }
    return true;
}

async function handleLogout() {
    if (typeof window.supabaseClient === 'undefined') {
        console.error('handleLogout: window.supabaseClient is not defined.');
        window.location.href = 'login.html'; // Redirect if client is missing
        return;
    }
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
        }
    } catch (err) {
        console.error('Exception during logout:', err);
    } finally {
        window.location.href = 'login.html';
    }
}

// --- Add Recipe Logic ---
async function handleAddRecipeFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formMessage = document.getElementById('form-message');

    if (typeof window.supabaseClient === 'undefined') {
        console.error('handleAddRecipeFormSubmit: window.supabaseClient is not defined.');
        if(formMessage) {
            formMessage.textContent = 'Error: Authentication service unavailable.';
            formMessage.style.color = 'red';
        }
        return;
    }

    if (!formMessage) {
        console.error('Form message element (#form-message) not found on the page.');
        return;
    }
    formMessage.textContent = ''; // Clear previous messages
    formMessage.style.color = 'black'; // Reset color as per example

    const recipeName = document.getElementById('recipe-name').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();
    const instructions = document.getElementById('recipe-instructions').value.trim();

    if (!recipeName || !ingredients || !instructions) {
        formMessage.textContent = 'All fields are required.';
        formMessage.style.color = 'red';
        return;
    }

    try {
        const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();

        if (authError || !user) {
            console.error('Authentication error or user not found:', authError);
            formMessage.textContent = 'You must be logged in to add a recipe. Redirecting to login...';
            formMessage.style.color = 'red';
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            return;
        }

        const newRecipe = {
            user_id: user.id,
            name: recipeName,
            ingredients: ingredients,
            instructions: instructions
        };

        console.log('Attempting to insert new recipe:', newRecipe);

        const { data, error: insertError } = await window.supabaseClient
            .from('recipes')
            .insert([newRecipe])
            .select(); // .select() is good practice to confirm insert and get data

        if (insertError) {
            console.error('Error adding recipe to Supabase:', insertError);
            formMessage.textContent = 'Error adding recipe: ' + insertError.message;
            formMessage.style.color = 'red';
            return; // Stop further execution
        } else {
            console.log('Recipe added successfully to Supabase:', data);
            formMessage.textContent = 'Recipe added successfully! Redirecting...';
            formMessage.style.color = 'green';
            form.reset(); // Clear the form fields

            // Redirect after a short delay to allow user to see the message
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    } catch (err) {
        console.error('Error in add recipe process:', err);
        formMessage.textContent = 'An unexpected error occurred: ' + err.message;
        formMessage.style.color = 'red';
    }
}

// --- Recipe Fetching ---
async function fetchRecipes(filterLetter = null) {
    if (typeof window.supabaseClient === 'undefined') {
        console.error('fetchRecipes: window.supabaseClient is not defined.');
        return [];
    }
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        console.error('User not logged in, cannot fetch recipes.');
        return [];
    }

    try {
        let query = window.supabaseClient
            .from('recipes')
            .select('id, name, ingredients, instructions')
            .eq('user_id', user.id);

        if (filterLetter) {
            query = query.ilike('name', `${filterLetter}%`);
        }

        query = query.order('name', { ascending: true });


        const { data: recipes, error } = await query;

        if (error) {
            console.error('Error fetching recipes:', error);
            return [];
        }
        return recipes || [];
    } catch (err) {
        console.error('Exception fetching recipes:', err);
        return [];
    }
}

// --- Recipe Display ---
// Note: recipeListContainer and sidebar are fetched inside DOMContentLoaded
function displayRecipes(recipes, recipeListContainerElement, sidebarElement) {
    if (!recipeListContainerElement) {
        console.error("Recipe list container not provided to displayRecipes");
        return;
    }
    recipeListContainerElement.innerHTML = ''; // Clear existing recipes

    if (!recipes || recipes.length === 0) {
        const noRecipesMessage = document.createElement('p');
        noRecipesMessage.textContent = 'No recipes found.';
        if (sidebarElement && sidebarElement.querySelector('.filter-btn.active')) {
            noRecipesMessage.textContent += ` Starting with '${sidebarElement.querySelector('.filter-btn.active').dataset.letter}'. Try another letter or clear filter.`;
        }
        recipeListContainerElement.appendChild(noRecipesMessage);
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'recipe-list';
    recipes.forEach(recipe => {
        const li = document.createElement('li');
        li.className = 'recipe-item';
        li.textContent = recipe.name;
        // Optional: Add click to show details
        li.addEventListener('click', () => {
            alert(`Recipe: ${recipe.name}\n\nIngredients: ${recipe.ingredients}\n\nInstructions: ${recipe.instructions}`);
        });
        ul.appendChild(li);
    });
    recipeListContainerElement.appendChild(ul);
}

// --- Filter Buttons ---
// Note: sidebar is fetched inside DOMContentLoaded
function generateFilterButtons(sidebarElement) {
    if (!sidebarElement) {
        console.error("Sidebar element not provided to generateFilterButtons");
        return;
    }

    const existingHeader = sidebarElement.querySelector('h2');
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i); // A-Z
        const button = document.createElement('button');
        button.textContent = letter;
        button.classList.add('filter-btn');
        button.dataset.letter = letter;
        fragment.appendChild(button);
    }
    // Clear previous buttons if any, except the header
    while (sidebarElement.childNodes.length > (existingHeader ? 1 : 0)) {
        if (sidebarElement.lastChild !== existingHeader) {
            sidebarElement.removeChild(sidebarElement.lastChild);
        } else {
            break;
        }
    }
    if (existingHeader) {
        sidebarElement.appendChild(fragment);
    } else {
        // If no h2, just append
        const h2 = document.createElement('h2');
        h2.textContent = "Filter by Letter";
        sidebarElement.insertBefore(h2, sidebarElement.firstChild);
        sidebarElement.appendChild(fragment);
    }
}


async function handleFilterClick(event, recipeListContainerElement, sidebarElement) {
    if (event.target.classList.contains('filter-btn')) {
        const letter = event.target.dataset.letter;

        // Toggle active class
        if (sidebarElement) {
            sidebarElement.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        }
        event.target.classList.add('active');

        const recipes = await fetchRecipes(letter);
        displayRecipes(recipes, recipeListContainerElement, sidebarElement);
    }
}

// --- Initial Load & Event Listeners ---
async function loadInitialRecipes(recipeListContainerElement, sidebarElement) {
    const recipes = await fetchRecipes(); // Load all initially
    displayRecipes(recipes, recipeListContainerElement, sidebarElement);
}

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Check user login status. This function handles redirection if not logged in.
    const isAuthenticated = await checkUserLoggedIn();

    if (!isAuthenticated && !window.location.pathname.endsWith('login.html')) {
        console.log("User not authenticated and not on login page. Halting further page-specific script execution.");
        return;
    }

    // Common elements: Logout button
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Page-specific logic:
    const currentPagePath = window.location.pathname;
    const recipeListContainer = document.getElementById('recipe-list-container'); // Fetch here for use in this scope
    const sidebar = document.getElementById('sidebar'); // Fetch here for use in this scope

    // Logic for index.html (main recipe list page)
    if (currentPagePath.includes('index.html') || currentPagePath === '/' || currentPagePath.endsWith('/website_lokaal/') || currentPagePath.endsWith('/website_lokaal/index.html')) {
        if (recipeListContainer && sidebar) {
            if (isAuthenticated) {
                generateFilterButtons(sidebar);
                await loadInitialRecipes(recipeListContainer, sidebar);
                sidebar.addEventListener('click', (event) => handleFilterClick(event, recipeListContainer, sidebar));
            } else {
                if (recipeListContainer) recipeListContainer.innerHTML = '<p>Please <a href="login.html">log in</a> to view recipes.</p>';
            }
        }
    }

    // Logic for add-recipe.html
    if (currentPagePath.includes('add-recipe.html')) {
        const addRecipeForm = document.getElementById('add-recipe-form');
        const formMessageDiv = document.getElementById('form-message');

        if (addRecipeForm && formMessageDiv) {
            if (isAuthenticated) {
                addRecipeForm.addEventListener('submit', handleAddRecipeFormSubmit);
            } else {
                formMessageDiv.textContent = "You need to be logged in to add a recipe. Redirecting to login...";
                formMessageDiv.style.color = "red";
                setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            }
        } else {
            if (!addRecipeForm) console.error("Element with ID 'add-recipe-form' not found on add-recipe.html.");
            if (!formMessageDiv) console.error("Element with ID 'form-message' not found on add-recipe.html.");
        }
    }
    // Login page (login.html) specific logic is primarily handled by auth.js.
});