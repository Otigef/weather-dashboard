# Weather Dashboard

A sleek, modern, and responsive web application that provides real-time weather data and a 5-day forecast for any city. This project is built with vanilla TypeScript and leverages the Google Gemini API to deliver dynamic weather information and an intuitive user experience.

![Weather Dashboard Screenshot](https://storage.googleapis.com/fpl-assets/makersuite/weather-dashboard-screenshot.png)

## ✨ Features

-   **Real-Time Weather Data**: Get up-to-the-minute weather information, including temperature, humidity, wind speed, and a descriptive summary.
-   **5-Day Forecast**: Plan ahead with a detailed 5-day forecast.
-   **Dynamic UI**: The user interface features animated weather icons and subtle background effects that change based on the current weather conditions (e.g., a gentle glow for sun, drifting clouds, and a lightning flash for storms).
-   **Smart City Search**: A type-ahead search bar provides real-time city suggestions as you type, making it easy to find any location.
-   **Favorite Cities**: Save your most-viewed cities for quick access. Favorites are stored in `localStorage` and persist between sessions.
-   **Extreme Weather Alerts**: The dashboard visually highlights extreme conditions like high heat, cold, high winds, and storms, so you're always aware of significant weather events.
-   **Auto-Refresh**: Weather data for the currently displayed city automatically refreshes every 15 minutes to ensure the information is always current.
-   **Responsive Design**: A clean, mobile-first design that looks great on any device, from desktops to smartphones.
-   **Granular Loading States**: Subtle spinners and loading animations provide clear feedback during data fetching, enhancing the user experience.

## 🛠️ Technologies Used

-   **Frontend**: HTML5, CSS3, TypeScript
-   **API**: Google Gemini API (`@google/genai`) for natural language processing to fetch weather data and city suggestions.
-   **Tooling**: No complex build tools required. The project uses ES modules imported via an `importmap`.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

You will need a Google Gemini API key. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/weather-dashboard.git
    cd weather-dashboard
    ```

2.  **Set up your API Key:**
    The application loads the Gemini API key from the `process.env.API_KEY` environment variable. To run this project in a development environment that supports this (like Glitch or a local setup with a tool like `vite`), you need to create an environment file (e.g., `.env`) in the root of the project and add your API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY
    ```

3.  **Serve the files:**
    Since this is a client-side-only application, you just need a simple local server to run it. You can use any static file server. A common choice is `serve`.
    ```sh
    # If you don't have 'serve' installed globally:
    npx serve

    # If you have it installed:
    serve
    ```
    Now, open your browser and navigate to the local address provided by the server (e.g., `http://localhost:3000`).

## ⚙️ How It Works

This application uses a unique approach by leveraging the **Google Gemini API** as its primary data source. Instead of hitting a traditional, structured weather API, it sends natural language prompts to Gemini.

-   **Weather Data Fetching**: A prompt like `"Provide the current weather and a 5-day forecast for London"` is sent to the Gemini API. A strict JSON schema is provided in the request to ensure the API returns a predictable, structured JSON object containing the weather data.
-   **City Suggestions**: Similarly, the type-ahead search feature sends a prompt like `"Provide a list of up to 5 city names that start with 'Lon'"` and receives a JSON array of city names in response.

This method demonstrates the power of modern LLMs to act as intelligent backends, generating structured data from natural language queries.

## 📁 File Structure

```
.
├── index.html          # The main HTML file and structure of the app.
├── index.css           # All styles, animations, and responsive design rules.
├── index.tsx           # Core application logic, API calls, DOM manipulation, and state management.
├── metadata.json       # Project metadata for a development environment.
└── README.md           # This file.
```
