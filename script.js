/* =====================================================
   EARTHPULSE
   Global Weather + Location + Earthquake Map
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let selectedLocation = null;

let map = null;
let selectedMarker = null;

let earthquakeLayer = null;
let temperatureLayer = null;

let satelliteLayer = null;
let labelsLayer = null;

let temperatureChart = null;
let rainChart = null;

let lastWeatherData = null;

let locationWatchId = null;

let favorites = JSON.parse(
    localStorage.getItem("earthpulseFavorites") || "[]"
);

let recentSearches = JSON.parse(
    localStorage.getItem("earthpulseRecent") || "[]"
);


/* =====================================================
   API
===================================================== */

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

const AIR_API =
    "https://air-quality-api.open-meteo.com/v1/air-quality";

const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const NOMINATIM_API =
    "https://nominatim.openstreetmap.org/search";

const EARTHQUAKE_API =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";


/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeMap();

    setupButtons();

    renderFavorites();

    renderRecentSearches();

});


/* =====================================================
   BUTTONS
===================================================== */

function setupButtons() {

    const currentLocationBtn =
        document.getElementById("currentLocationBtn");

    const myLocationBtn =
        document.getElementById("myLocationBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const mapMyLocation =
        document.getElementById("mapMyLocation");

    const searchBtn =
        document.getElementById("searchBtn");

    const dashboardSearchBtn =
        document.getElementById("dashboardSearchBtn");

    const locationSearch =
        document.getElementById("locationSearch");

    const dashboardSearch =
        document.getElementById("dashboardSearch");

    const addFavoriteBtn =
        document.getElementById("addFavoriteBtn");

    const clearHistoryBtn =
        document.getElementById("clearHistoryBtn");


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


    if (mapMyLocation) {

        mapMyLocation.addEventListener(
            "click",
            useCurrentLocation
        );

    }


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            () => {

                if (selectedLocation) {

                    loadLocationData(
                        selectedLocation,
                        true
                    );

                }

            }
        );

    }


    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            () => searchLocation(
                locationSearch?.value || ""
            )
        );

    }


    if (dashboardSearchBtn) {

        dashboardSearchBtn.addEventListener(
            "click",
            () => searchLocation(
                dashboardSearch?.value || ""
            )
        );

    }


    if (locationSearch) {

        locationSearch.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    searchLocation(
                        locationSearch.value
                    );

                }

            }
        );

    }


    if (dashboardSearch) {

        dashboardSearch.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    searchLocation(
                        dashboardSearch.value
                    );

                }

            }
        );

    }


    if (addFavoriteBtn) {

        addFavoriteBtn.addEventListener(
            "click",
            addFavorite
        );

    }


    if (clearHistoryBtn) {

        clearHistoryBtn.addEventListener(
            "click",
            clearHistory
        );

    }


    document.querySelectorAll(".map-control").forEach(
        button => {

            if (button.id === "mapMyLocation") {
                return;
            }

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".map-control")
                        .forEach(
                            b => b.classList.remove("active")
                        );

                    button.classList.add("active");

                    const layer =
                        button.dataset.layer;

                    changeMapLayer(layer);

                }
            );

        }
    );

}


/* =====================================================
   MAP INITIALIZATION
===================================================== */

function initializeMap() {

    const mapElement =
        document.getElementById("map");

    if (!mapElement) return;


    map = L.map(
        "map",
        {
            zoomControl: false,
            worldCopyJump: true,
            minZoom: 2,
            maxZoom: 19
        }
    ).setView(
        [20, 0],
        2
    );


    /*
       EARTH / GLOBE STYLE SATELLITE MAP
    */

    satelliteLayer =
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 19,
                attribution:
                    "Tiles &copy; Esri"
            }
        );


    /*
       PLACE LABELS ON TOP OF SATELLITE
    */

    labelsLayer =
        L.tileLayer(
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 19,
                opacity: 0.85,
                attribution:
                    "Labels &copy; Esri"
            }
        );


    satelliteLayer.addTo(map);

    labelsLayer.addTo(map);


    /*
       ZOOM BUTTONS AT BOTTOM RIGHT
    */

    L.control.zoom(
        {
            position: "bottomright"
        }
    ).addTo(map);


    earthquakeLayer =
        L.layerGroup().addTo(map);


    temperatureLayer =
        L.layerGroup();


    loadEarthquakes();


    setTimeout(() => {

        map.invalidateSize();

    }, 500);

}


/* =====================================================
   CURRENT LOCATION
===================================================== */

async function useCurrentLocation() {

    const message =
        document.getElementById(
            "locationMessage"
        );


    const buttons = [
        document.getElementById("currentLocationBtn"),
        document.getElementById("myLocationBtn"),
        document.getElementById("mapMyLocation")
    ];


    buttons.forEach(button => {

        if (button) {

            button.disabled = true;

        }

    });


    if (message) {

        message.textContent =
            "📍 Detecting your exact location...";

    }


    /*
       GPS WORKS BEST ON HTTPS.

       GitHub Pages = HTTPS.
       localhost = allowed.
    */

    if (
        !window.isSecureContext &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
    ) {

        if (message) {

            message.textContent =
                "⚠️ GPS requires HTTPS. Trying automatic location...";

        }

        await fallbackIPLocation();

        buttons.forEach(button => {

            if (button) button.disabled = false;

        });

        return;

    }


    if (!navigator.geolocation) {

        if (message) {

            message.textContent =
                "⚠️ This device does not support GPS location.";

        }

        await fallbackIPLocation();

        buttons.forEach(button => {

            if (button) button.disabled = false;

        });

        return;

    }


    /*
       Clear old watcher
    */

    if (locationWatchId !== null) {

        try {

            navigator.geolocation.clearWatch(
                locationWatchId
            );

        } catch (error) {

            console.warn(error);

        }

        locationWatchId = null;

    }


    /*
       First request with high accuracy.
    */

    navigator.geolocation.getCurrentPosition(

        async position => {

            try {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                if (
                    !Number.isFinite(latitude) ||
                    !Number.isFinite(longitude)
                ) {

                    throw new Error(
                        "Invalid GPS coordinates"
                    );

                }


                const location =
                    await reverseGeocode(
                        latitude,
                        longitude
                    );


                const finalLocation = {

                    name:
                        location?.name ||
                        "Current Location",

                    latitude,

                    longitude,

                    country:
                        location?.country || "",

                    state:
                        location?.state || "",

                    district:
                        location?.district || "",

                    postcode:
                        location?.postcode || "",

                    timezone:
                        location?.timezone ||
                        "auto",

                    isCurrent: true

                };


                if (message) {

                    message.textContent =
                        "📍 Exact location detected.";

                }


                await loadLocationData(
                    finalLocation
                );


            } catch (error) {

                console.error(
                    "GPS processing error:",
                    error
                );


                await fallbackIPLocation();

            }


            buttons.forEach(button => {

                if (button) button.disabled = false;

            });

        },


        async error => {

            console.warn(
                "GPS error:",
                error
            );


            let reason =
                "Location could not be detected.";


            if (error.code === 1) {

                reason =
                    "Location permission was denied.";

            }


            if (error.code === 2) {

                reason =
                    "GPS signal is unavailable.";

            }


            if (error.code === 3) {

                reason =
                    "GPS request timed out.";

            }


            if (message) {

                message.textContent =
                    "⚠️ " +
                    reason +
                    " Trying automatic location...";

            }


            await fallbackIPLocation();


            buttons.forEach(button => {

                if (button) button.disabled = false;

            });

        },


        {
            enableHighAccuracy: true,

            timeout: 20000,

            maximumAge: 60000

        }

    );

}


/* =====================================================
   IP LOCATION FALLBACK
===================================================== */

async function fallbackIPLocation() {

    const message =
        document.getElementById(
            "locationMessage"
        );


    try {

        const response =
            await fetch(
                "https://ipapi.co/json/",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "IP location failed"
            );

        }


        const data =
            await response.json();


        if (
            data.latitude === undefined ||
            data.longitude === undefined
        ) {

            throw new Error(
                "No coordinates"
            );

        }


        const latitude =
            Number(data.latitude);

        const longitude =
            Number(data.longitude);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {

            throw new Error(
                "Invalid IP coordinates"
            );

        }


        const location = {

            name:
                data.city ||
                data.region ||
                data.country_name ||
                "Current Location",

            latitude,

            longitude,

            country:
                data.country_name || "",

            state:
                data.region || "",

            district:
                data.district || "",

            postcode:
                data.postal || "",

            timezone:
                data.timezone || "auto",

            isCurrent: true

        };


        if (message) {

            message.textContent =
                "📍 Location detected automatically.";

        }


        await loadLocationData(
            location
        );


    } catch (error) {

        console.error(
            "IP location error:",
            error
        );


        if (message) {

            message.textContent =
                "❌ Location could not be detected. Please search your location manually.";

        }

    }

}


/* =====================================================
   REVERSE GEOCODING
===================================================== */

async function reverseGeocode(
    latitude,
    longitude
) {

    try {

        const url =
            `${NOMINATIM_API}?format=jsonv2` +
            `&lat=${encodeURIComponent(latitude)}` +
            `&lon=${encodeURIComponent(longitude)}` +
            `&zoom=18` +
            `&addressdetails=1`;


        const response =
            await fetch(
                url,
                {
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
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
                address.village ||
                address.town ||
                address.city ||
                address.municipality ||
                address.suburb ||
                address.county ||
                address.state ||
                "Current Location",

            country:
                address.country || "",

            state:
                address.state || "",

            district:
                address.county ||
                address.state_district ||
                "",

            postcode:
                address.postcode || "",

            timezone:
                "auto"

        };


    } catch (error) {

        console.error(
            "Reverse geocode error:",
            error
        );

        return null;

    }

}


/* =====================================================
   SEARCH LOCATION
===================================================== */

async function searchLocation(query) {

    query = query.trim();

    if (!query) return;


    const resultsContainers = [

        document.getElementById(
            "searchResults"
        ),

        document.getElementById(
            "dashboardSearchResults"
        )

    ];


    resultsContainers.forEach(
        container => {

            if (container) {

                container.innerHTML =
                    `<div class="loading-message">
                        🔍 Searching location...
                    </div>`;

            }

        }
    );


    try {

        const nominatimURL =
            `${NOMINATIM_API}` +
            `?format=jsonv2` +
            `&addressdetails=1` +
            `&limit=10` +
            `&q=${encodeURIComponent(query)}`;


        const response =
            await fetch(
                nominatimURL,
                {
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        const data =
            await response.json();


        if (
            Array.isArray(data) &&
            data.length
        ) {

            const locations =
                data.map(item => {

                    const address =
                        item.address || {};


                    return {

                        name:
                            address.village ||
                            address.town ||
                            address.city ||
                            address.municipality ||
                            address.suburb ||
                            address.county ||
                            item.display_name
                                .split(",")[0],

                        displayName:
                            item.display_name,

                        latitude:
                            Number(item.lat),

                        longitude:
                            Number(item.lon),

                        country:
                            address.country || "",

                        state:
                            address.state || "",

                        district:
                            address.county ||
                            address.state_district ||
                            "",

                        postcode:
                            address.postcode || "",

                        timezone:
                            "auto"

                    };

                });


            renderSearchResults(
                locations
            );

            return;

        }


        const fallbackURL =
            `${GEOCODING_API}` +
            `?name=${encodeURIComponent(query)}` +
            `&count=10` +
            `&language=en` +
            `&format=json`;


        const fallbackResponse =
            await fetch(
                fallbackURL
            );


        const fallbackData =
            await fallbackResponse.json();


        if (
            fallbackData.results &&
            fallbackData.results.length
        ) {

            const locations =
                fallbackData.results.map(
                    item => ({

                        name:
                            item.name,

                        displayName:
                            [
                                item.name,
                                item.admin2,
                                item.admin1,
                                item.country
                            ]
                            .filter(Boolean)
                            .join(", "),

                        latitude:
                            item.latitude,

                        longitude:
                            item.longitude,

                        country:
                            item.country || "",

                        state:
                            item.admin1 || "",

                        district:
                            item.admin2 || "",

                        postcode:
                            item.postcodes?.[0] ||
                            "",

                        timezone:
                            item.timezone ||
                            "auto"

                    })
                );


            renderSearchResults(
                locations
            );

            return;

        }


        renderSearchError(
            "No matching location found."
        );


    } catch (error) {

        console.error(
            "Search error:",
            error
        );


        renderSearchError(
            "Search failed. Please try again."
        );

    }

}


/* =====================================================
   SEARCH RESULT UI
===================================================== */

function renderSearchResults(
    locations
) {

    const containers = [

        document.getElementById(
            "searchResults"
        ),

        document.getElementById(
            "dashboardSearchResults"
        )

    ];


    containers.forEach(
        container => {

            if (!container) return;


            container.innerHTML = "";


            locations.forEach(
                location => {

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "search-result-item";


                    item.innerHTML = `

                        <div class="result-main">
                            📍 ${escapeHTML(
                                location.name
                            )}
                        </div>

                        <div class="result-sub">
                            ${escapeHTML(
                                location.displayName ||
                                [
                                    location.district,
                                    location.state,
                                    location.country,
                                    location.postcode
                                ]
                                .filter(Boolean)
                                .join(", ")
                            )}
                        </div>

                    `;


                    item.addEventListener(
                        "click",
                        () => {

                            loadLocationData(
                                location
                            );


                            containers.forEach(
                                c => {

                                    if (c) {

                                        c.innerHTML =
                                            "";

                                    }

                                }
                            );

                        }
                    );


                    container.appendChild(
                        item
                    );

                }
            );

        }
    );

}


/* =====================================================
   SEARCH ERROR
===================================================== */

function renderSearchError(
    message
) {

    const containers = [

        document.getElementById(
            "searchResults"
        ),

        document.getElementById(
            "dashboardSearchResults"
        )

    ];


    containers.forEach(container => {

        if (container) {

            container.innerHTML =
                `<div class="loading-message">
                    ${escapeHTML(message)}
                </div>`;

        }

    });

}


/* =====================================================
   LOAD LOCATION DATA
===================================================== */

async function loadLocationData(
    location,
    refreshOnly = false
) {

    selectedLocation = location;


    if (!refreshOnly) {

        addRecentSearch(
            location
        );

    }


    document
        .getElementById("landingPage")
        ?.classList.add("hidden");


    document
        .getElementById("dashboard")
        ?.classList.remove("hidden");


    updateLocationHeader(
        location
    );


    showMapLocation(
        location
    );


    try {

        await Promise.all([

            loadWeather(
                location
            ),

            loadAirQuality(
                location
            ),

            loadEarthquakes()

        ]);

    } catch (error) {

        console.error(
            "Dashboard data error:",
            error
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =====================================================
   LOCATION HEADER
===================================================== */

function updateLocationHeader(
    location
) {

    const name =
        document.getElementById(
            "locationName"
        );

    const details =
        document.getElementById(
            "locationDetails"
        );


    if (name) {

        name.textContent =
            location.name ||
            "Selected Location";

    }


    if (details) {

        const parts = [

            location.district,

            location.state,

            location.country,

            location.postcode

        ].filter(Boolean);


        details.textContent =
            parts.length
                ? parts.join(" • ")
                : `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`;

    }

}


/* =====================================================
   WEATHER
===================================================== */

async function loadWeather(
    location
) {

    const params = new URLSearchParams({

        latitude:
            location.latitude,

        longitude:
            location.longitude,

        current:
            [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "precipitation",
                "rain",
                "weather_code",
                "cloud_cover",
                "pressure_msl",
                "wind_speed_10m",
                "wind_direction_10m",
                "visibility",
                "uv_index"
            ].join(","),

        hourly:
            [
                "temperature_2m",
                "precipitation_probability",
                "weather_code"
            ].join(","),

        daily:
            [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "sunrise",
                "sunset",
                "uv_index_max"
            ].join(","),

        timezone:
            "auto",

        forecast_days:
            "7"

    });


    const response =
        await fetch(
            `${WEATHER_API}?${params}`
        );


    if (!response.ok) {

        throw new Error(
            "Weather API error"
        );

    }


    const data =
        await response.json();


    lastWeatherData =
        data;


    updateCurrentWeather(data);

    updateHourly(data);

    updateDaily(data);

    updateSun(data);

    updateCharts(data);

    updateLocalTime(data);

}


/* =====================================================
   CURRENT WEATHER
===================================================== */

function updateCurrentWeather(
    data
) {

    const current =
        data.current;


    const weatherCode =
        current.weather_code;


    setText(
        "temperature",
        Math.round(
            current.temperature_2m
        )
    );


    setText(
        "feelsLike",
        Math.round(
            current.apparent_temperature
        )
    );


    setText(
        "humidity",
        `${current.relative_humidity_2m}%`
    );


    setText(
        "rain",
        `${Math.round(
            current.precipitation
                ? current.precipitation * 10
                : 0
        )}%`
    );


    setText(
        "wind",
        `${Math.round(
            current.wind_speed_10m
        )} km/h`
    );


    setText(
        "clouds",
        `${current.cloud_cover}%`
    );


    setText(
        "windDirection",
        `${Math.round(
            current.wind_direction_10m
        )}° ${windDirection(
            current.wind_direction_10m
        )}`
    );


    setText(
        "visibility",
        `${(
            current.visibility / 1000
        ).toFixed(1)} km`
    );


    setText(
        "pressure",
        `${Math.round(
            current.pressure_msl
        )} hPa`
    );


    setText(
        "uvIndex",
        Number(
            current.uv_index || 0
        ).toFixed(1)
    );


    setText(
        "weatherCondition",
        weatherDescription(
            weatherCode
        )
    );


    setText(
        "weatherIcon",
        weatherIcon(
            weatherCode
        )
    );


    setText(
        "uvLarge",
        Number(
            current.uv_index || 0
        ).toFixed(1)
    );


    setText(
        "uvStatus",
        uvStatus(
            current.uv_index || 0
        )
    );

}


/* =====================================================
   HOURLY
===================================================== */

function updateHourly(
    data
) {

    const container =
        document.getElementById(
            "hourlyForecast"
        );


    if (!container) return;


    container.innerHTML = "";


    const times =
        data.hourly.time;

    const temperatures =
        data.hourly.temperature_2m;

    const rain =
        data.hourly.precipitation_probability;

    const codes =
        data.hourly.weather_code;


    const now =
        new Date();


    let startIndex =
        times.findIndex(
            time =>
                new Date(time) >= now
        );


    if (startIndex < 0) {

        startIndex = 0;

    }


    for (
        let i = startIndex;
        i < Math.min(
            startIndex + 12,
            times.length
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
            new Date(times[i]);


        card.innerHTML = `

            <small>
                ${time.toLocaleTimeString(
                    [],
                    {
                        hour: "numeric",
                        minute: "2-digit"
                    }
                )}
            </small>

            <div class="daily-icon">
                ${weatherIcon(
                    codes[i]
                )}
            </div>

            <strong>
                ${Math.round(
                    temperatures[i]
                )}°C
            </strong>

            <small>
                🌧️ ${rain[i] ?? 0}%
            </small>

        `;


        container.appendChild(
            card
        );

    }

}


/* =====================================================
   DAILY
===================================================== */

function updateDaily(
    data
) {

    const container =
        document.getElementById(
            "dailyForecast"
        );


    if (!container) return;


    container.innerHTML = "";


    const times =
        data.daily.time;


    for (
        let i = 0;
        i < times.length;
        i++
    ) {

        const date =
            new Date(
                times[i] +
                "T12:00:00"
            );


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "daily-card";


        card.innerHTML = `

            <div class="day">
                ${
                    i === 0
                        ? "Today"
                        : date.toLocaleDateString(
                            [],
                            {
                                weekday: "short"
                            }
                        )
                }
            </div>

            <div class="daily-icon">
                ${weatherIcon(
                    data.daily.weather_code[i]
                )}
            </div>

            <strong>
                ${Math.round(
                    data.daily.temperature_2m_max[i]
                )}° /
                ${Math.round(
                    data.daily.temperature_2m_min[i]
                )}°
            </strong>

        `;


        container.appendChild(
            card
        );

    }

}


/* =====================================================
   SUN
===================================================== */

function updateSun(
    data
) {

    if (
        !data.daily ||
        !data.daily.sunrise
    ) {

        return;

    }


    setText(
        "sunrise",
        formatTime(
            data.daily.sunrise[0]
        )
    );


    setText(
        "sunset",
        formatTime(
            data.daily.sunset[0]
        )
    );

}


/* =====================================================
   LOCAL TIME
===================================================== */

function updateLocalTime(
    data
) {

    if (!data.timezone) return;


    const update = () => {

        const now =
            new Date();


        const formatter =
            new Intl.DateTimeFormat(
                "en-IN",
                {
                    timeZone:
                        data.timezone,

                    dateStyle:
                        "medium",

                    timeStyle:
                        "medium"
                }
            );


        const text =
            formatter.format(now);


        setText(
            "localDateTime",
            `🕐 Local Time: ${text}`
        );


        setText(
            "dashboardLocalTime",
            formatter.format(now)
        );

    };


    update();


    clearInterval(
        window.earthPulseClock
    );


    window.earthPulseClock =
        setInterval(
            update,
            1000
        );

}


/* =====================================================
   AIR QUALITY
===================================================== */

async function loadAirQuality(
    location
) {

    try {

        const params =
            new URLSearchParams({

                latitude:
                    location.latitude,

                longitude:
                    location.longitude,

                current:
                    [
                        "european_aqi",
                        "pm2_5",
                        "pm10",
                        "ozone",
                        "nitrogen_dioxide"
                    ].join(","),

                timezone:
                    "auto"

            });


        const response =
            await fetch(
                `${AIR_API}?${params}`
            );


        if (!response.ok) {

            throw new Error(
                "Air quality error"
            );

        }


        const data =
            await response.json();


        const current =
            data.current;


        setText(
            "aqi",
            Math.round(
                current.european_aqi || 0
            )
        );


        setText(
            "pm25",
            `${Number(
                current.pm2_5 || 0
            ).toFixed(1)} µg/m³`
        );


        setText(
            "pm10",
            `${Number(
                current.pm10 || 0
            ).toFixed(1)} µg/m³`
        );


        setText(
            "ozone",
            `${Number(
                current.ozone || 0
            ).toFixed(1)} µg/m³`
        );


        setText(
            "no2",
            `${Number(
                current.nitrogen_dioxide || 0
            ).toFixed(1)} µg/m³`
        );


        setText(
            "aqiStatus",
            aqiStatus(
                current.european_aqi
            )
        );


    } catch (error) {

        console.error(
            "AQI error:",
            error
        );

    }

}


/* =====================================================
   EARTHQUAKES
===================================================== */

async function loadEarthquakes() {

    const list =
        document.getElementById(
            "earthquakeList"
        );


    try {

        const response =
            await fetch(
                EARTHQUAKE_API,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Earthquake API error"
            );

        }


        const data =
            await response.json();


        if (!earthquakeLayer) return;


        earthquakeLayer.clearLayers();


        const features =
            data.features || [];


        features.sort(
            (a, b) =>
                (
                    b.properties.mag || 0
                ) -
                (
                    a.properties.mag || 0
                )
        );


        const topEarthquakes =
            features.slice(0, 20);


        topEarthquakes.forEach(
            quake => {

                const coords =
                    quake.geometry.coordinates;


                const longitude =
                    coords[0];

                const latitude =
                    coords[1];

                const depth =
                    coords[2];


                const magnitude =
                    quake.properties.mag ||
                    0;


                const marker =
                    L.circleMarker(
                        [
                            latitude,
                            longitude
                        ],
                        {
                            radius:
                                Math.max(
                                    5,
                                    Math.min(
                                        14,
                                        magnitude * 2.2
                                    )
                                ),

                            color:
                                magnitude >= 5
                                    ? "#dc2626"
                                    : magnitude >= 3
                                        ? "#f59e0b"
                                        : "#2563eb",

                            fillColor:
                                magnitude >= 5
                                    ? "#ef4444"
                                    : magnitude >= 3
                                        ? "#fbbf24"
                                        : "#60a5fa",

                            fillOpacity:
                                0.75,

                            weight:
                                2
                        }
                    );


                const title =
                    quake.properties.title ||
                    "Earthquake";


                marker.bindPopup(`

                    <div style="
                        min-width:220px;
                        font-family:Arial,sans-serif;
                    ">

                        <strong style="
                            font-size:16px;
                        ">
                            🌎 ${escapeHTML(title)}
                        </strong>

                        <br><br>

                        <b>Magnitude:</b>
                        ${magnitude}

                        <br>

                        <b>Depth:</b>
                        ${Number(
                            depth
                        ).toFixed(1)} km

                        <br>

                        <b>Time:</b>
                        ${new Date(
                            quake.properties.time
                        ).toLocaleString()}

                    </div>

                `);


                marker.on(
                    "click",
                    () => {

                        setText(
                            "mapInfoText",
                            `Earthquake • Magnitude ${magnitude} • Depth ${Number(depth).toFixed(1)} km`
                        );

                    }
                );


                marker.addTo(
                    earthquakeLayer
                );

            }
        );


        if (list) {

            list.innerHTML = "";


            topEarthquakes
                .slice(0, 8)
                .forEach(
                    quake => {

                        const magnitude =
                            quake.properties.mag ||
                            0;


                        const item =
                            document.createElement(
                                "div"
                            );


                        item.className =
                            "event-item";


                        item.innerHTML = `

                            <div>

                                <span class="magnitude">
                                    M ${magnitude.toFixed(1)}
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        quake.properties.place ||
                                        "Unknown location"
                                    )}
                                </strong>

                            </div>

                            <div class="event-meta">

                                Depth:
                                ${Number(
                                    quake.geometry.coordinates[2]
                                ).toFixed(1)} km

                                •

                                ${new Date(
                                    quake.properties.time
                                ).toLocaleString()}

                            </div>

                        `;


                        list.appendChild(
                            item
                        );

                    }
                );


            if (!topEarthquakes.length) {

                list.innerHTML =
                    `<div class="loading-message">
                        No recent earthquakes found.
                    </div>`;

            }

        }


    } catch (error) {

        console.error(
            "Earthquake error:",
            error
        );


        if (list) {

            list.innerHTML =
                `<div class="loading-message">
                    Earthquake information unavailable right now.
                </div>`;

        }

    }

}


/* =====================================================
   MAP LOCATION
===================================================== */

function showMapLocation(
    location
) {

    if (!map) return;


    const lat =
        Number(location.latitude);

    const lon =
        Number(location.longitude);


    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {

        return;

    }


    map.setView(
        [lat, lon],
        10,
        {
            animate: true
        }
    );


    if (selectedMarker) {

        map.removeLayer(
            selectedMarker
        );

    }


    selectedMarker =
        L.marker(
            [lat, lon]
        ).addTo(map);


    selectedMarker.bindPopup(`

        <div style="
            min-width:190px;
            font-family:Arial,sans-serif;
        ">

            <strong style="
                font-size:16px;
            ">
                📍 ${escapeHTML(
                    location.name ||
                    "Selected Location"
                )}
            </strong>

            <br><br>

            ${escapeHTML(
                [
                    location.district,
                    location.state,
                    location.country,
                    location.postcode
                ]
                .filter(Boolean)
                .join(" • ")
            )}

        </div>

    `).openPopup();


    setText(
        "mapInfoText",
        `Selected location: ${location.name}`
    );


    setTimeout(() => {

        map.invalidateSize();

    }, 300);

}


/* =====================================================
   MAP LAYERS
===================================================== */

function changeMapLayer(
    layer
) {

    if (!map) return;


    /*
       MAP
    */

    if (layer === "standard") {

        if (
            satelliteLayer &&
            !map.hasLayer(satelliteLayer)
        ) {

            satelliteLayer.addTo(map);

        }


        if (
            labelsLayer &&
            !map.hasLayer(labelsLayer)
        ) {

            labelsLayer.addTo(map);

        }


        if (
            earthquakeLayer &&
            !map.hasLayer(earthquakeLayer)
        ) {

            earthquakeLayer.addTo(map);

        }


        if (temperatureLayer) {

            map.removeLayer(
                temperatureLayer
            );

        }


        setText(
            "mapInfoText",
            "🌍 Earth view with global earthquake monitoring."
        );

        return;

    }


    /*
       EARTHQUAKES
    */

    if (layer === "earthquakes") {

        if (
            satelliteLayer &&
            !map.hasLayer(satelliteLayer)
        ) {

            satelliteLayer.addTo(map);

        }


        if (
            labelsLayer &&
            !map.hasLayer(labelsLayer)
        ) {

            labelsLayer.addTo(map);

        }


        if (
            earthquakeLayer &&
            !map.hasLayer(earthquakeLayer)
        ) {

            earthquakeLayer.addTo(map);

        }


        if (temperatureLayer) {

            map.removeLayer(
                temperatureLayer
            );

        }


        setText(
            "mapInfoText",
            "🌎 Recent earthquakes are shown with markers. Click a marker for details."
        );

        return;

    }


    /*
       TEMPERATURE
    */

    if (layer === "temperature") {

        if (temperatureLayer) {

            temperatureLayer.addTo(map);

        }


        if (
            earthquakeLayer &&
            map.hasLayer(earthquakeLayer)
        ) {

            map.removeLayer(
                earthquakeLayer
            );

        }


        setText(
            "mapInfoText",
            "🌡️ Temperature monitoring layer selected."
        );

    }

}


/* =====================================================
   CHARTS
===================================================== */

function updateCharts(
    data
) {

    const hourly =
        data.hourly;


    const labels =
        hourly.time
            .slice(0, 24)
            .map(
                time =>
                    new Date(
                        time
                    ).toLocaleTimeString(
                        [],
                        {
                            hour:
                                "numeric"
                        }
                    )
            );


    const temps =
        hourly.temperature_2m
            .slice(0, 24);


    const rain =
        hourly.precipitation_probability
            .slice(0, 24);


    const tempCanvas =
        document.getElementById(
            "temperatureChart"
        );


    const rainCanvas =
        document.getElementById(
            "rainChart"
        );


    if (temperatureChart) {

        temperatureChart.destroy();

    }


    if (rainChart) {

        rainChart.destroy();

    }


    if (tempCanvas) {

        temperatureChart =
            new Chart(
                tempCanvas,
                {
                    type: "line",

                    data: {

                        labels,

                        datasets: [

                            {
                                label:
                                    "Temperature °C",

                                data:
                                    temps,

                                tension:
                                    0.35,

                                borderWidth:
                                    3,

                                pointRadius:
                                    3

                            }

                        ]

                    },

                    options: {

                        responsive:
                            true,

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


    if (rainCanvas) {

        rainChart =
            new Chart(
                rainCanvas,
                {
                    type: "bar",

                    data: {

                        labels,

                        datasets: [

                            {
                                label:
                                    "Rain Probability %",

                                data:
                                    rain,

                                borderWidth:
                                    1

                            }

                        ]

                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        scales: {

                            y: {

                                beginAtZero:
                                    true,

                                max:
                                    100

                            }

                        }

                    }

                }
            );

    }

}


/* =====================================================
   FAVORITES
===================================================== */

function addFavorite() {

    if (!selectedLocation) {

        alert(
            "Please select a location first."
        );

        return;

    }


    const exists =
        favorites.some(
            item =>
                Number(item.latitude) ===
                Number(selectedLocation.latitude) &&
                Number(item.longitude) ===
                Number(selectedLocation.longitude)
        );


    if (exists) {

        alert(
            "⭐ This location is already in favorites."
        );

        return;

    }


    favorites.push(
        selectedLocation
    );


    localStorage.setItem(
        "earthpulseFavorites",
        JSON.stringify(
            favorites
        )
    );


    renderFavorites();


    alert(
        "⭐ Location added to favorites."
    );

}


/* =====================================================
   RENDER FAVORITES
===================================================== */

function renderFavorites() {

    const container =
        document.getElementById(
            "favoritesList"
        );


    if (!container) return;


    if (!favorites.length) {

        container.innerHTML =
            "<p>No favorite locations yet.</p>";

        return;

    }


    container.innerHTML = "";


    favorites.forEach(
        location => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "favorite-item";


            item.innerHTML = `

                <strong>
                    ⭐ ${escapeHTML(
                        location.name
                    )}
                </strong>

                <br>

                <small>
                    ${escapeHTML(
                        [
                            location.state,
                            location.country
                        ]
                        .filter(Boolean)
                        .join(", ")
                    )}
                </small>

            `;


            item.addEventListener(
                "click",
                () =>
                    loadLocationData(
                        location
                    )
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   RECENT SEARCH
===================================================== */

function addRecentSearch(
    location
) {

    recentSearches =
        recentSearches.filter(
            item =>
                !(
                    Number(item.latitude) ===
                    Number(location.latitude) &&
                    Number(item.longitude) ===
                    Number(location.longitude)
                )
        );


    recentSearches.unshift(
        location
    );


    recentSearches =
        recentSearches.slice(
            0,
            8
        );


    localStorage.setItem(
        "earthpulseRecent",
        JSON.stringify(
            recentSearches
        )
    );


    renderRecentSearches();

}


/* =====================================================
   RENDER RECENT
===================================================== */

function renderRecentSearches() {

    const container =
        document.getElementById(
            "recentSearches"
        );


    if (!container) return;


    if (!recentSearches.length) {

        container.innerHTML =
            "<p>No recent searches.</p>";

        return;

    }


    container.innerHTML = "";


    recentSearches.forEach(
        location => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "recent-item";


            item.innerHTML = `

                <strong>
                    🕘 ${escapeHTML(
                        location.name
                    )}
                </strong>

                <br>

                <small>
                    ${escapeHTML(
                        location.country || ""
                    )}
                </small>

            `;


            item.addEventListener(
                "click",
                () =>
                    loadLocationData(
                        location
                    )
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =====================================================
   CLEAR HISTORY
===================================================== */

function clearHistory() {

    recentSearches = [];


    localStorage.removeItem(
        "earthpulseRecent"
    );


    renderRecentSearches();

}


/* =====================================================
   WEATHER DESCRIPTION
===================================================== */

function weatherDescription(
    code
) {

    const map = {

        0: "Clear Sky",

        1: "Mainly Clear",

        2: "Partly Cloudy",

        3: "Overcast",

        45: "Fog",

        48: "Depositing Rime Fog",

        51: "Light Drizzle",

        53: "Moderate Drizzle",

        55: "Dense Drizzle",

        61: "Light Rain",

        63: "Moderate Rain",

        65: "Heavy Rain",

        71: "Light Snow",

        73: "Moderate Snow",

        75: "Heavy Snow",

        80: "Rain Showers",

        81: "Moderate Rain Showers",

        82: "Heavy Rain Showers",

        95: "Thunderstorm",

        96: "Thunderstorm with Hail",

        99: "Severe Thunderstorm"

    };


    return (
        map[code] ||
        "Unknown Weather"
    );

}


/* =====================================================
   WEATHER ICON
===================================================== */

function weatherIcon(
    code
) {

    if (code === 0) return "☀️";

    if (
        code === 1 ||
        code === 2
    ) return "🌤️";

    if (code === 3) return "☁️";

    if (
        code === 45 ||
        code === 48
    ) return "🌫️";

    if (
        code >= 51 &&
        code <= 67
    ) return "🌧️";

    if (
        code >= 71 &&
        code <= 77
    ) return "❄️";

    if (
        code >= 80 &&
        code <= 82
    ) return "🌦️";

    if (
        code >= 95
    ) return "⛈️";

    return "🌍";

}


/* =====================================================
   WIND DIRECTION
===================================================== */

function windDirection(
    degrees
) {

    const directions = [

        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"

    ];


    return directions[
        Math.round(
            degrees / 45
        ) % 8
    ];

}


/* =====================================================
   UV STATUS
===================================================== */

function uvStatus(
    value
) {

    if (value <= 2)
        return "Low";

    if (value <= 5)
        return "Moderate";

    if (value <= 7)
        return "High";

    if (value <= 10)
        return "Very High";

    return "Extreme";

}


/* =====================================================
   AQI
===================================================== */

function aqiStatus(
    value
) {

    value = Number(
        value || 0
    );


    if (value <= 20)
        return "Good";

    if (value <= 40)
        return "Fair";

    if (value <= 60)
        return "Moderate";

    if (value <= 80)
        return "Poor";

    if (value <= 100)
        return "Very Poor";

    return "Extremely Poor";

}


/* =====================================================
   FORMAT TIME
===================================================== */

function formatTime(
    value
) {

    if (!value) return "--";


    const date =
        new Date(value);


    return date.toLocaleTimeString(
        [],
        {
            hour:
                "numeric",

            minute:
                "2-digit"
        }
    );

}


/* =====================================================
   SET TEXT
===================================================== */

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


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =====================================================
   STORM / ALERT
===================================================== */

async function loadStormAlerts() {

    const element =
        document.getElementById(
            "stormAlerts"
        );


    if (!element) return;


    element.innerHTML = `

        <strong>
            🌍 Global Safety Monitor
        </strong>

        <br><br>

        Current weather conditions are being monitored.
        Severe-weather alert availability depends on the
        selected country's public weather authority.

    `;

}


/* =====================================================
   INITIAL ALERT
===================================================== */

loadStormAlerts();


/* =====================================================
   PAGE LOAD
===================================================== */

window.addEventListener(
    "load",
    () => {

        setTimeout(
            () => {

                if (map) {

                    map.invalidateSize();

                }

            },
            800
        );

    }
);


/* =====================================================
   RESIZE
===================================================== */

window.addEventListener(
    "resize",
    () => {

        if (map) {

            map.invalidateSize();

        }

    }
);
