document.addEventListener("DOMContentLoaded", function () {
    const top_bar_username = document.querySelector("#top_bar_username");
    const sb_bar_username = document.querySelector("#sb-username");
    const sb_bar_wallet = document.querySelector("#sb-wallet");
    const avatar = document.querySelector("#sb-avatar");

    const API_URL = "./server/user_details.php"; 

  async function fetchAndUpdateUI() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            
            // Check if the data has the field you need (e.g., 'username')
            if (data) {
                top_bar_username.textContent = data.username;
                sb_bar_username.textContent = data.username;
                avatar.textContent = data.username.substr(0,1);
                if(data.wallet){
                     
                    var wallet_view = data.wallet.substr(0,5)+'...'+data.wallet.slice(-5);
                    // console.log(wallet_view);
                    sb_bar_wallet.textContent = wallet_view;
                }else if(data.email){
                      sb_bar_wallet.textContent = data.email.substr(0,5)+'...'+data.email.slice(-7);
                }
            } else if (data.error) {
                console.warn("Server returned error:", data.error);
            }
         
        } catch (error) {
            console.error("Error fetching data:", error);
            window.location.href="../login.html";
        }
    }

    // Fetch data initially
    fetchAndUpdateUI();
    setInterval(fetchAndUpdateUI, 5 * 60 * 1000);
});

    function logout(){
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {                             
                Toastify({
                text: "Logging Out...",
                duration: 1000,
                newWindow: true,
                close: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                background: "#f5a623", color: "black",
                },
                onClick: function(){}
                }).showToast();  
                setTimeout(function(){window.location = '../login.html'},500)
            }
        };
        xmlhttp.open("GET","./server/logout.php",true);
        xmlhttp.send();
    }