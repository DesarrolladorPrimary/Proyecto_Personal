document.addEventListener("DOMContentLoaded", () => {
  const themeButton = document.querySelector("#button_tema");
  const themeDropdown = document.querySelector("#drop_colors");
  const themeButtons = document.querySelectorAll("#drop_colors .settings-dropdown__btn");

  const languageTrigger = document.querySelector("#language_trigger");
  const languageButton = document.querySelector("#button_idioma");
  const languageDropdown = document.querySelector("#drop_languages");
  const languageButtons = document.querySelectorAll("#drop_languages .settings-dropdown__btn");

  const languageMap = {
    es: { label: "Español", htmlLang: "es" },
    en: { label: "Inglés", htmlLang: "en" },
    de: { label: "Alemán", htmlLang: "de" },
    fr: { label: "Francés", htmlLang: "fr" },
    ja: { label: "Japonés", htmlLang: "ja" },
  };

  const setThemeDisplay = (theme) => {
    if (theme === "Oscuro") {
      themeButton.style.backgroundColor = "#584e4e";
      themeButton.style.color = "white";
    } else {
      themeButton.style.backgroundColor = "white";
      themeButton.style.color = "black";
    }
  };

  const toggleDropdown = (dropdown) => {
    const isVisible = dropdown.style.display === "flex";

    if (isVisible) {
      dropdown.style.display = "none";
      dropdown.style.visibility = "hidden";
      dropdown.style.opacity = "0";
      return;
    }

    dropdown.style.display = "flex";
    dropdown.style.visibility = "visible";
    dropdown.style.opacity = "1";
  };

  const hideDropdown = (dropdown) => {
    dropdown.style.display = "none";
    dropdown.style.visibility = "hidden";
    dropdown.style.opacity = "0";
  };

  const applyLanguage = (languageCode) => {
    const selectedLanguage = languageMap[languageCode] || languageMap.es;
    languageButton.textContent = selectedLanguage.label;
    document.documentElement.lang = selectedLanguage.htmlLang;
    window.languageManager?.setLanguage(languageCode in languageMap ? languageCode : "es");
  };

  const currentTheme = window.themeManager.getCurrentTheme();
  themeButton.textContent = currentTheme;
  setThemeDisplay(currentTheme);

  const currentLanguage = localStorage.getItem("selectedLanguage") || "es";
  applyLanguage(currentLanguage);

  themeButton.addEventListener("click", () => {
    toggleDropdown(themeDropdown);
  });

  languageTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    toggleDropdown(languageDropdown);
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTheme = button.textContent.trim();
      themeButton.textContent = selectedTheme;
      setThemeDisplay(selectedTheme);
      window.applyTheme(selectedTheme);
      hideDropdown(themeDropdown);
    });
  });

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.language || "es");
      hideDropdown(languageDropdown);
    });
  });

  window.addEventListener("click", (event) => {
    if (
      themeDropdown.style.display === "flex" &&
      !themeDropdown.contains(event.target) &&
      event.target !== themeButton
    ) {
      hideDropdown(themeDropdown);
    }

    if (
      languageDropdown.style.display === "flex" &&
      !languageDropdown.contains(event.target) &&
      !languageTrigger.contains(event.target)
    ) {
      hideDropdown(languageDropdown);
    }
  });
});
