document.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile();
});

async function fetchUserProfile() {
    try {
        // Replace with your actual PHP endpoint
        const response = await fetch('./server/user_details.php');
        const data = await response.json();

        if (data) {
            // const user = data.user;

            // Update UI Elements
            document.getElementById('display-name').textContent = data.username;
            document.getElementById('display-wallet').textContent = data.wallet;
            document.getElementById('big-avatar').textContent = data.username.charAt(0).toUpperCase();
            
            // Fill Form Inputs
            document.getElementById('input-username').value = data.username;
            document.getElementById('input-email').value = data.email;

            // let no_of_days = Math.floor((new Date() - new Date(data.created_at)) / (1000 * 60 * 60 * 24));
           
            


            function getDaysActive(dateStr) {
                if (!dateStr) return "N/A";

                const joined = new Date(dateStr);
                const now = new Date();
                
                // Difference in milliseconds
                const diff = now - joined;
                
                // Convert to days
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                
                if (days === 0) return "Joined today";
                if (days === 1) return "1 day active";
                return `${days} days active`;
            }
        // console.log("User created at:", data.date_created);

             document.getElementById('acc-age').textContent = `${getDaysActive(data.date_created)}`;  
            // Update Stats
            // document.getElementById('acc-age').textContent = `${user.days_active} days`;
            // document.getElementById('ref-count').textContent = user.referral_count;
        } else {
            console.error("Failed to load profile:", data.message);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

async function updateProfile() {
    const btn = document.querySelector('.btn-save');
    const usernameInput = document.getElementById('input-username').value;
    const emailInput = document.getElementById('input-email').value;

    btn.textContent = "Updating...";
    btn.disabled = true;

    try {
        const response = await fetch('./server/update_profile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameInput,
                email: emailInput
            })
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('display-name').textContent = usernameInput;
            document.getElementById('big-avatar').textContent = usernameInput[0].toUpperCase();
            
            // Use Toastify Success
            showToast("Profile updated successfully!");
        } else {
            // Use Toastify Error
            showToast(result.message, "error");
        }
    } catch (error) {
        showToast("Server connection failed", "error");
    } finally {
        btn.textContent = "Update Profile";
        btn.disabled = false;
    }
}


function showToast(message, type = "success") {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: type === "success" ? "linear-gradient(to right, #f5a623, #d4891a)" : "#f87171",
            color: "#07060a",
            fontWeight: "600",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)"
        }
    }).showToast();
}