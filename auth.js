// Supabase authentication logic
let supabaseClient; // Declare supabaseClient outside the try block

try {
    // Check for Supabase URL
    if (!window.SUPABASE_URL || window.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error("Supabase URL is missing or invalid in config.js.");
    }
    // Check for Supabase Anon Key
    if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error("Supabase anon key is missing or invalid in config.js.");
    }
    // Check for Supabase library
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        throw new Error("Supabase client library not found. Ensure CDN is loaded.");
    }

    // Initialize Supabase client
    const { createClient } = supabase;
    supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    if (!supabaseClient) {
        throw new Error("Failed to create Supabase client instance.");
    }

    // Proceed with login form logic only if supabaseClient is initialized
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message'); // Keep this for login errors too

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            if (errorMessageDiv) {
                errorMessageDiv.textContent = ''; // Clear previous error messages
                errorMessageDiv.style.display = 'none'; // Hide error div initially
            }

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (!emailInput || !passwordInput) {
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = 'Email or password field not found.';
                    errorMessageDiv.style.display = 'block';
                }
                console.error('Email or password input field not found in the form.');
                return;
            }

            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    if (errorMessageDiv) {
                        errorMessageDiv.textContent = `Login failed: ${error.message}`;
                        errorMessageDiv.style.display = 'block';
                    }
                    console.error('Login error:', error);
                } else {
                    // Login successful
                    console.log('Login successful, user:', data.user);
                    window.location.href = 'index.html'; // Redirect to index.html
                }
            } catch (error) {
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = `An unexpected error occurred during login: ${error.message}`;
                    errorMessageDiv.style.display = 'block';
                }
                console.error('Unexpected error during login:', error);
            }
        });
    } else {
        // This script might be on a page without a login form, or form isn't rendered.
        // console.log('Login form not found on this page. Supabase client initialized if no errors prior.');
    }

} catch (error) {
    console.error('Supabase initialization error in auth.js:', error.message);
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = error.message || "Authentication setup error. Check console.";
        errorDiv.style.display = 'block';
    }
}