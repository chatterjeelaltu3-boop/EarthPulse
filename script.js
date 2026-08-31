/* =========================================================
   EARTHPULSE
   STEP 5 — LOCATION + WEATHER
========================================================= */

const landingPage = document.getElementById("landingPage");
const dashboard = document.getElementById("dashboard");

const currentLocationBtn =
    document.getElementById("currentLocationBtn");

const myLocationBtn =
    document.getElementById("myLocationBtn");

const refreshBtn =
    document.getElementById("refreshBtn");

const searchBtn =
    document.getElementById("searchBtn");

const locationSearch =
    document.getElementById("locationSearch");

const dashboardSearchBtn =
    document.getElementById("dashboardSearchBtn");

const dashboardSearch =
    document.getElementById("dashboardSearch");

const locationMessage =
    document.getElementById("locationMessage");

const searchResults =
    document.getElementById("searchResults");

const dashboardSearchResults =
    document.getElementById("dashboardSearchResults");


let currentLatitude = null;
let currentLongitude = null;
let currentLocationName = "";



/* =========================================================
   API URLS
========================================================= */

const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";



/* =========================================================
   PAGE HELPERS
========================================================= */

function showDashboard() {

    landingPage.classList.add("hidden");

    dashboard.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}



function showLanding() {

    dashboard.classList.add("hidden");

    landingPage.classList.remove("hidden");

}



/* =========================================================
   CURRENT LOCATION
========================================================= */

function useCurrentLocation() {

    locationMessage.textContent =
        "📍 Detecting your current location...";

    if (!navigator.geolocation) {

        locationMessage.textContent =
            "❌ Geolocation is not supported by this browser.";

        return;

    }


    navigator.geolocation.getCurrentPosition(

        async function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            currentLatitude = latitude;

            currentLongitude = longitude;


            locationMessage.textContent =
                "📍 Location found. Loading weather...";


            try {

                const location =
                    await reverseGeocode(
                        latitude,
                        longitude
                    );


                currentLocationName =
                    location.name || "Current Location";


                showDashboard();


                await loadWeather(
                    latitude,
                    longitude,
                    location
                );


                locationMessage.textContent =
                    "";


            } catch (error) {

                console.error(error);

                locationMessage.textContent =
                    "❌ Unable to load weather information.";

            }

        },


        function(error) {

            console.error(error);


            if (error.code === 1) {

                locationMessage.textContent =
                    "❌ Location permission was denied. Please allow location access.";

            } else {

                locationMessage.textContent =
                    "❌ Unable to detect your location.";

            }

        },


        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );

}



/* =========================================================
   REVERSE GEOCODING
========================================================= */

async function reverseGeocode(
    latitude,
    longitude
) {

    const url =
        `${GEOCODING_API}?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;


    /*
       Open-Meteo geocoding endpoint does not provide
       reverse geocoding in every configuration.

       So we create a readable fallback location.
    */

    return {

        name: "Current Location",

        latitude: latitude,

        longitude: longitude

    };

}



/* =========================================================
   SEARCH LOCATION
========================================================= */

async function searchLocation(
    query,
    resultContainer
) {

    const search =
        query.trim();


    if (!search) {

        resultContainer.innerHTML = "";

        return;

    }


    resultContainer.innerHTML =
        `<div class="search-result-item">
            🔎 Searching for <strong>${escapeHTML(search)}</strong>...
        </div>`;


    try {

        const url =
            `${GEOCODING_API}?name=${encodeURIComponent(search)}&count=8&language=en&format=json`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Location search failed"
            );

        }


        const data =
            await response.json();


        resultContainer.innerHTML = "";


        if (
            !data.results ||
            data.results.length === 0
        ) {

            resultContainer.innerHTML =
                `<div class="search-result-item">
                    ❌ No location found.
                </div>`;

            return;

        }


        data.results.forEach(
            function(place) {

                const item =
                    document.createElement("div");


                item.className =
                    "search-result-item";


                const country =
                    place.country || "";


                const admin =
                    place.admin1 || "";


                item.innerHTML = `

                    <strong>
                        📍 ${escapeHTML(place.name)}
                    </strong>

                    <span>
                        ${escapeHTML(admin)}
                        ${admin && country ? ", " : ""}
                        ${escapeHTML(country)}
                    </span>

                `;


                item.addEventListener(
                    "click",
                    function() {

                        resultContainer.innerHTML = "";

                        loadSelectedLocation(place);

                    }
                );


                resultContainer.appendChild(item);

            }
        );


    } catch (error) {

        console.error(error);


        resultContainer.innerHTML =
            `<div class="search-result-item">
                ❌ Unable to search location.
            </div>`;

    }

}



/* =========================================================
   LOAD SELECTED LOCATION
========================================================= */

async function loadSelectedLocation(place) {

    currentLatitude =
        place.latitude;

    currentLongitude =
        place.longitude;


    currentLocationName =
        place.name;


    const location = {

        name: place.name,

        country: place.country || "",

        admin1: place.admin1 || "",

        latitude: place.latitude,

        longitude: place.longitude

    };


    showDashboard();


    await loadWeather(
        place.latitude,
        place.longitude,
        location
    );

}



/* =========================================================
   LOAD WEATHER
========================================================= */

async function loadWeather(
    latitude,
    longitude,
    location
) {

    setLoadingState();


    try {

        const url =
            `${WEATHER_API}?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,visibility,uv_index` +
            `&hourly=temperature_2m,precipitation_probability,rain,weather_code,wind_speed_10m` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max` +
            `&timezone=auto` +
            `&forecast_days=7`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Weather API request failed"
            );

        }


        const data =
            await response.json();


        updateLocationInformation(
            location,
            data
        );


        updateCurrentWeather(
            data
        );


        updateHourlyForecast(
            data
        );


        updateDailyForecast(
            data
        );


        updateSunInformation(
            data
        );


        updateUV(
            data
        );


    } catch (error) {

        console.error(error);

        showWeatherError();

    }

}



/* =========================================================
   LOCATION INFORMATION
========================================================= */

function updateLocationInformation(
    location,
    data
) {

    const locationName =
        document.getElementById(
            "locationName"
        );


    const locationDetails =
        document.getElementById(
            "locationDetails"
        );


    const localDateTime =
        document.getElementById(
            "localDateTime"
        );


    if (locationName) {

        locationName.textContent =
            location.name || "Unknown Location";

    }


    if (locationDetails) {

        const parts = [];


        if (location.admin1) {

            parts.push(
                location.admin1
            );

        }


        if (location.country) {

            parts.push(
                location.country
            );

        }


        locationDetails.textContent =
            parts.join(", ");

    }


    if (
        localDateTime &&
        data.current &&
        data.current.time
    ) {

        localDateTime.textContent =
            formatDateTime(
                data.current.time
            );

    }

}



/* =========================================================
   CURRENT WEATHER
========================================================= */

function updateCurrentWeather(data) {

    const current =
        data.current;


    if (!current) return;


    setText(
        "temperature",
        round(current.temperature_2m)
    );


    setText(
        "feelsLike",
        round(current.apparent_temperature)
    );


    setText(
        "humidity",
        `${round(current.relative_humidity_2m)}%`
    );


    setText(
        "rain",
        `${round(current.precipitation)} mm`
    );


    setText(
        "wind",
        `${round(current.wind_speed_10m)} km/h`
    );


    setText(
        "clouds",
        `${round(current.cloud_cover)}%`
    );


    setText(
        "windDirection",
        `${round(current.wind_direction_10m)}°`
    );


    setText(
        "visibility",
        `${(current.visibility / 1000).toFixed(1)} km`
    );


    setText(
        "pressure",
        `${round(current.pressure_msl)} hPa`
    );


    const condition =
        weatherCodeToText(
            current.weather_code
        );


    setText(
        "weatherCondition",
        condition
    );


    setText(
        "weatherIcon",
        weatherCodeToEmoji(
            current.weather_code,
            current.is_day
        )
    );

}



/* =========================================================
   HOURLY FORECAST
========================================================= */

function updateHourlyForecast(data) {

    const container =
        document.getElementById(
            "hourlyForecast"
        );


    if (!container) return;


    const hourly =
        data.hourly;


    if (!hourly) {

        container.innerHTML =
            `<div class="loading-message">
                Hourly forecast unavailable.
            </div>`;

        return;

    }


    container.innerHTML = "";


    const currentTime =
        data.current?.time;


    let startIndex = 0;


    if (currentTime) {

        const index =
            hourly.time.indexOf(
                currentTime
            );


        if (index >= 0) {

            startIndex = index;

        }

    }


    const hoursToShow = 12;


    for (
        let i = startIndex;
        i < Math.min(
            startIndex + hoursToShow,
            hourly.time.length
        );
        i++
    ) {


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "hour-card";


        const time =
            new Date(
                hourly.time[i]
            );


        const hourText =
            time.toLocaleTimeString(
                "en-IN",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );


        const weatherCode =
            hourly.weather_code[i];


        const temperature =
            hourly.temperature_2m[i];


        const rainProbability =
            hourly.precipitation_probability[i];


        card.innerHTML = `

            <div class="hour">
                ${hourText}
            </div>

            <div class="hour-icon">
                ${weatherCodeToEmoji(weatherCode, 1)}
            </div>

            <div class="hour-temp">
                ${round(temperature)}°C
            </div>

            <div class="rain-probability">
                🌧 ${rainProbability ?? 0}%
            </div>

        `;


        container.appendChild(card);

    }

}



/* =========================================================
   DAILY FORECAST
========================================================= */

function updateDailyForecast(data) {

    const container =
        document.getElementById(
            "dailyForecast"
        );


    if (!container) return;


    const daily =
        data.daily;


    if (!daily) return;


    container.innerHTML = "";


    for (
        let i = 0;
        i < daily.time.length;
        i++
    ) {


        const date =
            new Date(
                `${daily.time[i]}T12:00:00`
            );


        const dayName =
            i === 0
                ? "Today"
                : date.toLocaleDateString(
                    "en-IN",
                    {
                        weekday: "short"
                    }
                );


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "daily-card";


        card.innerHTML = `

            <div class="day">
                ${dayName}
            </div>

            <div class="daily-icon">
                ${weatherCodeToEmoji(
                    daily.weather_code[i],
                    1
                )}
            </div>

            <div class="daily-condition">
                ${weatherCodeToText(
                    daily.weather_code[i]
                )}
            </div>

            <div class="daily-temp">
                ${round(
                    daily.temperature_2m_max[i]
                )}° /
                ${round(
                    daily.temperature_2m_min[i]
                )}°
            </div>

            <div class="daily-rain">
                🌧
                ${daily.precipitation_probability_max[i] ?? 0}%
            </div>

        `;


        container.appendChild(card);

    }

}



/* =========================================================
   SUN INFORMATION
========================================================= */

function updateSunInformation(data) {

    const daily =
        data.daily;


    if (!daily) return;


    if (daily.sunrise?.[0]) {

        setText(
            "sunrise",
            formatTime(
                daily.sunrise[0]
            )
        );

    }


    if (daily.sunset?.[0]) {

        setText(
            "sunset",
            formatTime(
                daily.sunset[0]
            )
        );

    }


    if (data.current?.time) {

        setText(
            "dashboardLocalTime",
            formatTime(
                data.current.time
            )
        );

    }

}



/* =========================================================
   UV INDEX
========================================================= */

function updateUV(data) {

    const uv =
        data.current?.uv_index;


    if (uv === undefined) return;


    setText(
        "uvIndex",
        uv.toFixed(1)
    );


    setText(
        "uvLarge",
        uv.toFixed(1)
    );


    let status =
        "Low";


    if (uv >= 3 && uv < 6) {

        status =
            "Moderate";

    } else if (uv >= 6 && uv < 8) {

        status =
            "High";

    } else if (uv >= 8 && uv < 11) {

        status =
            "Very High";

    } else if (uv >= 11) {

        status =
            "Extreme";

    }


    setText(
        "uvStatus",
        status
    );

}



/* =========================================================
   LOADING STATE
========================================================= */

function setLoadingState() {

    setText(
        "locationName",
        "Loading..."
    );


    setText(
        "locationDetails",
        "Getting location information..."
    );


    setText(
        "temperature",
        "--"
    );


    setText(
        "weatherCondition",
        "Loading weather..."
    );

}



/* =========================================================
   ERROR STATE
========================================================= */

function showWeatherError() {

    setText(
        "locationName",
        "Unable to load weather"
    );


    setText(
        "locationDetails",
        "Please check your internet connection and try again."
    );


    setText(
        "weatherCondition",
        "Weather unavailable"
    );

}



/* =========================================================
   WEATHER CODE → TEXT
========================================================= */

function weatherCodeToText(code) {

    const weatherMap = {

        0: "Clear Sky",

        1: "Mainly Clear",

        2: "Partly Cloudy",

        3: "Overcast",

        45: "Fog",

        48: "Rime Fog",

        51: "Light Drizzle",

        53: "Moderate Drizzle",

        55: "Dense Drizzle",

        56: "Freezing Drizzle",

        57: "Dense Freezing Drizzle",

        61: "Light Rain",

        63: "Moderate Rain",

        65: "Heavy Rain",

        66: "Freezing Rain",

        67: "Heavy Freezing Rain",

        71: "Light Snow",

        73: "Moderate Snow",

        75: "Heavy Snow",

        77: "Snow Grains",

        80: "Light Rain Showers",

        81: "Moderate Rain Showers",

        82: "Violent Rain Showers",

        85: "Light Snow Showers",

        86: "Heavy Snow Showers",

        95: "Thunderstorm",

        96: "Thunderstorm with Hail",

        99: "Severe Thunderstorm"

    };


    return (
        weatherMap[code] ||
        "Unknown Weather"
    );

}



/* =========================================================
   WEATHER CODE → EMOJI
========================================================= */

function weatherCodeToEmoji(
    code,
    isDay = 1
) {

    if (code === 0) {

        return isDay
            ? "☀️"
            : "🌙";

    }


    if (
        code === 1 ||
        code === 2
    ) {

        return isDay
            ? "🌤️"
            : "🌙";

    }


    if (code === 3) {

        return "☁️";

    }


    if (
        code === 45 ||
        code === 48
    ) {

        return "🌫️";

    }


    if (
        code >= 51 &&
        code <= 57
    ) {

        return "🌦️";

    }


    if (
        code >= 61 &&
        code <= 67
    ) {

        return "🌧️";

    }


    if (
        code >= 71 &&
        code <= 77
    ) {

        return "🌨️";

    }


    if (
        code >= 80 &&
        code <= 82
    ) {

        return "🌦️";

    }


    if (
        code >= 85 &&
        code <= 86
    ) {

        return "🌨️";

    }


    if (code >= 95) {

        return "⛈️";

    }


    return "🌍";

}



/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}



function round(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return "--";

    }


    return Math.round(
        Number(value)
    );

}



function formatTime(
    value
) {

    if (!value) return "--";


    const date =
        new Date(value);


    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );

}



function formatDateTime(
    value
) {

    if (!value) return "--";


    const date =
        new Date(value);


    return date.toLocaleString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );

}



/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHTML(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



/* =========================================================
   EVENT LISTENERS
========================================================= */

if (currentLocationBtn) {

    currentLocationBtn.addEventListener(
        "click",
        useCurrentLocation
    );

}


if (myLocationBtn) {

    myLocationBtn.addEventListener(
        "click",
        useCurrentLocation
    );

}


if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        function() {

            if (
                currentLatitude !== null &&
                currentLongitude !== null
            ) {

                loadWeather(
                    currentLatitude,
                    currentLongitude,
                    {
                        name:
                            currentLocationName
                    }
                );

            }

        }
    );

}


if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        function() {

            searchLocation(
                locationSearch.value,
                searchResults
            );

        }
    );

}


if (locationSearch) {

    locationSearch.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                searchLocation(
                    locationSearch.value,
                    searchResults
                );

            }

        }
    );

}


if (dashboardSearchBtn) {

    dashboardSearchBtn.addEventListener(
        "click",
        function() {

            searchLocation(
                dashboardSearch.value,
                dashboardSearchResults
            );

        }
    );

}


if (dashboardSearch) {

    dashboardSearch.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                searchLocation(
                    dashboardSearch.value,
                    dashboardSearchResults
                );

            }

        }
    );

}


/* =========================================================
   INITIAL STATE
========================================================= */

showLanding();
