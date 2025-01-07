import { CanvasPage } from './canvas.js';

export class CanvasManager {
  constructor(container) {
    this.container = container;
    this.pages = [];
    this.currentPage = null;
    this.currentPageIndex = 0;
    this.currentTool = null;
    
    // Créer la première page
    this.addPage();
  }

  addPage() {
    // Créer un nouveau canvas
    const canvas = document.createElement('canvas');
    canvas.width = 794;  // Format A4 en pixels (21cm * 37.795)
    canvas.height = 1123; // Format A4 en pixels (29.7cm * 37.795)
    canvas.style.border = '1px solid black';
    canvas.style.margin = '10px';
    canvas.style.backgroundColor = 'white';
    canvas.style.display = 'block'; // Toujours visible
    
    this.container.appendChild(canvas);

    try {
      const ctx = canvas.getContext('2d');
      const page = new CanvasPage(canvas, ctx);
      this.pages.push(page);
      
      // Mettre à jour la page courante et son index
      this.currentPage = page;
      this.currentPageIndex = this.pages.length - 1;

      // Appliquer l'outil courant à la nouvelle page
      if (this.currentTool) {
        page.setActiveTool(this.currentTool);
      }

      return page;
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
      return null;
    }
  }

  removePage() {
    if (this.pages.length <= 1) {
      console.log('Impossible de supprimer la dernière page');
      return;
    }

    const pageIndex = this.pages.indexOf(this.currentPage);
    if (pageIndex !== -1) {
      // Supprimer le canvas du DOM
      this.currentPage.canvas.remove();
      
      // Supprimer la page du tableau
      this.pages.splice(pageIndex, 1);
      
      // Mettre à jour la page courante et son index
      this.currentPageIndex = Math.max(0, pageIndex - 1);
      this.currentPage = this.pages[this.currentPageIndex];
    }
  }

  setCurrentTool(tool) {
    console.log('Changement d\'outil vers:', tool);
    this.currentTool = tool;
    // Mettre à jour l'outil actif sur la page courante
    if (this.currentPage) {
      this.currentPage.setActiveTool(tool);
    }
    // Mettre à jour l'outil actif sur toutes les pages
    this.pages.forEach(page => {
      page.setActiveTool(tool);
    });
  }

  setCurrentPage(index) {
    if (index >= 0 && index < this.pages.length) {
      // Mettre à jour la page courante et son index
      this.currentPageIndex = index;
      this.currentPage = this.pages[index];
      
      // Faire défiler jusqu'à la page sélectionnée
      this.currentPage.canvas.scrollIntoView({ behavior: 'smooth' });
      
      console.log(`Page courante changée pour ${index + 1}`);
    }
  }

  getCurrentPageIndex() {
    // Trouver la page la plus visible dans la vue
    const pages = this.pages;
    let maxVisibility = 0;
    let mostVisiblePageIndex = this.currentPageIndex;

    pages.forEach((page, index) => {
      const rect = page.canvas.getBoundingClientRect();
      const visibility = this.getVisibilityPercentage(rect);
      if (visibility > maxVisibility) {
        maxVisibility = visibility;
        mostVisiblePageIndex = index;
      }
    });

    this.currentPageIndex = mostVisiblePageIndex;
    this.currentPage = this.pages[mostVisiblePageIndex];
    return this.currentPageIndex;
  }

  // Nouvelle méthode pour calculer le pourcentage de visibilité d'un élément
  getVisibilityPercentage(rect) {
    const windowHeight = window.innerHeight;
    const docViewTop = window.scrollY;
    const docViewBottom = docViewTop + windowHeight;
    const elemTop = rect.top;
    const elemBottom = rect.bottom;

    if (elemBottom < docViewTop || elemTop > docViewBottom) {
      return 0;
    }

    const elemHeight = rect.height;
    const visibleTop = Math.max(docViewTop, elemTop);
    const visibleBottom = Math.min(docViewBottom, elemBottom);
    const visibleHeight = visibleBottom - visibleTop;

    return (visibleHeight / elemHeight) * 100;
  }

  getCurrentPage() {
    return this.currentPage;
  }

  getPages() {
    return this.pages;
  }
}
