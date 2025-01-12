// Fonction globale pour basculer les menus
window.toggleMenu = function(menuId) {
    const menu = document.getElementById(menuId);
    if (menu) {
        const isVisible = menu.style.display === 'block';
        // Fermer tous les sous-menus
        document.querySelectorAll('.submenu').forEach(submenu => {
            submenu.style.display = 'none';
        });
        // Ouvrir/fermer le menu cliqué
        menu.style.display = isVisible ? 'none' : 'block';
    }
};

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('Interface.js: Initialisation...');

    try {
        // Initialiser le gestionnaire de canvas
        window.canvasManager = new CanvasManager();
        console.log('CanvasManager initialisé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du CanvasManager:', error);
    }

    // Configurer l'input de fichier
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        console.log('Interface.js: Input fichier trouvé');
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file && file.type === 'application/pdf') {
                console.log('PDF sélectionné:', file.name);
                try {
                    if (window.canvasManager) {
                        await window.canvasManager.loadPDF(file);
                        // Fermer le menu après le chargement
                        document.querySelectorAll('.submenu').forEach(menu => {
                            menu.style.display = 'none';
                        });
                    } else {
                        console.error('CanvasManager non trouvé');
                    }
                } catch (error) {
                    console.error('Erreur lors du chargement du PDF:', error);
                }
            } else {
                console.error('Le fichier sélectionné n\'est pas un PDF');
            }
        });
    } else {
        console.error('Interface.js: Input fichier non trouvé');
    }

    // Fermer les menus quand on clique ailleurs
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.menu-item')) {
            document.querySelectorAll('.submenu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });

    console.log('Interface.js: Initialisation terminée');
});
