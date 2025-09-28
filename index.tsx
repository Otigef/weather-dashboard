/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

// --- DOM Elements ---
const cityInput = document.getElementById('city-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn');
const loader = document.getElementById('loader');
const errorMessageEl = document.getElementById('error-message');
const weatherContent = document.getElementById('weather-content');
const suggestionsBox = document.getElementById('suggestions-box');

// Favorites Elements
const favoritesSection = document.getElementById('favorites-section');
const favoritesList = document.getElementById('favorites-list');
const addFavoriteBtn = document.getElementById('add-favorite-btn');

// Current Weather Elements
const currentWeatherSection = document.getElementById('current-weather');
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const weatherIconEl = document.getElementById('weather-icon');
const currentTempEl = document.getElementById('current-temp');
const weatherDescriptionEl = document.getElementById('weather-description');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const weatherAlertsEl = document.getElementById('weather-alerts');

// Forecast Elements
const forecastSection = document.getElementById('forecast');
const forecastCardsContainer = document.getElementById('forecast-cards');

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- App State ---
const FAVORITES_KEY = 'weatherAppFavorites';
let favorites: string[] = [];
let debounceTimer: number;
let currentCity: string = 'London'; // Default city

// --- API Schemas ---
const weatherResponseSchema = {
    type: Type.OBJECT,
    properties: {
        current: {
            type: Type.OBJECT,
            properties: {
                temp: { type: Type.NUMBER, description: "Current temperature in Celsius" },
                humidity: { type: Type.NUMBER, description: "Humidity percentage" },
                wind_speed: { type: Type.NUMBER, description: "Wind speed in km/h" },
                description: { type: Type.STRING, description: "Brief weather description" },
            },
            required: ['temp', 'humidity', 'wind_speed', 'description']
        },
        forecast: {
            type: Type.ARRAY,
            description: "An array of 5 objects, each for a day in the forecast.",
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING, description: "Day of the week" },
                    temp_high: { type: Type.NUMBER, description: "Highest temperature in Celsius" },
                    temp_low: { type: Type.NUMBER, description: "Lowest temperature in Celsius" },
                    description: { type: Type.STRING, description: "Brief weather description for the day" },
                },
                required: ['day', 'temp_high', 'temp_low', 'description']
            },
        },
    },
    required: ['current', 'forecast']
};

const citySuggestionsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.STRING,
        description: "A city name suggestion, like 'London, UK'",
    }
};

// --- Weather Functions ---
const ANIMATION_CLASSES = [
    'animate-sun', 'animate-cloud', 'animate-rain', 'animate-storm', 'animate-snow', 'animate-mist'
];
const BACKGROUND_CLASSES = [
    'bg-sunny', 'bg-cloudy', 'bg-rainy', 'bg-stormy', 'bg-snowy', 'bg-misty', 'bg-default'
];

/**
 * Maps weather descriptions to appropriate emojis, animation classes, and background classes.
 * @param {string} description - The weather description.
 * @returns {{icon: string, animationClass: string, backgroundClass: string}} An object with the icon and class names.
 */
function getWeatherIcon(description: string): { icon: string; animationClass: string; backgroundClass: string } {
    const desc = description.toLowerCase();
    if (desc.includes('clear')) return { icon: '☀️', animationClass: 'animate-sun', backgroundClass: 'bg-sunny' };
    if (desc.includes('cloud')) return { icon: '☁️', animationClass: 'animate-cloud', backgroundClass: 'bg-cloudy' };
    if (desc.includes('rain')) return { icon: '🌧️', animationClass: 'animate-rain', backgroundClass: 'bg-rainy' };
    if (desc.includes('storm') || desc.includes('thunder')) return { icon: '⛈️', animationClass: 'animate-storm', backgroundClass: 'bg-stormy' };
    if (desc.includes('snow')) return { icon: '❄️', animationClass: 'animate-snow', backgroundClass: 'bg-snowy' };
    if (desc.includes('mist') || desc.includes('fog')) return { icon: '🌫️', animationClass: 'animate-mist', backgroundClass: 'bg-misty' };
    return { icon: '🌍', animationClass: '', backgroundClass: 'bg-default' };
}

/**
 * Fetches weather data from the Gemini API for a given city.
 * @param {string} city - The name of the city to get weather for.
 * @param {boolean} [isAutoRefresh=false] - Flag to indicate if it's a background refresh.
 */
async function fetchWeather(city: string, isAutoRefresh = false) {
    if (!isAutoRefresh) {
        hideSuggestions();
        showLoading();
        searchBtn?.classList.add('searching');
        if (searchBtn) (searchBtn as HTMLButtonElement).disabled = true;
    }

    try {
        const prompt = `Provide the current weather and a 5-day forecast for ${city}. Use Celsius for temperature.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: weatherResponseSchema,
            },
        });

        const weatherData = JSON.parse(response.text);
        currentCity = city; // Store the city on successful fetch
        updateFavoriteButton();
        
        const displayCity = city.split(',')[0].trim();
        displayCurrentWeather(displayCity, weatherData.current);
        displayForecast(weatherData.forecast);
        
        if (!isAutoRefresh) {
            showContent();
        }

    } catch (error) {
        console.error("Error fetching weather data:", error);
        if (!isAutoRefresh) {
            showError("Could not retrieve weather data. Please try another city.");
        }
    } finally {
        if (!isAutoRefresh) {
            searchBtn?.classList.remove('searching');
            if (searchBtn) (searchBtn as HTMLButtonElement).disabled = false;
        }
    }
}

/**
 * Fetches city suggestions from the Gemini API.
 * @param {string} query - The partial city name to search for.
 */
async function fetchCitySuggestions(query: string) {
    if (query.length < 3) {
        hideSuggestions();
        searchBtn?.classList.remove('loading');
        return;
    }

    searchBtn?.classList.add('loading');
    try {
        const prompt = `Provide a list of up to 5 city names that start with '${query}'. Include country. Return only a JSON array of strings. Example: ["London, UK", "Londrina, Brazil"]`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: citySuggestionsSchema,
            }
        });

        const suggestions = JSON.parse(response.text);
        displaySuggestions(suggestions);
    } catch (error) {
        console.error("Error fetching city suggestions:", error);
        hideSuggestions();
    } finally {
        searchBtn?.classList.remove('loading');
    }
}

// --- Favorites Functions ---

function loadFavorites() {
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    if (storedFavorites) {
        favorites = JSON.parse(storedFavorites);
    }
}

function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function addFavorite(cityToAdd: string) {
    if (!favorites.some(city => city.toLowerCase() === cityToAdd.toLowerCase())) {
        favorites.push(cityToAdd);
        saveFavorites();
        renderFavorites();
        updateFavoriteButton();
    }
}

function removeFavorite(cityToRemove: string) {
    if (confirm(`Are you sure you want to remove ${cityToRemove} from your favorites?`)) {
        favorites = favorites.filter(city => city.toLowerCase() !== cityToRemove.toLowerCase());
        saveFavorites();
        renderFavorites();
        updateFavoriteButton();
    }
}

function renderFavorites() {
    if (!favoritesList || !favoritesSection) return;
    favoritesList.innerHTML = '';

    if (favorites.length > 0) {
        favoritesSection.classList.remove('hidden');
        favorites.forEach(city => {
            const favBtn = document.createElement('div');
            favBtn.className = 'favorite-city-btn';

            const cityNameSpan = document.createElement('span');
            cityNameSpan.textContent = city;
            cityNameSpan.onclick = () => fetchWeather(city);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-favorite-btn';
            removeBtn.textContent = '×';
            removeBtn.ariaLabel = `Remove ${city} from favorites`;
            removeBtn.onclick = () => removeFavorite(city);

            favBtn.appendChild(cityNameSpan);
            favBtn.appendChild(removeBtn);
            favoritesList.appendChild(favBtn);
        });
    } else {
        favoritesSection.classList.add('hidden');
    }
}

function updateFavoriteButton() {
    if (!addFavoriteBtn) return;
    const isFav = favorites.some(city => city.toLowerCase() === currentCity.toLowerCase());
    if (isFav) {
        addFavoriteBtn.textContent = '★'; // Filled star
        addFavoriteBtn.classList.add('is-favorite');
        addFavoriteBtn.setAttribute('aria-label', 'Remove from favorites');
    } else {
        addFavoriteBtn.textContent = '☆'; // Empty star
        addFavoriteBtn.classList.remove('is-favorite');
        addFavoriteBtn.setAttribute('aria-label', 'Add to favorites');
    }
}

// --- UI Update Functions ---

/**
 * Displays the current weather information on the page.
 * @param {string} city - The city name.
 * @param {object} current - The current weather data object.
 */
function displayCurrentWeather(city: string, current: any) {
    if (!cityNameEl || !currentDateEl || !weatherIconEl || !currentTempEl || !weatherDescriptionEl || !humidityEl || !windSpeedEl) return;

    cityNameEl.textContent = city;
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    
    const { icon, animationClass, backgroundClass } = getWeatherIcon(current.description);
    weatherIconEl.textContent = icon;
    weatherIconEl.classList.remove(...ANIMATION_CLASSES);
    if (animationClass) {
        weatherIconEl.classList.add(animationClass);
    }

    const weatherCard = currentWeatherSection?.querySelector('.weather-card');
    if (weatherCard) {
        weatherCard.classList.remove(...BACKGROUND_CLASSES);
        weatherCard.classList.add(backgroundClass);
    }
    
    currentTempEl.textContent = `${Math.round(current.temp)}°C`;
    weatherDescriptionEl.textContent = current.description;
    humidityEl.textContent = `${current.humidity}%`;
    windSpeedEl.textContent = `${current.wind_speed} km/h`;

    displayWeatherAlerts(current);
}

/**
 * Displays the 5-day forecast on the page.
 * @param {Array<object>} forecast - An array of forecast data objects.
 */
function displayForecast(forecast: any[]) {
    if (!forecastCardsContainer) return;
    forecastCardsContainer.innerHTML = ''; // Clear previous forecast

    forecast.slice(0, 5).forEach(day => {
        const card = document.createElement('div');
        card.className = 'forecast-card';

        const dayEl = document.createElement('p');
        const strongEl = document.createElement('strong');
        strongEl.textContent = day.day;
        dayEl.appendChild(strongEl);

        const iconEl = document.createElement('div');
        iconEl.className = 'forecast-icon';
        const { icon, animationClass } = getWeatherIcon(day.description);
        iconEl.textContent = icon;
        if (animationClass) {
            iconEl.classList.add(animationClass);
        }

        const tempEl = document.createElement('p');
        tempEl.className = 'forecast-temp';
        tempEl.textContent = `${Math.round(day.temp_high)}° / ${Math.round(day.temp_low)}°`;

        card.appendChild(dayEl);
        card.appendChild(iconEl);
        card.appendChild(tempEl);

        forecastCardsContainer.appendChild(card);
    });
}


/**
 * Displays city suggestions in the dropdown.
 * @param {string[]} suggestions - An array of city name strings.
 */
function displaySuggestions(suggestions: string[]) {
    if (!suggestionsBox) return;
    suggestionsBox.innerHTML = '';
    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }
    suggestions.forEach(city => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = city;
        suggestionItem.addEventListener('click', () => {
            cityInput.value = city;
            fetchWeather(city);
        });
        suggestionsBox.appendChild(suggestionItem);
    });
    suggestionsBox.classList.remove('hidden');
}

function hideSuggestions() {
    if (suggestionsBox) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
    }
}

// --- UI State Management ---

function showLoading() {
    loader?.classList.remove('hidden');
    errorMessageEl?.classList.add('hidden');
    favoritesSection?.classList.add('hidden');
    currentWeatherSection?.classList.add('hidden');
    forecastSection?.classList.add('hidden');
}

function showContent() {
    loader?.classList.add('hidden');
    errorMessageEl?.classList.add('hidden');
    if (favorites.length > 0) {
        favoritesSection?.classList.remove('hidden');
    }
    currentWeatherSection?.classList.remove('hidden');
    forecastSection?.classList.remove('hidden');
}

function showError(message: string) {
    loader?.classList.add('hidden');
    errorMessageEl?.classList.remove('hidden');
    favoritesSection?.classList.add('hidden');
    currentWeatherSection?.classList.add('hidden');
    forecastSection?.classList.add('hidden');
    if (errorMessageEl) errorMessageEl.textContent = message;
}

// --- Alerts Functions ---

/**
 * Creates a styled alert pill element.
 * @param {string} text - The alert message.
 * @param {string} icon - The emoji icon for the alert.
 * @param {string} className - The CSS class for styling the alert.
 * @returns {HTMLElement} The created alert pill element.
 */
function createAlertPill(text: string, icon: string, className: string): HTMLElement {
    const pill = document.createElement('div');
    pill.className = `alert-pill ${className}`;
    pill.innerHTML = `<span>${icon}</span> ${text}`;
    return pill;
}

/**
 * Displays alerts for extreme weather conditions.
 * @param {object} current - The current weather data object.
 */
function displayWeatherAlerts(current: any) {
    if (!weatherAlertsEl) return;
    weatherAlertsEl.innerHTML = ''; // Clear previous alerts

    // Temperature Alerts
    if (current.temp > 30) {
        weatherAlertsEl.appendChild(createAlertPill('Extreme Heat', '🌡️', 'alert-hot'));
    } else if (current.temp < 5) {
        weatherAlertsEl.appendChild(createAlertPill('Cold Weather', '🥶', 'alert-cold'));
    }

    // Wind Alert
    if (current.wind_speed > 30) {
        weatherAlertsEl.appendChild(createAlertPill('High Wind', '💨', 'alert-wind'));
    }

    // Storm Alert
    const desc = current.description.toLowerCase();
    if (desc.includes('storm') || desc.includes('thunder')) {
         weatherAlertsEl.appendChild(createAlertPill('Storm Alert', '⚡', 'alert-storm'));
    }
}


// --- Event Listeners ---
searchBtn?.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

cityInput?.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        searchBtn?.click();
    }
});

cityInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = cityInput.value.trim();
    debounceTimer = window.setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300); // 300ms delay
});

addFavoriteBtn?.addEventListener('click', () => {
    const isFav = favorites.some(city => city.toLowerCase() === currentCity.toLowerCase());
    if (isFav) {
        removeFavorite(currentCity);
    } else {
        addFavorite(currentCity);
    }
});

// Hide suggestions when clicking outside the search wrapper
document.addEventListener('click', (event) => {
    const searchWrapper = document.querySelector('.search-wrapper');
    if (searchWrapper && !searchWrapper.contains(event.target as Node)) {
        hideSuggestions();
    }
});

// --- Initial Load ---
window.addEventListener('load', () => {
    loadFavorites();
    renderFavorites();
    const initialCity = favorites.length > 0 ? favorites[0] : 'London';
    currentCity = initialCity;
    fetchWeather(initialCity);
});

// --- Auto-refresh timer ---
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
    if (currentCity) {
        console.log(`Auto-refreshing weather for ${currentCity}...`);
        fetchWeather(currentCity, true);
    }
}, REFRESH_INTERVAL);