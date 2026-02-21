document.addEventListener('DOMContentLoaded', ()=> {
    const button_tema = document.querySelector("#button_tema");
    const drop_colors = document.querySelector("#drop_colors");
    const theme_buttons = document.querySelectorAll(".settings-dropdown__btn");

    // Set initial theme display
    const currentTheme = window.themeManager.getCurrentTheme();
    button_tema.textContent = currentTheme;
    
    // Set initial button colors
    if (currentTheme === 'Oscuro') {
        button_tema.style.backgroundColor = '#584e4e';
        button_tema.style.color = 'white';
    } else if (currentTheme === 'Claro') {
        button_tema.style.backgroundColor = 'white';
        button_tema.style.color = 'black';
    }

    button_tema.addEventListener('click', ()=> {
        
        // Toggle visibility
        if (drop_colors.style.display === 'flex') {
            drop_colors.style.display = 'none';
            drop_colors.style.visibility = 'hidden';
            drop_colors.style.opacity = '0';
        } else {
            drop_colors.style.display = 'flex';
            drop_colors.style.visibility = 'visible';
            drop_colors.style.opacity = '1';
        }
    })

    // Add click event to each theme button
    theme_buttons.forEach(button => {
        button.addEventListener('click', ()=> {
            const selectedTheme = button.textContent.trim();
            button_tema.textContent = selectedTheme;
            
            // Change the background color of the value box
            if (selectedTheme === 'Oscuro') {
                button_tema.style.backgroundColor = '#584e4e';
                button_tema.style.color = 'white';
            } else if (selectedTheme === 'Claro') {
                button_tema.style.backgroundColor = 'white';
                button_tema.style.color = 'black';
            }
            
            // Apply theme globally using the theme manager
            window.applyTheme(selectedTheme);
            
            // Hide dropdown after selection
            drop_colors.style.display = 'none';
            drop_colors.style.visibility = 'hidden';
            drop_colors.style.opacity = '0';
            
            console.log('Theme selected:', selectedTheme);
        })
    })
})