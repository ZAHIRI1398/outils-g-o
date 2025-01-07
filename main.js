import { CanvasManager } from './classes/canvas_manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('container1');
    const canvasManager = new CanvasManager(container);
    window.canvasManager = canvasManager;

    // Gestionnaire d'événements pour les outils de dessin
    document.getElementById('btn-point')?.addEventListener('click', () => canvasManager.setCurrentTool('point'));
    document.getElementById('btn-milieu')?.addEventListener('click', () => canvasManager.setCurrentTool('milieu'));
    document.getElementById('btn-segment')?.addEventListener('click', () => canvasManager.setCurrentTool('segment'));
    document.getElementById('btn-segment-known')?.addEventListener('click', () => canvasManager.setCurrentTool('segment-known'));
    document.getElementById('btn-droite')?.addEventListener('click', () => canvasManager.setCurrentTool('droite'));
    document.getElementById('btn-parallele')?.addEventListener('click', () => canvasManager.setCurrentTool('parallele'));
    document.getElementById('btn-perpendiculaire')?.addEventListener('click', () => canvasManager.setCurrentTool('perpendiculaire'));
    document.getElementById('btn-compas')?.addEventListener('click', () => canvasManager.setCurrentTool('compas'));
    document.getElementById('btn-compas-known')?.addEventListener('click', () => canvasManager.setCurrentTool('compas-known'));
    document.getElementById('btn-text')?.addEventListener('click', () => canvasManager.setCurrentTool('text'));
    document.getElementById('btn-gomme')?.addEventListener('click', () => canvasManager.setCurrentTool('gomme'));
    document.getElementById('btn-angle')?.addEventListener('click', () => canvasManager.setCurrentTool('angle'));
    document.getElementById('btn-polygon')?.addEventListener('click', () => canvasManager.setCurrentTool('polygon'));

    // Gestionnaire d'événements pour les couleurs
    const colorPicker = document.getElementById('color-picker');
    const fillColorPicker = document.getElementById('fill-color-picker');

    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const currentPage = canvasManager.getCurrentPage();
            if (currentPage) {
                currentPage.setColor(e.target.value);
            }
        });
    }

    if (fillColorPicker) {
        fillColorPicker.addEventListener('input', (e) => {
            const currentPage = canvasManager.getCurrentPage();
            if (currentPage) {
                currentPage.setFillColor(e.target.value);
            }
        });
    }

    // Gestionnaire d'événements pour l'outil de remplissage
    document.getElementById('btn-fill')?.addEventListener('click', () => {
        canvasManager.setCurrentTool('fill');
    });

    // Gestionnaire d'événements pour la navigation des pages
    document.getElementById('btn-add')?.addEventListener('click', () => canvasManager.addPage());
    document.getElementById('btn-remove')?.addEventListener('click', () => canvasManager.removePage());

    // Navigation entre les pages avec les flèches du clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            const nextIndex = canvasManager.getCurrentPageIndex() + 1;
            if (nextIndex < canvasManager.getPages().length) {
                canvasManager.setCurrentPage(nextIndex);
            }
        } else if (e.key === 'ArrowLeft') {
            const prevIndex = canvasManager.getCurrentPageIndex() - 1;
            if (prevIndex >= 0) {
                canvasManager.setCurrentPage(prevIndex);
            }
        }
    });

    // Gestionnaire d'événements pour le chargement de PDF
    const pdfInput = document.getElementById('pdf-input');
    const fileName = document.getElementById('file-name');
    let currentPdfDocument = null;

    pdfInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            fileName.textContent = file.name;
            
            if (file.type === 'application/pdf') {
                try {
                    const fileReader = new FileReader();
                    fileReader.onload = async function() {
                        const typedarray = new Uint8Array(this.result);
                        
                        // Chargement du PDF
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        currentPdfDocument = pdf;
                        console.log('PDF chargé avec', pdf.numPages, 'pages');

                        // Réinitialiser le conteneur
                        const centerColumn = document.getElementById('center-column');
                        const container = document.getElementById('container1');
                        container.innerHTML = '';
                        canvasManager.pages = [];
                        canvasManager.currentPage = null;
                        canvasManager.currentPageIndex = 0;

                        // Créer un conteneur pour les pages PDF
                        const pdfContainer = document.createElement('div');
                        pdfContainer.id = 'pdf-container';
                        container.appendChild(pdfContainer);

                        // Forcer le scroll en haut
                        centerColumn.scrollTop = 0;
                        
                        // Pour chaque page du PDF
                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const viewport = page.getViewport({ scale: 1.5 });
                            
                            // Créer un nouveau canvas pour chaque page
                            const canvasPage = canvasManager.addPage();
                            if (!canvasPage) continue;

                            // Déplacer le canvas dans le conteneur PDF
                            pdfContainer.appendChild(canvasPage.canvas);
                            
                            // Ajuster la taille du canvas
                            canvasPage.canvas.width = viewport.width;
                            canvasPage.canvas.height = viewport.height;
                            canvasPage.pdfCanvas.width = viewport.width;
                            canvasPage.pdfCanvas.height = viewport.height;
                            
                            try {
                                // Dessiner la page du PDF
                                await page.render({
                                    canvasContext: canvasPage.pdfContext,
                                    viewport: viewport
                                }).promise;
                                
                                // Redessiner tout
                                canvasPage.redraw();
                                console.log(`Page ${pageNum} rendue avec succès`);
                            } catch (renderError) {
                                console.error(`Erreur lors du rendu de la page ${pageNum}:`, renderError);
                            }
                        }

                        // S'assurer que le conteneur est au début
                        centerColumn.scrollTop = 0;
                        window.scrollTo(0, 0);
                    };
                    fileReader.readAsArrayBuffer(file);
                } catch (error) {
                    console.error('Erreur lors du chargement du PDF:', error);
                }
            } else if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = function() {
                    const canvasPage = canvasManager.getCurrentPage();
                    if (!canvasPage) return;
                    
                    // Ajuster la taille du canvas
                    canvasPage.canvas.width = img.width;
                    canvasPage.canvas.height = img.height;
                    canvasPage.pdfCanvas.width = img.width;
                    canvasPage.pdfCanvas.height = img.height;
                    
                    // Dessiner l'image
                    canvasPage.pdfContext.drawImage(img, 0, 0);
                    canvasPage.redraw();
                };
                img.src = URL.createObjectURL(file);
            }
        }
    });

    // Gestionnaire d'événements pour les popups
    const numberPopup = document.getElementById('glisser-nombre-popup');
    const measurePopup = document.getElementById('glisser-mesure-popup');

    // Ouvrir le popup Glisser Nombre
    document.getElementById('btn-glisser-nombre')?.addEventListener('click', () => {
        numberPopup.style.display = 'block';
    });

    // Ouvrir le popup Glisser Mesure
    document.getElementById('btn-glisser-mesure')?.addEventListener('click', () => {
        measurePopup.style.display = 'block';
    });

    // Fermer les popups
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            numberPopup.style.display = 'none';
            measurePopup.style.display = 'none';
        });
    });

    // Gestion des boutons + et - pour le nombre
    document.getElementById('increase-number')?.addEventListener('click', () => {
        const numberValue = document.getElementById('number-value');
        numberValue.value = parseInt(numberValue.value) + 1;
    });

    document.getElementById('decrease-number')?.addEventListener('click', () => {
        const numberValue = document.getElementById('number-value');
        numberValue.value = parseInt(numberValue.value) - 1;
    });

    // Gestion des boutons + et - pour la mesure
    document.getElementById('increase-measure')?.addEventListener('click', () => {
        const measureValue = document.getElementById('measure-value');
        measureValue.value = (parseFloat(measureValue.value) + 0.1).toFixed(1);
    });

    document.getElementById('decrease-measure')?.addEventListener('click', () => {
        const measureValue = document.getElementById('measure-value');
        measureValue.value = (parseFloat(measureValue.value) - 0.1).toFixed(1);
    });

    // Appliquer le nombre
    document.getElementById('apply-number')?.addEventListener('click', () => {
        const value = parseInt(document.getElementById('number-value').value);
        const currentPage = canvasManager.getCurrentPage();
        if (currentPage) {
            // Créer un élément de texte avec le nombre
            const text = value.toString();
            const fontSize = 20;
            currentPage.context.font = `${fontSize}px Arial`;
            
            // Position initiale au centre
            const x = currentPage.canvas.width / 2;
            const y = currentPage.canvas.height / 2;
            
            // Ajouter le nombre comme texte draggable
            currentPage.addDraggableText(text, x, y, fontSize);
            currentPage.redraw();
        }
        numberPopup.style.display = 'none';
    });

    // Appliquer la mesure
    document.getElementById('apply-measure')?.addEventListener('click', () => {
        const value = parseFloat(document.getElementById('measure-value').value);
        const currentPage = canvasManager.getCurrentPage();
        if (currentPage) {
            // Créer un élément de texte avec la mesure
            const text = value.toFixed(1) + ' cm';
            const fontSize = 16;
            currentPage.context.font = `${fontSize}px Arial`;
            
            // Position initiale au centre
            const x = currentPage.canvas.width / 2;
            const y = currentPage.canvas.height / 2;
            
            // Ajouter la mesure comme texte draggable
            currentPage.addDraggableText(text, x, y, fontSize);
            currentPage.redraw();
        }
        measurePopup.style.display = 'none';
    });

    // Fermer les popups en cliquant en dehors
    window.addEventListener('click', (e) => {
        if (e.target === numberPopup) {
            numberPopup.style.display = 'none';
        }
        if (e.target === measurePopup) {
            measurePopup.style.display = 'none';
        }
    });

    // Gestionnaire pour l'export PDF
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
        // Initialiser jsPDF
        const { jsPDF } = window.jspdf;

        // Créer un nouveau document PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [794, 1123] // Format A4 en pixels
        });

        // Pour chaque page du canvas
        canvasManager.pages.forEach((page, index) => {
            // Si ce n'est pas la première page, ajouter une nouvelle page
            if (index > 0) {
                pdf.addPage();
            }

            // Convertir le canvas en image
            const imgData = page.canvas.toDataURL('image/jpeg', 1.0);
            
            // Ajouter l'image au PDF
            pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
        });

        // Sauvegarder le PDF
        pdf.save('geometrie.pdf');
    });

    // Gestionnaire pour la lecture de texte du PDF
    document.getElementById('btn-read')?.addEventListener('click', async () => {
        if (!currentPdfDocument) {
            alert('Veuillez d\'abord charger un PDF');
            return;
        }

        try {
            // Obtenir le numéro de la page courante en utilisant la nouvelle méthode
            const currentPageIndex = canvasManager.getCurrentPageIndex();
            
            if (currentPageIndex === -1) {
                alert('Erreur : Impossible de déterminer la page courante');
                return;
            }
            
            // Vérifier si la page existe dans le PDF
            if (currentPageIndex >= currentPdfDocument.numPages) {
                alert(`Page invalide. Le document contient ${currentPdfDocument.numPages} pages.`);
                return;
            }

            // Obtenir la page du PDF (les pages commencent à 1, pas à 0)
            const page = await currentPdfDocument.getPage(currentPageIndex + 1);
            
            // Extraire le texte de la page
            const textContent = await page.getTextContent();
            const text = textContent.items
                .map(item => item.str)
                .join(' ')
                .trim();

            if (text) {
                console.log(`Lecture de la page ${currentPageIndex + 1}`);
                
                // Créer un objet SpeechSynthesisUtterance
                const utterance = new SpeechSynthesisUtterance();
                
                // Configurer la voix en français
                utterance.text = text;
                utterance.lang = 'fr-FR';
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                
                // Arrêter toute lecture en cours
                window.speechSynthesis.cancel();
                
                // Ajouter des contrôles de lecture
                utterance.onstart = () => {
                    console.log(`Début de la lecture de la page ${currentPageIndex + 1}`);
                    const stopButton = document.getElementById('btn-stop-read');
                    if (stopButton) {
                        stopButton.classList.add('is-danger');
                    }
                };
                
                utterance.onend = () => {
                    console.log(`Fin de la lecture de la page ${currentPageIndex + 1}`);
                    const stopButton = document.getElementById('btn-stop-read');
                    if (stopButton) {
                        stopButton.classList.remove('is-danger');
                    }
                };
                
                utterance.onerror = (event) => {
                    // Ne pas afficher d'erreur si la lecture a été volontairement arrêtée
                    if (event.error !== 'canceled') {
                        console.error('Erreur de lecture:', event);
                        alert('Erreur lors de la lecture du texte');
                    }
                    const stopButton = document.getElementById('btn-stop-read');
                    if (stopButton) {
                        stopButton.classList.remove('is-danger');
                    }
                };

                // Lire le texte
                window.speechSynthesis.speak(utterance);
            } else {
                alert(`Aucun texte trouvé sur la page ${currentPageIndex + 1} du PDF`);
            }
        } catch (error) {
            console.error('Erreur lors de la lecture du PDF:', error);
            alert(`Erreur lors de la lecture de la page. Assurez-vous que la page existe dans le document.`);
        }
    });

    // Gestionnaire pour arrêter la lecture
    document.getElementById('btn-stop-read')?.addEventListener('click', () => {
        // Arrêter la lecture en cours
        window.speechSynthesis.cancel();
        // Réinitialiser l'apparence du bouton
        const stopButton = document.getElementById('btn-stop-read');
        if (stopButton) {
            stopButton.classList.remove('is-danger');
        }
        console.log('Lecture arrêtée');
    });

    // Gestionnaire pour le bouton d'enregistrement
    document.getElementById('btn-save')?.addEventListener('click', () => {
        const currentPage = canvasManager.getCurrentPage();
        if (!currentPage) {
            alert('Aucune page à enregistrer');
            return;
        }

        try {
            // Créer un canvas temporaire pour combiner les calques
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = currentPage.canvas.width;
            tempCanvas.height = currentPage.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Dessiner le PDF/image de fond s'il existe
            if (currentPage.pdfCanvas) {
                tempCtx.drawImage(currentPage.pdfCanvas, 0, 0);
            }

            // Dessiner le calque de dessin par-dessus
            tempCtx.drawImage(currentPage.canvas, 0, 0);

            // Convertir en image et télécharger
            const link = document.createElement('a');
            link.download = 'geometrie.png';
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            alert('Erreur lors de l\'enregistrement de l\'image');
        }
    });
});
