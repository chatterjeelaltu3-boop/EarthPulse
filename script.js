/* =====================================================
   EARTHPULSE
   Global Weather + Earth Monitor
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let currentLocation = null;

let weatherData = null;

let map = null;

let locationMarker = null;

let earthquakeLayer = null;

let standardLayer = null;

let satelliteLayer = null;

let temperatureChart = null;

let rainChart = null;

let selectedTimezone = "auto";



/* =====================================================
   API ENDPOINTS
===================================================== */

const GEO_URL =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_URL =
    "https://api.open-meteo.com/v1/forecast";

const AIR_URL =
    "https://air-quality-api.open-meteo.com/v1/air-quality";

const EARTHQUAKE_URL =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

const NOMINATIM_URL =
    "https://nominatim.openstreetmap.org";



/* =====================================================
   DOM HELPER
===================================================== */

function $(id){

    return document.getElementById(id);

}



/* =====================================================
   SAFE TEXT
===================================================== */

function escapeHTML(text){

    return String(text || "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}



/* =====================================================
   WEATHER CODE
===================================================== */

function weatherInfo(code){

    const data = {

        0:{
            icon:"☀️",
            text:"Clear Sky"
        },

        1:{
            icon:"🌤️",
            text:"Mainly Clear"
        },

        2:{
            icon:"⛅",
            text:"Partly Cloudy"
        },

        3:{
            icon:"☁️",
            text:"Overcast"
        },

        45:{
            icon:"🌫️",
            text:"Fog"
        },

        48:{
            icon:"🌫️",
            text:"Depositing Rime Fog"
        },

        51:{
            icon:"🌦️",
            text:"Light Drizzle"
        },

        53:{
            icon:"🌦️",
            text:"Drizzle"
        },

        55:{
            icon:"🌧️",
            text:"Heavy Drizzle"
        },

        61:{
            icon:"🌧️",
            text:"Light Rain"
        },

        63:{
            icon:"🌧️",
            text:"Rain"
        },

        65:{
            icon:"🌧️",
            text:"Heavy Rain"
        },

        71:{
            icon:"🌨️",
            text:"Light Snow"
        },

        73:{
            icon:"❄️",
            text:"Snow"
        },

        75:{
            icon:"❄️",
            text:"Heavy Snow"
        },

        80:{
            icon:"🌦️",
            text:"Rain Showers"
        },

        81:{
            icon:"🌧️",
            text:"Rain Showers"
        },

        82:{
            icon:"⛈️",
            text:"Heavy Rain Showers"
        },

        95:{
            icon:"⛈️",
            text:"Thunderstorm"
        },

        96:{
            icon:"⛈️",
            text:"Thunderstorm + Hail"
        },

        99:{
            icon:"⛈️",
            text:"Severe Thunderstorm"
        }

    };

    return data[code] || {
        icon:"🌍",
        text:"Unknown"
    };

}



/* =====================================================
   WIND DIRECTION
===================================================== */

function windDirection(degree){

    if(degree === null || degree === undefined){

        return "--";

    }

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
        Math.round(degree / 45) % 8
    ];

}



/* =====================================================
   FORMAT TIME
===================================================== */

function formatLocalTime(dateString, timezone){

    try{

        return new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone:timezone || "UTC",
                weekday:"short",
                day:"numeric",
                month:"short",
                year:"numeric",
                hour:"numeric",
                minute:"2-digit",
                second:"2-digit",
                hour12:true
            }
        ).format(new Date(dateString));

    }catch{

        return dateString || "--";

    }

}



/* =====================================================
   TIME ONLY
===================================================== */

function formatTime(dateString, timezone){

    try{

        return new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone:timezone || "UTC",
                hour:"numeric",
                minute:"2-digit",
                hour12:true
            }
        ).format(new Date(dateString));

    }catch{

        return "--";

    }

}



/* =====================================================
   DATE ONLY
===================================================== */

function formatDay(dateString){

    try{

        return new Intl.DateTimeFormat(
            "en-IN",
            {
                weekday:"short",
                day:"numeric",
                month:"short"
            }
        ).format(new Date(dateString + "T12:00:00"));

    }catch{

        return dateString;

    }

}



/* =====================================================
   SEARCH GEOCODING
===================================================== */

async function searchLocations(query){

    const cleanQuery = query.trim();

    if(!cleanQuery){

        return [];

    }

    try{

        const url =
            GEO_URL +
            "?name=" +
            encodeURIComponent(cleanQuery) +
            "&count=10" +
            "&language=en" +
            "&format=json";

        const response =
            await fetch(url);

        if(!response.ok){

            throw new Error("Geocoding failed");

        }

        const data =
            await response.json();

        return data.results || [];

    }catch(error){

        console.error(error);

        return [];

    }

}



/* =====================================================
   NOMINATIM FALLBACK
   Useful for villages/postcodes
===================================================== */

async function searchNominatim(query){

    try{

        const url =
            NOMINATIM_URL +
            "/search?format=jsonv2&addressdetails=1&limit=10&q=" +
            encodeURIComponent(query);

        const response =
            await fetch(
                url,
                {
                    headers:{
                        "Accept":"application/json"
                    }
                }
            );

        if(!response.ok){

            return [];

        }

        return await response.json();

    }catch(error){

        console.error(error);

        return [];

    }

}



/* =====================================================
   COMBINED SEARCH
===================================================== */

async function performSearch(query, resultContainer){

    if(!query.trim()){

        return;

    }

    resultContainer.innerHTML =
        `<div class="loading">Searching location...</div>`;

    let results =
        await searchLocations(query);

    /*
       If Open-Meteo does not find it,
       try Nominatim. This helps villages,
       small towns and postcodes.
    */

    if(!results.length){

        const nominatim =
            await searchNominatim(query);

        results =
            nominatim.map(item => {

                const address =
                    item.address || {};

                return {

                    name:
                        address.village ||
                        address.town ||
                        address.city ||
                        address.municipality ||
                        address.county ||
                        item.display_name.split(",")[0],

                    latitude:
                        parseFloat(item.lat),

                    longitude:
                        parseFloat(item.lon),

                    country:
                        address.country || "",

                    admin1:
                        address.state || "",

                    admin2:
                        address.county || "",

                    postcode:
                        address.postcode || "",

                    timezone:"auto"

                };

            });

    }


    if(!results.length){

        resultContainer.innerHTML =
            `<div class="error-message">
                Location not found. Try village, nearby town,
                district, postcode or a bigger nearby city.
            </div>`;

        return;

    }


    resultContainer.innerHTML =
        results.map((item,index) => {

            const title =
                item.name ||
                "Unknown Location";

            const parts = [
                item.admin2,
                item.admin1,
                item.country,
                item.postcode
            ].filter(Boolean);

            return `
                <div
                    class="search-result"
                    data-index="${index}"
                >

                    <strong>
                        📍 ${escapeHTML(title)}
                    </strong>

                    <small>
                        ${escapeHTML(parts.join(", "))}
                    </small>

                </div>
            `;

        }).join("");


    const resultElements =
        resultContainer.querySelectorAll(
            ".search-result"
        );


    resultElements.forEach(
        element => {

            element.addEventListener(
                "click",
                () => {

                    const index =
                        parseInt(
                            element.dataset.index
                        );

                    const selected =
                        results[index];

                    resultContainer.innerHTML =
                        "";

                    selectLocation(selected);

                }
            );

        }
    );

}



/* =====================================================
   SELECT LOCATION
===================================================== */

async function selectLocation(location){

    const latitude =
        parseFloat(location.latitude);

    const longitude =
        parseFloat(location.longitude);


    if(
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ){

        alert("Invalid location coordinates.");

        return;

    }


    currentLocation = {

        name:
            location.name ||
            "Selected Location",

        latitude,

        longitude,

        country:
            location.country || "",

        admin1:
            location.admin1 || "",

        admin2:
            location.admin2 || "",

        postcode:
            location.postcode || "",

        timezone:
            location.timezone || "auto"

    };


    selectedTimezone =
        currentLocation.timezone || "auto";


    saveRecentSearch(
        currentLocation
    );


    $("landingPage")
        .classList
        .add("hidden");


    $("dashboard")
        .classList
        .remove("hidden");


    updateLocationHeader();


    initializeMap();


    updateMapLocation();


    await loadWeather();


    await loadAirQuality();


    await loadEarthquakes();


    await loadStormAlerts();


    renderFavorites();


    renderRecentSearches();

}



/* =====================================================
   LOCATION HEADER
===================================================== */

function updateLocationHeader(){

    if(!currentLocation){

        return;

    }


    $("locationName").textContent =
        currentLocation.name;


    const details = [

        currentLocation.admin2,

        currentLocation.admin1,

        currentLocation.country,

        currentLocation.postcode

    ].filter(Boolean);


    $("locationDetails").textContent =
        details.join(" • ");


    $("localDateTime").textContent =
        "🕐 Loading local time...";

}



/* =====================================================
   WEATHER LOAD
===================================================== */

async function loadWeather(){

    if(!currentLocation){

        return;

    }


    $("weatherCondition").textContent =
        "Loading weather...";


    try{

        const params = new URLSearchParams({

            latitude:
                currentLocation.latitude,

            longitude:
                currentLocation.longitude,

            current:
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "apparent_temperature",
                    "is_day",
                    "precipitation",
                    "rain",
                    "showers",
                    "weather_code",
                    "cloud_cover",
                    "pressure_msl",
                    "surface_pressure",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "visibility",
                    "uv_index"
                ].join(","),

            hourly:
                [
                    "temperature_2m",
                    "apparent_temperature",
                    "precipitation_probability",
                    "precipitation",
                    "weather_code",
                    "wind_speed_10m",
                    "relative_humidity_2m",
                    "uv_index"
                ].join(","),

            daily:
                [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "apparent_temperature_max",
                    "precipitation_probability_max",
                    "sunrise",
                    "sunset",
                    "uv_index_max"
                ].join(","),

            timezone:"auto",

            forecast_days:"7",

            forecast_hours:"24"

        });


        const response =
            await fetch(
                WEATHER_URL +
                "?" +
                params.toString()
            );


        if(!response.ok){

            throw new Error(
                "Weather API error"
            );

        }


        weatherData =
            await response.json();


        /*
          Important:
          Use timezone returned by API.
          This fixes the previous local-time problem.
        */

        selectedTimezone =
            weatherData.timezone ||
            currentLocation.timezone ||
            "UTC";


        renderCurrentWeather();

        renderHourly();

        renderDaily();

        renderSun();

        renderCharts();

        updateLocalClock();


    }catch(error){

        console.error(error);

        $("weatherCondition").textContent =
            "Weather unavailable";

        $("locationMessage").textContent =
            "Unable to load weather data.";

    }

}



/* =====================================================
   CURRENT WEATHER
===================================================== */

function renderCurrentWeather(){

    const current =
        weatherData.current;

    const info =
        weatherInfo(
            current.weather_code
        );


    $("weatherIcon").textContent =
        info.icon;


    $("temperature").textContent =
        Math.round(
            current.temperature_2m
        );


    $("weatherCondition").textContent =
        info.text;


    $("feelsLike").textContent =
        Math.round(
            current.apparent_temperature
        );


    $("humidity").textContent =
        Math.round(
            current.relative_humidity_2m
        ) + "%";


    const rainValue =
        weatherData.hourly &&
        weatherData.hourly.precipitation_probability
            ? weatherData.hourly.precipitation_probability[0]
            : 0;


    $("rain").textContent =
        Math.round(
            rainValue || 0
        ) + "%";


    $("wind").textContent =
        Math.round(
            current.wind_speed_10m
        ) + " km/h";


    $("clouds").textContent =
        Math.round(
            current.cloud_cover
        ) + "%";


    $("windDirection").textContent =
        windDirection(
            current.wind_direction_10m
        );


    $("visibility").textContent =
        current.visibility !== undefined
            ? (current.visibility / 1000).toFixed(1) + " km"
            : "-- km";


    $("pressure").textContent =
        Math.round(
            current.pressure_msl
        ) + " hPa";


    $("uvIndex").textContent =
        current.uv_index !== undefined
            ? current.uv_index.toFixed(1)
            : "--";


    $("uvLarge").textContent =
        current.uv_index !== undefined
            ? current.uv_index.toFixed(1)
            : "--";


    $("uvStatus").textContent =
        uvStatus(
            current.uv_index
        );

}



/* =====================================================
   UV STATUS
===================================================== */

function uvStatus(value){

    if(value === undefined || value === null){

        return "Unavailable";

    }

    if(value < 3){

        return "Low";

    }

    if(value < 6){

        return "Moderate";

    }

    if(value < 8){

        return "High";

    }

    if(value < 11){

        return "Very High";

    }

    return "Extreme";

}



/* =====================================================
   HOURLY
===================================================== */

function renderHourly(){

    const hourly =
        weatherData.hourly;

    if(!hourly){

        return;

    }


    let html = "";


    for(
        let i = 0;
        i < Math.min(24,hourly.time.length);
        i++
    ){

        const info =
            weatherInfo(
                hourly.weather_code[i]
            );


        html += `

            <div class="hour-card">

                <div class="hour">
                    ${
                        i === 0
                        ? "Now"
                        : formatTime(
                            hourly.time[i],
                            selectedTimezone
                        )
                    }
                </div>

                <div class="icon">
                    ${info.icon}
                </div>

                <strong>
                    ${Math.round(
                        hourly.temperature_2m[i]
                    )}°C
                </strong>

                <small>
                    🌧️ ${
                        hourly.precipitation_probability[i] || 0
                    }%
                </small>

                <small>
                    💨 ${
                        Math.round(
                            hourly.wind_speed_10m[i]
                        )
                    } km/h
                </small>

            </div>

        `;

    }


    $("hourlyForecast").innerHTML =
        html;

}



/* =====================================================
   DAILY FORECAST
===================================================== */

function renderDaily(){

    const daily =
        weatherData.daily;

    if(!daily){

        return;

    }


    let html = "";


    for(
        let i = 0;
        i < daily.time.length;
        i++
    ){

        const info =
            weatherInfo(
                daily.weather_code[i]
            );


        html += `

            <div class="day-card">

                <strong>
                    ${
                        i === 0
                        ? "Today"
                        : formatDay(
                            daily.time[i]
                        )
                    }
                </strong>

                <div class="day-icon">
                    ${info.icon}
                </div>

                <div class="temps">
                    ${Math.round(
                        daily.temperature_2m_max[i]
                    )}° /
                    ${Math.round(
                        daily.temperature_2m_min[i]
                    )}°
                </div>

                <small>
                    🌧️ ${
                        daily.precipitation_probability_max[i] || 0
                    }%
                </small>

                <small>
                    ☀️ ${
                        daily.uv_index_max[i] !== null
                        ? daily.uv_index_max[i].toFixed(1)
                        : "--"
                    }
                </small>

            </div>

        `;

    }


    $("dailyForecast").innerHTML =
        html;

}



/* =====================================================
   SUN
===================================================== */

function renderSun(){

    const daily =
        weatherData.daily;


    if(!daily){

        return;

    }


    $("sunrise").textContent =
        formatTime(
            daily.sunrise[0],
            selectedTimezone
        );


    $("sunset").textContent =
        formatTime(
            daily.sunset[0],
            selectedTimezone
        );

}



/* =====================================================
   LOCAL CLOCK
===================================================== */

function updateLocalClock(){

    if(!selectedTimezone){

        selectedTimezone = "UTC";

    }


    function tick(){

        try{

            const now =
                new Intl.DateTimeFormat(
                    "en-IN",
                    {
                        timeZone:selectedTimezone,
                        weekday:"long",
                        day:"numeric",
                        month:"long",
                        year:"numeric",
                        hour:"numeric",
                        minute:"2-digit",
                        second:"2-digit",
                        hour12:true
                    }
                ).format(new Date());


            $("localDateTime").textContent =
                "🕐 " + now;


            $("dashboardLocalTime").textContent =
                new Intl.DateTimeFormat(
                    "en-IN",
                    {
                        timeZone:selectedTimezone,
                        hour:"numeric",
                        minute:"2-digit",
                        second:"2-digit",
                        hour12:true
                    }
                ).format(new Date());

        }catch(error){

            console.error(error);

        }

    }


    tick();


    if(window.localClockTimer){

        clearInterval(
            window.localClockTimer
        );

    }


    window.localClockTimer =
        setInterval(
            tick,
            1000
        );

}



/* =====================================================
   CHARTS
===================================================== */

function renderCharts(){

    const hourly =
        weatherData.hourly;


    if(!hourly){

        return;

    }


    const labels =
        hourly.time
            .slice(0,24)
            .map(
                time =>
                    formatTime(
                        time,
                        selectedTimezone
                    )
            );


    const temps =
        hourly.temperature_2m
            .slice(0,24);


    const rain =
        hourly.precipitation_probability
            .slice(0,24);



    if(temperatureChart){

        temperatureChart.destroy();

    }


    if(rainChart){

        rainChart.destroy();

    }



    temperatureChart =
        new Chart(
            $("temperatureChart"),
            {

                type:"line",

                data:{

                    labels,

                    datasets:[{

                        label:"Temperature °C",

                        data:temps,

                        borderWidth:3,

                        tension:.35,

                        fill:false

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    plugins:{

                        legend:{
                            labels:{
                                color:"#d8edf7"
                            }
                        }

                    },

                    scales:{

                        x:{
                            ticks:{
                                color:"#7895a7"
                            },

                            grid:{
                                color:"rgba(255,255,255,.05)"
                            }

                        },

                        y:{
                            ticks:{
                                color:"#7895a7"
                            },

                            grid:{
                                color:"rgba(255,255,255,.05)"
                            }

                        }

                    }

                }

            }
        );



    rainChart =
        new Chart(
            $("rainChart"),
            {

                type:"bar",

                data:{

                    labels,

                    datasets:[{

                        label:"Rain Probability %",

                        data:rain,

                        borderWidth:1

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    plugins:{

                        legend:{
                            labels:{
                                color:"#d8edf7"
                            }
                        }

                    },

                    scales:{

                        x:{
                            ticks:{
                                color:"#7895a7"
                            },

                            grid:{
                                color:"rgba(255,255,255,.05)"
                            }

                        },

                        y:{
                            min:0,
                            max:100,

                            ticks:{
                                color:"#7895a7"
                            },

                            grid:{
                                color:"rgba(255,255,255,.05)"
                            }

                        }

                    }

                }

            }
        );

}



/* =====================================================
   AIR QUALITY
===================================================== */

async function loadAirQuality(){

    if(!currentLocation){

        return;

    }


    try{

        const params =
            new URLSearchParams({

                latitude:
                    currentLocation.latitude,

                longitude:
                    currentLocation.longitude,

                current:
                    [
                        "us_aqi",
                        "pm2_5",
                        "pm10",
                        "ozone",
                        "nitrogen_dioxide"
                    ].join(","),

                timezone:"auto"

            });


        const response =
            await fetch(
                AIR_URL +
                "?" +
                params.toString()
            );


        if(!response.ok){

            throw new Error(
                "Air quality error"
            );

        }


        const data =
            await response.json();


        const current =
            data.current || {};


        $("aqi").textContent =
            current.us_aqi ?? "--";


        $("pm25").textContent =
            current.pm2_5 !== undefined
                ? current.pm2_5.toFixed(1) + " μg/m³"
                : "--";


        $("pm10").textContent =
            current.pm10 !== undefined
                ? current.pm10.toFixed(1) + " μg/m³"
                : "--";


        $("ozone").textContent =
            current.ozone !== undefined
                ? current.ozone.toFixed(1) + " μg/m³"
                : "--";


        $("no2").textContent =
            current.nitrogen_dioxide !== undefined
                ? current.nitrogen_dioxide.toFixed(1) + " μg/m³"
                : "--";


        $("aqiStatus").textContent =
            aqiStatus(
                current.us_aqi
            );


    }catch(error){

        console.error(error);

        $("aqiStatus").textContent =
            "Unavailable";

    }

}



/* =====================================================
   AQI STATUS
===================================================== */

function aqiStatus(value){

    if(value === undefined || value === null){

        return "--";

    }

    if(value <= 50){

        return "Good";

    }

    if(value <= 100){

        return "Moderate";

    }

    if(value <= 150){

        return "Unhealthy for Sensitive Groups";

    }

    if(value <= 200){

        return "Unhealthy";

    }

    if(value <= 300){

        return "Very Unhealthy";

    }

    return "Hazardous";

}



/* =====================================================
   EARTHQUAKES
===================================================== */

async function loadEarthquakes(){

    if(!map){

        return;

    }


    try{

        const response =
            await fetch(
                EARTHQUAKE_URL
            );


        if(!response.ok){

            throw new Error(
                "Earthquake API error"
            );

        }


        const data =
            await response.json();


        const features =
            data.features || [];


        /*
          Clear old earthquake markers.
        */

        if(earthquakeLayer){

            earthquakeLayer.clearLayers();

        }


        earthquakeLayer =
            L.layerGroup();


        const recent =
            features
                .filter(
                    feature =>
                        feature.geometry &&
                        feature.geometry.coordinates
                )
                .sort(
                    (a,b) =>
                        (
                            b.properties.mag || 0
                        ) -
                        (
                            a.properties.mag || 0
                        )
                );


        recent
            .slice(0,50)
            .forEach(
                feature => {

                    const coordinates =
                        feature.geometry.coordinates;


                    const longitude =
                        coordinates[0];

                    const latitude =
                        coordinates[1];

                    const depth =
                        coordinates[2];


                    const magnitude =
                        feature.properties.mag;


                    const place =
                        feature.properties.place ||
                        "Unknown location";


                    const time =
                        feature.properties.time
                            ? new Date(
                                feature.properties.time
                            ).toLocaleString(
                                "en-IN"
                            )
                            : "--";


                    const radius =
                        Math.max(
                            5,
                            Math.min(
                                18,
                                (magnitude || 1) * 3
                            )
                        );


                    const circle =
                        L.circleMarker(
                            [
                                latitude,
                                longitude
                            ],
                            {

                                radius,

                                color:"#ff625f",

                                fillColor:"#ff3f3f",

                                fillOpacity:.75,

                                weight:2

                            }
                        );


                    circle.bindPopup(`

                        <strong>
                            🌎 Earthquake
                        </strong>

                        <br>

                        <b>
                            Magnitude:
                        </b>
                        ${
                            magnitude !== null
                            ? magnitude.toFixed(1)
                            : "--"
                        }

                        <br>

                        <b>
                            Location:
                        </b>
                        ${escapeHTML(place)}

                        <br>

                        <b>
                            Depth:
                        </b>
                        ${
                            depth !== undefined
                            ? depth.toFixed(1)
                            : "--"
                        }
                        km

                        <br>

                        <b>
                            Time:
                        </b>
                        ${escapeHTML(time)}

                    `);


                    earthquakeLayer.addLayer(
                        circle
                    );

                }
            );


        earthquakeLayer.addTo(map);


        renderEarthquakeList(
            recent.slice(0,10)
        );


    }catch(error){

        console.error(error);

        $("earthquakeList").innerHTML =
            `
            <div class="error-message">
                Earthquake information is temporarily unavailable.
            </div>
            `;

    }

}



/* =====================================================
   EARTHQUAKE LIST
===================================================== */

function renderEarthquakeList(features){

    if(!features.length){

        $("earthquakeList").innerHTML =
            `
            <div class="alert-box safe">
                No recent earthquake data available.
            </div>
            `;

        return;

    }


    $("earthquakeList").innerHTML =
        features.map(
            feature => {

                const p =
                    feature.properties || {};


                const magnitude =
                    p.mag !== null &&
                    p.mag !== undefined
                        ? p.mag.toFixed(1)
                        : "--";


                const place =
                    p.place ||
                    "Unknown location";


                const time =
                    p.time
                        ? new Date(
                            p.time
                        ).toLocaleString(
                            "en-IN"
                        )
                        : "--";


                return `

                    <div class="earthquake-item">

                        <div class="earthquake-mag">
                            M ${magnitude}
                        </div>

                        <div class="earthquake-info">

                            <strong>
                                ${escapeHTML(place)}
                            </strong>

                            <small>
                                🕐 ${escapeHTML(time)}
                            </small>

                        </div>

                    </div>

                `;

            }
        ).join("");

}



/* =====================================================
   STORM / WEATHER ALERT
===================================================== */

async function loadStormAlerts(){

    const box =
        $("stormAlerts");


    /*
      Open-Meteo provides weather forecasts globally,
      but not a universal official global warning feed.

      For now we detect severe current conditions
      from weather code and explain the limitation.
    */


    if(
        !weatherData ||
        !weatherData.current
    ){

        box.textContent =
            "Weather alert information unavailable.";

        return;

    }


    const code =
        weatherData.current.weather_code;


    if(
        code === 95 ||
        code === 96 ||
        code === 99
    ){

        box.className =
            "alert-box warning";


        box.innerHTML =
            `
            ⚠️ <strong>
                Thunderstorm Conditions
            </strong>

            <br>

            Current weather data indicates
            thunderstorm activity at the selected location.
            Please check your local official weather authority
            for active warnings.
            `;

        return;

    }


    if(
        code === 65 ||
        code === 82
    ){

        box.className =
            "alert-box warning";


        box.innerHTML =
            `
            🌧️ <strong>
                Heavy Rain Conditions
            </strong>

            <br>

            Heavy precipitation is currently indicated.
            Check your local official weather service
            for warnings and safety information.
            `;

        return;

    }


    box.className =
        "alert-box safe";


    box.innerHTML =
        `
        ✅ <strong>
            No severe condition detected by current weather data.
        </strong>

        <br>

        For official emergency warnings, always follow
        your local weather and disaster-management authority.
        `;

}



/* =====================================================
   MAP INITIALIZE
===================================================== */

function initializeMap(){

    if(map){

        return;

    }


    map =
        L.map(
            "map",
            {
                zoomControl:true,
                worldCopyJump:true
            }
        ).setView(
            [
                currentLocation
                    ? currentLocation.latitude
                    : 20,
                currentLocation
                    ? currentLocation.longitude
                    : 0
            ],
            currentLocation ? 7 : 2
        );


    /*
      Standard OpenStreetMap
    */

    standardLayer =
        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom:19,
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        );


    /*
      Satellite-style layer from Esri.
    */

    satelliteLayer =
        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom:19,
                attribution:
                    "Tiles &copy; Esri"
            }
        );


    standardLayer.addTo(map);


    /*
      Layer buttons
    */

    document
        .querySelectorAll(".map-layer")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const layer =
                            button.dataset.layer;


                        document
                            .querySelectorAll(
                                ".map-layer"
                            )
                            .forEach(
                                b =>
                                    b.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        if(
                            layer === "satellite"
                        ){

                            if(
                                map.hasLayer(
                                    standardLayer
                                )
                            ){

                                map.removeLayer(
                                    standardLayer
                                );

                            }


                            satelliteLayer.addTo(
                                map
                            );

                        }else{

                            if(
                                map.hasLayer(
                                    satelliteLayer
                                )
                            ){

                                map.removeLayer(
                                    satelliteLayer
                                );

                            }


                            standardLayer.addTo(
                                map
                            );

                        }


                        if(
                            layer === "earthquakes"
                        ){

                            if(
                                earthquakeLayer
                            ){

                                earthquakeLayer.addTo(
                                    map
                                );

                            }

                        }

                    }
                );

            }
        );



    /*
      Fix map size after rendering.
    */

    setTimeout(
        () => map.invalidateSize(),
        300
    );

}



/* =====================================================
   UPDATE MAP LOCATION
===================================================== */

function updateMapLocation(){

    if(!map || !currentLocation){

        return;

    }


    const lat =
        currentLocation.latitude;

    const lon =
        currentLocation.longitude;


    map.setView(
        [lat,lon],
        8,
        {
            animate:true
        }
    );


    if(locationMarker){

        map.removeLayer(
            locationMarker
        );

    }


    locationMarker =
        L.marker(
            [lat,lon]
        ).addTo(map);


    locationMarker.bindPopup(`

        <strong>
            📍 ${escapeHTML(
                currentLocation.name
            )}
        </strong>

        <br>

        ${
            escapeHTML(
                [
                    currentLocation.admin2,
                    currentLocation.admin1,
                    currentLocation.country
                ]
                .filter(Boolean)
                .join(", ")
            )
        }

        <br>

        <small>
            ${lat.toFixed(5)},
            ${lon.toFixed(5)}
        </small>

    `).openPopup();


    setTimeout(
        () => map.invalidateSize(),
        300
    );

}



/* =====================================================
   MAP SEARCH
===================================================== */

async function searchMapLocation(){

    const query =
        $("mapSearch")
            .value
            .trim();


    if(!query){

        return;

    }


    const results =
        await searchLocations(
            query
        );


    let result =
        results[0];


    /*
      Nominatim fallback
    */

    if(!result){

        const nominatim =
            await searchNominatim(
                query
            );


        if(nominatim.length){

            const item =
                nominatim[0];

            result = {

                name:
                    item.display_name,

                latitude:
                    parseFloat(item.lat),

                longitude:
                    parseFloat(item.lon),

                country:
                    item.address?.country || ""

            };

        }

    }


    if(!result){

        alert(
            "Location not found on map."
        );

        return;

    }


    selectLocation(
        result
    );

}



/* =====================================================
   CURRENT LOCATION
===================================================== */

async function useCurrentLocation(){

    if(!navigator.geolocation){

        alert(
            "Geolocation is not supported by this browser."
        );

        return;

    }


    $("locationMessage").textContent =
        "📍 Detecting your current location...";


    navigator.geolocation.getCurrentPosition(

        async position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            /*
              Reverse geocoding with Nominatim
            */

            let locationData =
                await reverseGeocode(
                    latitude,
                    longitude
                );


            /*
              If reverse geocoding fails,
              still use coordinates.
            */

            if(!locationData){

                locationData = {

                    name:"Current Location",

                    latitude,

                    longitude,

                    country:"",

                    admin1:"",

                    admin2:"",

                    postcode:"",

                    timezone:"auto"

                };

            }


            locationData.latitude =
                latitude;

            locationData.longitude =
                longitude;


            $("locationMessage").textContent =
                "📍 Location detected successfully.";


            selectLocation(
                locationData
            );

        },


        error => {

            console.error(error);


            $("locationMessage").textContent =
                "Unable to detect location.";


            if(error.code === 1){

                alert(
                    "Location permission was denied. Please allow location access in your browser settings."
                );

            }else{

                alert(
                    "Could not detect your location. Please search your location manually."
                );

            }

        },


        {
            enableHighAccuracy:true,

            timeout:15000,

            maximumAge:300000

        }

    );

}



/* =====================================================
   REVERSE GEOCODE
===================================================== */

async function reverseGeocode(
    latitude,
    longitude
){

    try{

        const url =
            NOMINATIM_URL +
            "/reverse?format=jsonv2&addressdetails=1&lat=" +
            encodeURIComponent(latitude) +
            "&lon=" +
            encodeURIComponent(longitude);


        const response =
            await fetch(
                url
            );


        if(!response.ok){

            return null;

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
                address.county ||
                address.state_district ||
                "Current Location",

            latitude,

            longitude,

            country:
                address.country || "",

            admin1:
                address.state || "",

            admin2:
                address.county ||
                address.state_district ||
                "",

            postcode:
                address.postcode || "",

            timezone:"auto"

        };


    }catch(error){

        console.error(error);

        return null;

    }

}



/* =====================================================
   RECENT SEARCHES
===================================================== */

function getRecentSearches(){

    try{

        return JSON.parse(
            localStorage.getItem(
                "earthpulseRecentSearches"
            ) || "[]"
        );

    }catch{

        return [];

    }

}



function saveRecentSearch(location){

    const list =
        getRecentSearches();


    const item = {

        name:location.name,

        latitude:location.latitude,

        longitude:location.longitude,

        country:location.country,

        admin1:location.admin1,

        admin2:location.admin2,

        postcode:location.postcode,

        timezone:location.timezone

    };


    const filtered =
        list.filter(
            x =>
                !(
                    Math.abs(
                        x.latitude -
                        item.latitude
                    ) < 0.001 &&
                    Math.abs(
                        x.longitude -
                        item.longitude
                    ) < 0.001
                )
        );


    filtered.unshift(item);


    localStorage.setItem(
        "earthpulseRecentSearches",
        JSON.stringify(
            filtered.slice(0,8)
        )
    );

}



/* =====================================================
   RENDER RECENT
===================================================== */

function renderRecentSearches(){

    const list =
        getRecentSearches();


    if(!list.length){

        $("recentSearches").innerHTML =
            "<p>No recent searches.</p>";

        return;

    }


    $("recentSearches").innerHTML =
        list.map(
            (item,index) => {

                return `

                    <div
                        class="recent-item"
                        data-index="${index}"
                    >

                        🕘
                        ${escapeHTML(
                            item.name
                        )}

                    </div>

                `;

            }
        ).join("");


    $("recentSearches")
        .querySelectorAll(
            ".recent-item"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    () => {

                        const item =
                            list[
                                parseInt(
                                    element.dataset.index
                                )
                            ];

                        selectLocation(
                            item
                        );

                    }
                );

            }
        );

}



/* =====================================================
   FAVORITES
===================================================== */

function getFavorites(){

    try{

        return JSON.parse(
            localStorage.getItem(
                "earthpulseFavorites"
            ) || "[]"
        );

    }catch{

        return [];

    }

}



function saveFavorites(list){

    localStorage.setItem(
        "earthpulseFavorites",
        JSON.stringify(list)
    );

}



function addCurrentFavorite(){

    if(!currentLocation){

        return;

    }


    const list =
        getFavorites();


    const exists =
        list.some(
            item =>
                Math.abs(
                    item.latitude -
                    currentLocation.latitude
                ) < .001 &&
                Math.abs(
                    item.longitude -
                    currentLocation.longitude
                ) < .001
        );


    if(exists){

        alert(
            "This location is already in favorites."
        );

        return;

    }


    list.unshift({

        name:currentLocation.name,

        latitude:currentLocation.latitude,

        longitude:currentLocation.longitude,

        country:currentLocation.country,

        admin1:currentLocation.admin1,

        admin2:currentLocation.admin2,

        postcode:currentLocation.postcode,

        timezone:currentLocation.timezone

    });


    saveFavorites(
        list.slice(0,10)
    );


    renderFavorites();


    alert(
        "⭐ Location added to favorites."
    );

}



/* =====================================================
   RENDER FAVORITES
===================================================== */

function renderFavorites(){

    const list =
        getFavorites();


    if(!list.length){

        $("favoritesList").innerHTML =
            "<p>No favorite locations yet.</p>";

        return;

    }


    $("favoritesList").innerHTML =
        list.map(
            (item,index) => {

                return `

                    <div
                        class="favorite-item"
                    >

                        <span
                            class="favorite-open"
                            data-index="${index}"
                        >

                            ⭐
                            ${escapeHTML(
                                item.name
                            )}

                        </span>


                        <button
                            class="delete-favorite"
                            data-index="${index}"
                            title="Remove favorite"
                        >

                            ✕

                        </button>

                    </div>

                `;

            }
        ).join("");


    $("favoritesList")
        .querySelectorAll(
            ".favorite-open"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    () => {

                        const item =
                            list[
                                parseInt(
                                    element.dataset.index
                                )
                            ];

                        selectLocation(
                            item
                        );

                    }
                );

            }
        );


    $("favoritesList")
        .querySelectorAll(
            ".delete-favorite"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const index =
                            parseInt(
                                button.dataset.index
                            );


                        list.splice(
                            index,
                            1
                        );


                        saveFavorites(
                            list
                        );


                        renderFavorites();

                    }
                );

            }
        );

}



/* =====================================================
   REFRESH
===================================================== */

async function refreshEverything(){

    if(!currentLocation){

        return;

    }


    $("weatherCondition").textContent =
        "Refreshing...";


    await loadWeather();

    await loadAirQuality();

    await loadEarthquakes();

    await loadStormAlerts();


    if(map){

        setTimeout(
            () => map.invalidateSize(),
            300
        );

    }

}



/* =====================================================
   LANDING SEARCH
===================================================== */

$("searchBtn")
    .addEventListener(
        "click",
        () => {

            performSearch(
                $("locationSearch").value,
                $("searchResults")
            );

        }
    );


$("locationSearch")
    .addEventListener(
        "keydown",
        event => {

            if(event.key === "Enter"){

                performSearch(
                    $("locationSearch").value,
                    $("searchResults")
                );

            }

        }
    );



/* =====================================================
   DASHBOARD SEARCH
===================================================== */

$("dashboardSearchBtn")
    .addEventListener(
        "click",
        () => {

            performSearch(
                $("dashboardSearch").value,
                $("dashboardSearchResults")
            );

        }
    );


$("dashboardSearch")
    .addEventListener(
        "keydown",
        event => {

            if(event.key === "Enter"){

                performSearch(
                    $("dashboardSearch").value,
                    $("dashboardSearchResults")
                );

            }

        }
    );



/* =====================================================
   CURRENT LOCATION BUTTONS
===================================================== */

$("currentLocationBtn")
    .addEventListener(
        "click",
        useCurrentLocation
    );


$("myLocationBtn")
    .addEventListener(
        "click",
        useCurrentLocation
    );



/* =====================================================
   REFRESH
===================================================== */

$("refreshBtn")
    .addEventListener(
        "click",
        refreshEverything
    );



/* =====================================================
   MAP SEARCH
===================================================== */

$("mapSearchBtn")
    .addEventListener(
        "click",
        searchMapLocation
    );


$("mapSearch")
    .addEventListener(
        "keydown",
        event => {

            if(event.key === "Enter"){

                searchMapLocation();

            }

        }
    );



/* =====================================================
   FAVORITE BUTTON
===================================================== */

$("addFavoriteBtn")
    .addEventListener(
        "click",
        addCurrentFavorite
    );



/* =====================================================
   CLEAR HISTORY
===================================================== */

$("clearHistoryBtn")
    .addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "earthpulseRecentSearches"
            );


            renderRecentSearches();

        }
    );



/* =====================================================
   INITIAL RENDER
===================================================== */

renderFavorites();

renderRecentSearches();



/* =====================================================
   OPTIONAL: TRY CURRENT LOCATION ON FIRST PAGE
===================================================== */

/*
   We DO NOT automatically request GPS permission
   when page loads.

   User must click:
   "Use Current Location"

   This is better for browser privacy and
   avoids unexpected permission prompts.
*/


console.log(
    "🌍 EarthPulse initialized successfully."
);
