/**
 * Suivi VMC - Agriwatt
 * Fichier JavaScript principal (logique custom)
 */

// =============================================================
// Configuration MSAL (Microsoft Authentication Library)
// =============================================================
const msalConfig = {
    auth: {
        clientId: "TON_CLIENT_ID", // À remplacer par ton client ID Azure AD
        authority: "https://login.microsoftonline.com/TON_TENANT_ID", // À remplacer par ton tenant ID
        redirectUri: window.location.origin + "/index.html"
    },
    cache: {
        cacheLocation: "sessionStorage", // Utilisation de sessionStorage pour plus de sécurité
        storeAuthStateInCookie: false
    }
};

// Initialiser MSAL
const msalInstance = new msal.PublicClientApplication(msalConfig);

// =============================================================
// Fonctions d'authentification
// =============================================================

/**
 * Connecter l'utilisateur via Microsoft
 */
async function login() {
    try {
        const loginRequest = {
            scopes: ["User.Read", "Files.Read.All"] // Ajuster les scopes selon tes besoins
        };
        const authResult = await msalInstance.loginPopup(loginRequest);
        console.log("Connexion réussie :", authResult.account);
        return authResult;
    } catch (error) {
        console.error("Erreur de connexion :", error);
        throw error;
    }
}

/**
 * Déconnecter l'utilisateur
 */
function logout() {
    msalInstance.logoutPopup().then(() => {
        console.log("Déconnexion réussie");
        window.location.reload();
    }).catch(error => {
        console.error("Erreur de déconnexion :", error);
    });
}

/**
 * Vérifier si l'utilisateur est connecté
 */
async function isLoggedIn() {
    const accounts = msalInstance.getAllAccounts();
    return accounts.length > 0;
}

/**
 * Obtenir le token d'accès pour Microsoft Graph
 */
async function getAccessToken() {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
        throw new Error("Aucun utilisateur connecté");
    }
    
    const tokenRequest = {
        scopes: ["User.Read", "Files.Read.All"],
        account: accounts[0]
    };
    
    try {
        const tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);
        return tokenResponse.accessToken;
    } catch (error) {
        console.error("Erreur lors de l'obtention du token :", error);
        throw error;
    }
}

// =============================================================
// Gestion des données (exemple : Visites Manageriales de Chantier)
// =============================================================

/**
 * Charger les chantiers depuis Microsoft Graph ou localStorage
 */
async function loadChantiers() {
    try {
        // Vérifier si des données existent en localStorage
        const localChantiers = localStorage.getItem("chantiers");
        if (localChantiers) {
            return JSON.parse(localChantiers);
        }
        
        // Sinon, charger depuis Microsoft Graph (exemple)
        const token = await getAccessToken();
        const response = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }
        
        const data = await response.json();
        localStorage.setItem("chantiers", JSON.stringify(data.value));
        return data.value;
    } catch (error) {
        console.error("Erreur lors du chargement des chantiers :", error);
        return []; // Retourner un tableau vide en cas d'erreur
    }
}

/**
 * Sauvegarder un chantier en localStorage
 */
function saveChantier(chantier) {
    const chantiers = JSON.parse(localStorage.getItem("chantiers") || "[]");
    chantiers.push(chantier);
    localStorage.setItem("chantiers", JSON.stringify(chantiers));
}

/**
 * Supprimer un chantier du localStorage
 */
function deleteChantier(id) {
    let chantiers = JSON.parse(localStorage.getItem("chantiers") || "[]");
    chantiers = chantiers.filter(c => c.id !== id);
    localStorage.setItem("chantiers", JSON.stringify(chantiers));
}

// =============================================================
// Initialisation de l'application
// =============================================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Initialisation de Suivi VMC...");
    
    // Initialiser les composants Bootstrap (tooltips, popovers, etc.)
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Charger les chantiers au démarrage
    try {
        const chantiers = await loadChantiers();
        console.log("Chantiers chargés :", chantiers);
        // Ici, tu peux mettre à jour le DOM avec les chantiers
    } catch (error) {
        console.error("Erreur lors du chargement initial :", error);
    }
    
    // Gestion des boutons de connexion/déconnexion
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    
    if (loginButton) {
        loginButton.addEventListener("click", login);
    }
    
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }
    
    // Vérifier l'état de connexion au chargement
    const isLogged = await isLoggedIn();
    updateUIBasedOnAuth(isLogged);
});

/**
 * Mettre à jour l'UI en fonction de l'état de connexion
 */
function updateUIBasedOnAuth(isLoggedIn) {
    const loginSection = document.getElementById("loginSection");
    const appSection = document.getElementById("appSection");
    
    if (isLoggedIn) {
        if (loginSection) loginSection.style.display = "none";
        if (appSection) appSection.style.display = "block";
    } else {
        if (loginSection) loginSection.style.display = "block";
        if (appSection) appSection.style.display = "none";
    }
}

// =============================================================
// Fonctions utilitaires
// =============================================================

/**
 * Afficher une notification (toast)
 */
function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;
    
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML("beforeend", toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
}

/**
 * Formater une date en DD/MM/YYYY
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// =============================================================
// Export pour utilisation dans d'autres modules (si nécessaire)
// =============================================================
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        login,
        logout,
        isLoggedIn,
        getAccessToken,
        loadChantiers,
        saveChantier,
        deleteChantier,
        showToast,
        formatDate
    };
}