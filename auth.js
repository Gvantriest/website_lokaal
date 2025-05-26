console.log('[DEBUG] auth.js script started execution.');
// Supabase authentication logic
// Declare supabaseClient on the window object to make it globally accessible
window.supabaseClient = null; 

try {
    console.log('[DEBUG] auth.js: Entering main try block.');
    // Check for Supabase URL
    if (!window.SUPABASE_URL || window.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error("Supabase URL is missing or invalid in config.js.");
    }
    console.log('[DEBUG] auth.js: SUPABASE_URL check passed.');
    // Check for Supabase Anon Key
    if (!window.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error("Supabase anon key is missing or invalid in config.js.");
    }
    console.log('[DEBUG] auth.js: SUPABASE_ANON_KEY check passed.');
    // Check for Supabase library
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
        throw new Error("Supabase client library not found. Ensure CDN is loaded.");
    }
    console.log('[DEBUG] auth.js: Supabase library check passed.');

    // Initialize Supabase client
    const { createClient } = supabase;
    window.supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    console.log('[DEBUG] auth.js: supabase.createClient called.');

    if (!window.supabaseClient) {
        throw new Error("Failed to create Supabase client instance.");
    }
    console.log('[DEBUG] auth.js: Supabase client instance created successfully.');

    const errorMessageDiv = document.getElementById('error-message'); // Keep this for login errors too
    
    // Logic for manual login button
    const manualLoginButton = document.getElementById('login-button-manual');
    console.log('[DEBUG] auth.js: Attempted to get login-button-manual. Result:', manualLoginButton);

    if (manualLoginButton) {
        console.log('[DEBUG] auth.js: Manual login button found. Adding click event listener.');
        manualLoginButton.addEventListener('click', async () => {
            console.log('[DEBUG] auth.js: Manual login button CLICKED.');

            const supabaseClient = window.supabaseClient; // Use the global client

            if (!supabaseClient) { 
                console.error('[DEBUG] auth.js: Manual login click: supabaseClient is not available.');
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = 'Critical error: Authentication service not available. Please refresh.';
                    errorMessageDiv.style.display = 'block';
                }
                return;
            }
            console.log('[DEBUG] auth.js: Manual login click: supabaseClient is available.');

            if (errorMessageDiv) {
                errorMessageDiv.textContent = ''; 
                errorMessageDiv.style.display = 'none'; 
            }

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (!emailInput || !passwordInput) {
                console.error('[DEBUG] auth.js: Email or password input field not found (for manual click).');
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = 'Email or password field not found.';
                    errorMessageDiv.style.display = 'block';
                }
                return;
            }
            console.log('[DEBUG] auth.js: Email and password fields found (for manual click).');

            const email = emailInput.value;
            const password = passwordInput.value;
            console.log('[DEBUG] auth.js: Email (manual click):', email, 'Password length:', password.length);

            try {
                console.log('[DEBUG] auth.js: Attempting signInWithPassword (manual click) for email:', email);
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    console.error('[DEBUG] auth.js: signInWithPassword (manual click) returned an error:', error);
                    if (errorMessageDiv) {
                        errorMessageDiv.textContent = `Login failed: ${error.message}`;
                        errorMessageDiv.style.display = 'block';
                    }
                } else {
                    console.log('[DEBUG] auth.js: signInWithPassword (manual click) successful. User data:', data.user);
                    console.log('[DEBUG] auth.js: Redirecting to index.html (manual click)');
                    window.location.href = 'index.html'; 
                }
            } catch (error) {
                console.error('[DEBUG] auth.js: Exception caught during signInWithPassword (manual click) process:', error);
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = `An unexpected error occurred during login: ${error.message}`;
                    errorMessageDiv.style.display = 'block';
                }
            }
        });
    } else {
        console.log('[DEBUG] auth.js: Manual login button NOT found on this page.');
    }

} catch (error) {
    console.error('[DEBUG] auth.js: Exception caught during Supabase client initialization or button setup:', error);
    console.error('Supabase initialization error in auth.js:', error.message); // Keep original error log
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = error.message || "Authentication setup error. Check console.";
        errorDiv.style.display = 'block';
    }
}