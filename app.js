// Main application logic, recipe display, filtering
let supabaseClient;

try {
    // Robust Supabase client initialization
    if (!window.SUPABASE_URL || window.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error("Supabase URL is missing or invalid in config.js.");
    }
    if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error("Supabase anon key is missing or invalid in config.js.");
    }
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        throw new Error("Supabase client library not found. Ensure CDN is loaded.");
    }

    const { createClient } = supabase;
    supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    if (!supabaseClient) {
        throw new Error("Failed to create Supabase client instance.");
    }

    // If Supabase client is initialized, proceed with app logic
    // DOM elements like sidebar, recipeListContainer, logoutButton will be fetched
    // locally within DOMContentLoaded or other relevant functions to ensure they exist on the current page.

    // --- Authentication ---
    // This function now primarily checks auth and redirects if needed.
    // It returns true if authenticated, false otherwise.
    async function checkUserLoggedIn() {
        const { data: { user }, error: getUserError } = await supabaseClient.auth.getUser();
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
        try {
            const { error } = await supabaseClient.auth.signOut();
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

        if (!formMessage) {
            console.error('Form message element (#form-message) not found on the page.');
            return;
        }
        formMessage.textContent = ''; // Clear previous messages
        formMessage.style.color = 'inherit'; // Reset color

        const recipeName = form.recipeName.value.trim();
        const ingredients = form.recipeIngredients.value.trim();
        const instructions = form.recipeInstructions.value.trim();

        if (!recipeName || !ingredients || !instructions) {
            formMessage.textContent = 'All fields are required.';
            formMessage.style.color = 'red';
            return;
        }

        try {
            const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

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

            const { data, error: insertError } = await supabaseClient
                .from('recipes')
                .insert([newRecipe])
                .select(); // .select() is good practice to confirm insert and get data

            if (insertError) {
                console.error('Error saving recipe:', insertError);
                formMessage.textContent = `Error saving recipe: ${insertError.message}`;
                formMessage.style.color = 'red';
            } else {
                formMessage.textContent = 'Recipe saved successfully!';
                formMessage.style.color = 'green';
                form.reset(); // Clear the form fields

                // Optional: Redirect to index page after a short delay
                // setTimeout(() => {
                //     window.location.href = 'index.html';
                // }, 2000);
            }
        } catch (err) {
            console.error('Exception during recipe save:', err);
            formMessage.textContent = 'An unexpected error occurred while saving. Please try again.';
            formMessage.style.color = 'red';
        }
    }

    // --- Recipe Fetching ---
    async function fetchRecipes(filterLetter = null) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            console.error('User not logged in, cannot fetch recipes.');
            return [];
        }

        try {
            let query = supabaseClient
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

} catch (error) {
    console.error('Supabase initialization error in app.js:', error.message);
    // Optionally, display a generic error on the page or redirect
    const currentPage = window.location.pathname;
    if (currentPage.includes('index.html') || currentPage.includes('add-recipe.html') || currentPage === '/' || currentPage.endsWith('/website_lokaal/')) {
        // alert("Critical application error: " + error.message + ". Please ensure Supabase URL and Key are correctly configured in config.js. Redirecting to login page.");
        // For a less intrusive UX, we can show a message in a div if one exists, or just rely on console.
        // For now, as per instructions, an alert and redirect is an option.
        // Let's use a console log and potentially an alert for now.
        // A more robust solution would be to have a dedicated error display area on these pages.
        const body = document.querySelector('body');
        if (body) {
            let errorDisplay = document.getElementById('app-critical-error');
            if (!errorDisplay) {
                errorDisplay = document.createElement('div');
                errorDisplay.id = 'app-critical-error';
                errorDisplay.style.color = 'red';
                errorDisplay.style.backgroundColor = 'lightpink';
                errorDisplay.style.border = '1px solid red';
                errorDisplay.style.padding = '10px';
                errorDisplay.style.margin = '10px';
                errorDisplay.style.textAlign = 'center';
                errorDisplay.style.position = 'fixed';
                errorDisplay.style.top = '0';
                errorDisplay.style.left = '0';
                errorDisplay.style.width = '100%';
                errorDisplay.style.zIndex = '9999';
                if (body.firstChild) {
                    body.insertBefore(errorDisplay, body.firstChild);
                } else {
                    body.appendChild(errorDisplay);
                }
            }
            errorDisplay.textContent = "Critical application error: " + error.message + ". Check console for details. The application may not function correctly.";
        }
        // Redirecting immediately might be too abrupt if the user wants to see the console.
        // Consider if redirection is always the best approach or if a visible error message is better.
        // For now, let's not auto-redirect from app.js to avoid potential loops if login.html also has issues.
        // The checkUserLoggedIn function already handles redirection if auth fails post-initialization.
        // This catch block is for *initialization* failure.
    }
}