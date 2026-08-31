/* =========================================================
   EARTHPULSE
   GLOBAL WEATHER & EARTH MONITOR
   STEP 6 — FINAL SCRIPT
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const landingPage =
    document.getElementById("landingPage");

const dashboard =
    document.getElementById("dashboard");

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

const searchResults =
    document.getElementById("searchResults");

const dashboardSearch =
    document.getElementById("dashboardSearch");

const dashboardSearchBtn =
    document.getElementById("dashboardSearchBtn");

const dashboardSearchResults =
    document.getElementById("dashboardSearchResults");

const locationMessage =
    document.getElementById("locationMessage");


/* =========================================================
   VARIABLES
========================================================= */

let currentLatitude = null;
let currentLongitude = null;

let currentLocationName =
    "Current Location";

let currentLocationData = null;

let temperatureChart = null;
let rainChart = null;


/* =========================================================
   API
========================================================= */

const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

const AIR_QUALITY_API =
    "https://air-quality-api.open-meteo.com/v1/air-quality";

const EARTHQUAKE_API =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";


/* =========================================================
   INITIAL PAGE
========================================================= */

function showLandingPage() {

    if (landingPage) {

        landingPage.classList.remove("hidden");

    }

    if (dashboard) {

        dashboard.classList.add("hidden");

    }

}


function showDashboard() {

    if (landingPage) {

        landingPage.classList.add("hidden");

    }

    if (dashboard) {

        dashboard.classList.remove("hidden");

    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   CURRENT LOCATION
========================================================= */

function useCurrentLocation() {

    if (!navigator.geolocation) {

        showLocationMessage(
            "❌ Your browser does not support location."
        );

        return;

    }


    showLocationMessage(
        "📍 Detecting your current location..."
    );


    navigator.geolocation.getCurrentPosition(

        async function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            currentLatitude =
                latitude;

            currentLongitude =
                longitude;


            try {

                const location =
                    await reverseGeocode(
                        latitude,
                        longitude
                    );


                currentLocationData =
                    location;


                currentLocationName =
                    location.name ||
                    "Current Location";


                showDashboard();


                await loadAllData(
                    latitude,
                    longitude,
                    location
                );


                showLocationMessage("");

            }

            catch (error) {

                console.error(error);

                showLocationMessage(
                    "❌ Could not load weather data."
                );

            }

        },

        function(error) {

            console.error(error);


            if (error.code === 1) {

                showLocationMessage(
                    "❌ Location permission denied. Please allow location access."
                );

            }

            else if (error.code === 2) {

                showLocationMessage(
                    "❌ Your location could not be detected."
                );

            }

            else if (error.code === 3) {

                showLocationMessage(
                    "❌ Location request timed out."
                );

            }

            else {

                showLocationMessage(
                    "❌ Unable to detect your location."
                );

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

    try {

        const response =
            await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
            );


        if (!response.ok) {

            throw new Error(
                "Reverse geocoding failed"
            );

        }


        const data =
            await response.json();


        const address =
            data.address || {};


        return {

            name:
                address.city ||
                address.town ||
                address.village ||
                address.municipality ||
                address.county ||
                "Current Location",

            country:
                address.country || "",

            admin1:
                address.state || "",

            latitude:
                latitude,

            longitude:
                longitude

        };

    }

    catch (error) {

        console.error(error);


        return {

            name: "Current Location",

            country: "",

            admin1: "",

            latitude: latitude,

            longitude: longitude

        };

    }

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


    resultContainer.innerHTML = `
        <div class="search-result-item">
            🔎 Searching for
            <strong>${escapeHTML(search)}</strong>...
        </div>
    `;


    try {

        const url =
            `${GEOCODING_API}?name=${encodeURIComponent(search)}&count=8&language=en&format=json`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Search request failed"
            );

        }


        const data =
            await response.json();


        resultContainer.innerHTML = "";


        if (
            !data.results ||
            data.results.length === 0
        ) {

            resultContainer.innerHTML = `
                <div class="search-result-item">
                    ❌ No location found.
                </div>
            `;

            return;

        }


        data.results.forEach(
            function(place) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "search-result-item";


                const admin =
                    place.admin1 || "";


                const country =
                    place.country || "";


                item.innerHTML = `

                    <strong>
                        📍 ${escapeHTML(place.name)}
                    </strong>

                    <span>
                        ${escapeHTML(admin)}
                        ${
                            admin && country
                                ? ", "
                                : ""
                        }
                        ${escapeHTML(country)}
                    </span>

                `;


                item.addEventListener(
                    "click",
                    function() {

                        resultContainer.innerHTML = "";

                        if (
                            locationSearch
                        ) {

                            locationSearch.value = "";

                        }

                        if (
                            dashboardSearch
                        ) {

                            dashboardSearch.value = "";

                        }


                        loadSelectedLocation(
                            place
                        );

                    }
                );


                resultContainer.appendChild(
                    item
                );

            }
        );

    }

    catch (error) {

        console.error(error);


        resultContainer.innerHTML = `
            <div class="search-result-item">
                ❌ Location search failed.
            </div>
        `;

    }

}


/* =========================================================
   SELECT SEARCH RESULT
========================================================= */

async function loadSelectedLocation(
    place
) {

    currentLatitude =
        Number(place.latitude);

    currentLongitude =
        Number(place.longitude);


    currentLocationName =
        place.name;


    currentLocationData = {

        name:
            place.name,

        country:
            place.country || "",

        admin1:
            place.admin1 || "",

        latitude:
            Number(place.latitude),

        longitude:
            Number(place.longitude)

    };


    showDashboard();


    await loadAllData(
        currentLatitude,
        currentLongitude,
        currentLocationData
    );

}


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function loadAllData(
    latitude,
    longitude,
    location
) {

    setLoadingState();


    try {

        await loadWeather(
            latitude,
            longitude,
            location
        );

    }

    catch (error) {

        console.error(
            "Weather error:",
            error
        );

        showWeatherError();

    }


    try {

        await loadAirQuality(
            latitude,
            longitude
        );

    }

    catch (error) {

        console.error(
            "Air quality error:",
            error
        );

        showAirQualityError();

    }


    try {

        await loadEarthquakes();

    }

    catch (error) {

        console.error(
            "Earthquake error:",
            error
        );

        showEarthquakeError();

    }


    saveRecentSearch(
        location
    );

}


/* =========================================================
   WEATHER
========================================================= */

async function loadWeather(
    latitude,
    longitude,
    location
) {

    const url =
        `${WEATHER_API}` +
        `?latitude=${latitude}` +
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
            "Weather API failed"
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


    createTemperatureChart(
        data
    );


    createRainChart(
        data
    );

}


/* =========================================================
   LOCATION INFORMATION
========================================================= */

function updateLocationInformation(
    location,
    data
) {

    setText(
        "locationName",
        location.name ||
        "Unknown Location"
    );


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


    setText(
        "locationDetails",
        parts.join(", ")
    );


    if (
        data.current &&
        data.current.time
    ) {

        setText(
            "localDateTime",
            formatDateTime(
                data.current.time
            )
        );

    }

}


/* =========================================================
   CURRENT WEATHER
========================================================= */

function updateCurrentWeather(
    data
) {

    const current =
        data.current;


    if (!current) return;


    setText(
        "temperature",
        round(
            current.temperature_2m
        )
    );


    setText(
        "feelsLike",
        round(
            current.apparent_temperature
        )
    );


    setText(
        "humidity",
        `${round(
            current.relative_humidity_2m
        )}%`
    );


    setText(
        "rain",
        `${round(
            current.rain
        )} mm`
    );


    setText(
        "wind",
        `${round(
            current.wind_speed_10m
        )} km/h`
    );


    setText(
        "clouds",
        `${round(
            current.cloud_cover
        )}%`
    );


    setText(
        "windDirection",
        `${round(
            current.wind_direction_10m
        )}°`
    );


    setText(
        "visibility",
        `${(
            Number(
                current.visibility
            ) / 1000
        ).toFixed(1)} km`
    );


    setText(
        "pressure",
        `${round(
            current.pressure_msl
        )} hPa`
    );


    setText(
        "weatherCondition",
        weatherCodeToText(
            current.weather_code
        )
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
   HOURLY
========================================================= */

function updateHourlyForecast(
    data
) {

    const container =
        document.getElementById(
            "hourlyForecast"
        );


    if (!container) return;


    const hourly =
        data.hourly;


    if (!hourly) return;


    container.innerHTML = "";


    let startIndex = 0;


    if (data.current?.time) {

        const index =
            hourly.time.indexOf(
                data.current.time
            );


        if (index >= 0) {

            startIndex =
                index;

        }

    }


    const count =
        Math.min(
            startIndex + 12,
            hourly.time.length
        );


    for (
        let i = startIndex;
        i < count;
        i++
    ) {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "hour-card";


        const date =
            new Date(
                hourly.time[i]
            );


        const hour =
            date.toLocaleTimeString(
                "en-IN",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            );


        const temperature =
            hourly.temperature_2m[i];


        const rainProbability =
            hourly.precipitation_probability[i];


        card.innerHTML = `

            <div class="hour">
                ${hour}
            </div>

            <div class="hour-icon">
                ${weatherCodeToEmoji(
                    hourly.weather_code[i],
                    1
                )}
            </div>

            <div class="hour-temp">
                ${round(temperature)}°C
            </div>

            <div class="rain-probability">
                🌧 ${rainProbability ?? 0}%
            </div>

        `;


        container.appendChild(
            card
        );

    }

}


/* =========================================================
   DAILY FORECAST
========================================================= */

function updateDailyForecast(
    data
) {

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


        const day =
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
                ${day}
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
                ${
                    daily
                        .precipitation_probability_max[i]
                    ?? 0
                }%
            </div>

        `;


        container.appendChild(
            card
        );

    }

}


/* =========================================================
   SUN
========================================================= */

function updateSunInformation(
    data
) {

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
   UV
========================================================= */

function updateUV(
    data
) {

    const uv =
        data.current?.uv_index;


    if (
        uv === undefined ||
        uv === null
    ) {

        return;

    }


    setText(
        "uvIndex",
        Number(uv).toFixed(1)
    );


    setText(
        "uvLarge",
        Number(uv).toFixed(1)
    );


    let status =
        "Low";


    if (uv >= 3 && uv < 6) {

        status =
            "Moderate";

    }

    else if (uv >= 6 && uv < 8) {

        status =
            "High";

    }

    else if (uv >= 8 && uv < 11) {

        status =
            "Very High";

    }

    else if (uv >= 11) {

        status =
            "Extreme";

    }


    setText(
        "uvStatus",
        status
    );

}


/* =========================================================
   TEMPERATURE CHART
========================================================= */

function createTemperatureChart(
    data
) {

    const canvas =
        document.getElementById(
            "temperatureChart"
        );


    if (!canvas) return;


    if (
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    if (temperatureChart) {

        temperatureChart.destroy();

    }


    const hourly =
        data.hourly;


    let startIndex = 0;


    if (data.current?.time) {

        const index =
            hourly.time.indexOf(
                data.current.time
            );


        if (index >= 0) {

            startIndex =
                index;

        }

    }


    const endIndex =
        Math.min(
            startIndex + 12,
            hourly.time.length
        );


    const labels = [];
    const temperatures = [];


    for (
        let i = startIndex;
        i < endIndex;
        i++
    ) {

        const date =
            new Date(
                hourly.time[i]
            );


        labels.push(
            date.toLocaleTimeString(
                "en-IN",
                {
                    hour: "numeric"
                }
            )
        );


        temperatures.push(
            hourly.temperature_2m[i]
        );

    }


    temperatureChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Temperature °C",

                            data:
                                temperatures,

                            tension:
                                0.35,

                            fill:
                                false

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display: true

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero:
                                false

                        }

                    }

                }

            }
        );

}


/* =========================================================
   RAIN CHART
========================================================= */

function createRainChart(
    data
) {

    const canvas =
        document.getElementById(
            "rainChart"
        );


    if (!canvas) return;


    if (
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    if (rainChart) {

        rainChart.destroy();

    }


    const hourly =
        data.hourly;


    let startIndex = 0;


    if (data.current?.time) {

        const index =
            hourly.time.indexOf(
                data.current.time
            );


        if (index >= 0) {

            startIndex =
                index;

        }

    }


    const endIndex =
        Math.min(
            startIndex + 12,
            hourly.time.length
        );


    const labels = [];
    const rain = [];


    for (
        let i = startIndex;
        i < endIndex;
        i++
    ) {

        const date =
            new Date(
                hourly.time[i]
            );


        labels.push(
            date.toLocaleTimeString(
                "en-IN",
                {
                    hour: "numeric"
                }
            )
        );


        rain.push(
            hourly
                .precipitation_probability[i]
                ?? 0
        );

    }


    rainChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Rain Probability %",

                            data:
                                rain

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            max: 100

                        }

                    }

                }

            }
        );

}


/* =========================================================
   AIR QUALITY
========================================================= */

async function loadAirQuality(
    latitude,
    longitude
) {

    const url =
        `${AIR_QUALITY_API}` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide` +
        `&timezone=auto`;


    const response =
        await fetch(url);


    if (!response.ok) {

        throw new Error(
            "Air quality API failed"
        );

    }


    const data =
        await response.json();


    const current =
        data.current;


    if (!current) return;


    setText(
        "aqi",
        round(
            current.us_aqi
        )
    );


    setText(
        "pm25",
        `${Number(
            current.pm2_5 ?? 0
        ).toFixed(1)}`
    );


    setText(
        "pm10",
        `${Number(
            current.pm10 ?? 0
        ).toFixed(1)}`
    );


    setText(
        "ozone",
        `${Number(
            current.ozone ?? 0
        ).toFixed(1)}`
    );


    setText(
        "no2",
        `${Number(
            current.nitrogen_dioxide ?? 0
        ).toFixed(1)}`
    );


    setText(
        "aqiStatus",
        getAQIStatus(
            current.us_aqi
        )
    );

}


/* =========================================================
   AQI STATUS
========================================================= */

function getAQIStatus(
    aqi
) {

    if (aqi === null || aqi === undefined) {

        return "--";

    }


    if (aqi <= 50) {

        return "Good";

    }


    if (aqi <= 100) {

        return "Moderate";

    }


    if (aqi <= 150) {

        return "Unhealthy for Sensitive Groups";

    }


    if (aqi <= 200) {

        return "Unhealthy";

    }


    if (aqi <= 300) {

        return "Very Unhealthy";

    }


    return "Hazardous";

}


/* =========================================================
   EARTHQUAKES
========================================================= */

async function loadEarthquakes() {

    const container =
        document.getElementById(
            "earthquakeList"
        );


    if (!container) return;


    const response =
        await fetch(
            EARTHQUAKE_API
        );


    if (!response.ok) {

        throw new Error(
            "Earthquake API failed"
        );

    }


    const data =
        await response.json();


    const features =
        data.features || [];


    container.innerHTML = "";


    if (
        features.length === 0
    ) {

        container.innerHTML = `
            <div class="loading-message">
                No recent earthquake information available.
            </div>
        `;

        return;

    }


    const recent =
        features.slice(
            0,
            8
        );


    recent.forEach(
        function(quake) {

            const properties =
                quake.properties;


            const magnitude =
                properties.mag;


            const place =
                properties.place ||
                "Unknown location";


            const time =
                properties.time
                    ? new Date(
                        properties.time
                    )
                    : null;


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "earthquake-item";


            item.innerHTML = `

                <div class="magnitude">
                    M ${magnitude !== null
                        ? Number(magnitude).toFixed(1)
                        : "--"}
                </div>

                <div>

                    <div class="event-location">
                        ${escapeHTML(place)}
                    </div>

                    <div class="event-meta">
                        USGS earthquake monitoring
                    </div>

                </div>

                <div class="event-time">
                    ${
                        time
                            ? time.toLocaleString(
                                "en-IN"
                            )
                            : "--"
                    }
                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   STORM / ALERTS
========================================================= */

function updateStormInformation(
    data
) {

    const container =
        document.getElementById(
            "stormAlerts"
        );


    if (!container) return;


    const code =
        data.current?.weather_code;


    if (
        code === 95 ||
        code === 96 ||
        code === 99
    ) {

        container.className =
            "alert-box danger";


        container.innerHTML = `
            ⚠️ <strong>Thunderstorm conditions detected.</strong>
            <br>
            Please monitor local weather warnings.
        `;

        return;

    }


    if (
        code >= 80 &&
        code <= 82
    ) {

        container.className =
            "alert-box warning";


        container.innerHTML = `
            🌧️ <strong>Heavy rain shower conditions.</strong>
            <br>
            Keep monitoring local weather conditions.
        `;

        return;

    }


    container.className =
        "alert-box";


    container.innerHTML = `
        ✅ <strong>No major severe-weather condition detected by the current weather data.</strong>
        <br>
        Always follow official local weather warnings during severe conditions.
    `;

}


/* =========================================================
   AIR QUALITY ERROR
========================================================= */

function showAirQualityError() {

    setText(
        "aqi",
        "--"
    );

    setText(
        "pm25",
        "--"
    );

    setText(
        "pm10",
        "--"
    );

    setText(
        "ozone",
        "--"
    );

    setText(
        "no2",
        "--"
    );

    setText(
        "aqiStatus",
        "Unavailable"
    );

}


/* =========================================================
   EARTHQUAKE ERROR
========================================================= */

function showEarthquakeError() {

    const container =
        document.getElementById(
            "earthquakeList"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading-message">
            Earthquake data is currently unavailable.
        </div>
    `;

}


/* =========================================================
   LOADING
========================================================= */

function setLoadingState() {

    setText(
        "locationName",
        "Loading location..."
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
        "feelsLike",
        "--"
    );


    setText(
        "weatherCondition",
        "Loading weather..."
    );


    setText(
        "humidity",
        "--%"
    );


    setText(
        "rain",
        "-- mm"
    );


    setText(
        "wind",
        "-- km/h"
    );


    setText(
        "clouds",
        "--%"
    );


    setText(
        "windDirection",
        "--"
    );


    setText(
        "visibility",
        "-- km"
    );


    setText(
        "pressure",
        "-- hPa"
    );


    setText(
        "uvIndex",
        "--"
    );


    setText(
        "uvLarge",
        "--"
    );


    setText(
        "uvStatus",
        "Checking..."
    );

}


/* =========================================================
   WEATHER ERROR
========================================================= */

function showWeatherError() {

    setText(
        "locationName",
        "Weather unavailable"
    );


    setText(
        "locationDetails",
        "Please check your internet connection."
    );


    setText(
        "weatherCondition",
        "Unable to load weather"
    );

}


/* =========================================================
   WEATHER CODE TEXT
========================================================= */

function weatherCodeToText(
    code
) {

    const map = {

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

        82: "Heavy Rain Showers",

        85: "Light Snow Showers",

        86: "Heavy Snow Showers",

        95: "Thunderstorm",

        96: "Thunderstorm with Hail",

        99: "Severe Thunderstorm"

    };


    return (
        map[code] ||
        "Unknown Weather"
    );

}


/* =========================================================
   WEATHER EMOJI
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
   RECENT SEARCH
========================================================= */

function saveRecentSearch(
    location
) {

    try {

        let history =
            JSON.parse(
                localStorage.getItem(
                    "earthpulseRecentSearches"
                )
            ) || [];


        const newLocation = {

            name:
                location.name,

            country:
                location.country || "",

            admin1:
                location.admin1 || "",

            latitude:
                location.latitude,

            longitude:
                location.longitude

        };


        history =
            history.filter(
                function(item) {

                    return !(
                        item.name ===
                        newLocation.name
                    );

                }
            );


        history.unshift(
            newLocation
        );


        history =
            history.slice(
                0,
                8
            );


        localStorage.setItem(
            "earthpulseRecentSearches",
            JSON.stringify(history)
        );


        displayRecentSearches();

    }

    catch (error) {

        console.error(error);

    }

}


/* =========================================================
   DISPLAY RECENT SEARCH
========================================================= */

function displayRecentSearches() {

    const container =
        document.getElementById(
            "recentSearches"
        );


    if (!container) return;


    let history = [];


    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    "earthpulseRecentSearches"
                )
            ) || [];

    }

    catch {

        history = [];

    }


    if (
        history.length === 0
    ) {

        container.innerHTML =
            "<p>No recent searches.</p>";

        return;

    }


    container.innerHTML = "";


    history.forEach(
        function(item) {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "recent-item";


            button.type =
                "button";


            button.textContent =
                `📍 ${item.name}`;


            button.addEventListener(
                "click",
                function() {

                    loadSelectedLocation(
                        item
                    );

                }
            );


            container.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   FAVORITES
========================================================= */

function getFavorites() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "earthpulseFavorites"
            )
        ) || [];

    }

    catch {

        return [];

    }

}


function saveFavorites(
    favorites
) {

    localStorage.setItem(
        "earthpulseFavorites",
        JSON.stringify(
            favorites
        )
    );

}


function addCurrentFavorite() {

    if (
        !currentLocationData
    ) {

        return;

    }


    const favorites =
        getFavorites();


    const exists =
        favorites.some(
            function(item) {

                return (
                    item.name ===
                    currentLocationData.name
                );

            }
        );


    if (exists) {

        alert(
            "This location is already in your favorites."
        );

        return;

    }


    favorites.push(
        currentLocationData
    );


    saveFavorites(
        favorites
    );


    displayFavorites();

}


function displayFavorites() {

    const container =
        document.getElementById(
            "favoritesList"
        );


    if (!container) return;


    const favorites =
        getFavorites();


    if (
        favorites.length === 0
    ) {

        container.innerHTML =
            "<p>No favorite locations yet.</p>";

        return;

    }


    container.innerHTML = "";


    favorites.forEach(
        function(item) {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "favorite-item";


            button.type =
                "button";


            button.textContent =
                `⭐ ${item.name}`;


            button.addEventListener(
                "click",
                function() {

                    loadSelectedLocation(
                        item
                    );

                }
            );


            container.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   CLEAR HISTORY
========================================================= */

function clearHistory() {

    localStorage.removeItem(
        "earthpulseRecentSearches"
    );


    displayRecentSearches();

}


/* =========================================================
   UTILITIES
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


function round(
    value
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(
            Number(value)
        )
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

    if (!value) {

        return "--";

    }


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

    if (!value) {

        return "--";

    }


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


function escapeHTML(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


function showLocationMessage(
    message
) {

    if (locationMessage) {

        locationMessage.textContent =
            message;

    }

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

                loadAllData(
                    currentLatitude,
                    currentLongitude,
                    currentLocationData || {
                        name:
                            currentLocationName,

                        latitude:
                            currentLatitude,

                        longitude:
                            currentLongitude

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


const addFavoriteBtn =
    document.getElementById(
        "addFavoriteBtn"
    );


if (addFavoriteBtn) {

    addFavoriteBtn.addEventListener(
        "click",
        addCurrentFavorite
    );

}


const clearHistoryBtn =
    document.getElementById(
        "clearHistoryBtn"
    );


if (clearHistoryBtn) {

    clearHistoryBtn.addEventListener(
        "click",
        clearHistory
    );

}


/* =========================================================
   START
========================================================= */

displayFavorites();

displayRecentSearches();

showLandingPage();
