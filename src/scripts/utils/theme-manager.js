// Theme Manager - Sistema global de gestión de temas
class ThemeManager {
    constructor() {
        this.root = document.documentElement;
        this.currentTheme = localStorage.getItem('selectedTheme') || 'Oscuro';
        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applyTheme(this.currentTheme);
    }

    applyTheme(themeName) {
        switch(themeName) {
            case 'Oscuro':
                this.applyDarkTheme();
                break;
            case 'Claro':
                this.applyLightTheme();
                break;
            default:
                this.applyDarkTheme();
        }
        
        this.currentTheme = themeName;
        localStorage.setItem('selectedTheme', themeName);
    }

    applyDarkTheme() {
        this.root.style.setProperty('--background-color-body-feed', '#3c3636');
        this.root.style.setProperty('--color-background-container', '#655d5d');
        this.root.style.setProperty('--background-color-nav-subline', '#615151');
        this.root.style.setProperty('--color-text-light', 'white');
        this.root.style.setProperty('--color-text-muted', '#d0d0d0');
        this.root.style.setProperty('--color-text', 'white');
        this.root.style.setProperty('--color-modal-bg', '#4a4a4a');
        this.root.style.setProperty('--color-input-bg', '#4a4444');
        this.root.style.setProperty('--color-bg-light', '#4a4444');
        this.root.style.setProperty('--color-bg-dark-alt', '#3a3232');
        this.root.style.setProperty('--color-placeholder', '#999999');
    }

    applyLightTheme() {
        this.root.style.setProperty('--background-color-body-feed', '#f5f5f5');
        this.root.style.setProperty('--color-background-container', '#ffffff');
        this.root.style.setProperty('--background-color-nav-subline', '#e0e0e0');
        this.root.style.setProperty('--color-text-light', '#333333');
        this.root.style.setProperty('--color-text-muted', '#666666');
        this.root.style.setProperty('--color-text', '#333333');
        this.root.style.setProperty('--color-modal-bg', '#ffffff');
        this.root.style.setProperty('--color-input-bg', '#ffffff');
        this.root.style.setProperty('--color-bg-light', '#ffffff');
        this.root.style.setProperty('--color-bg-dark-alt', '#f0f0f0');
        this.root.style.setProperty('--color-placeholder', '#999999');
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Create global instance
window.themeManager = new ThemeManager();

// Make it available globally
window.applyTheme = (themeName) => {
    window.themeManager.applyTheme(themeName);
};
