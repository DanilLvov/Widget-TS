const API_KEY_WEATHER:   string           = "43d1aa5ef74873f699e896ebd9252a24";
const HTML_DATE:         HTMLDivElement   = <HTMLDivElement> document.getElementById("timestamp");
const MAP:               HTMLDivElement   = <HTMLDivElement> document.getElementById("map");
const AUTOCOMPLETE_FORM: HTMLInputElement = <HTMLInputElement>document.getElementById('autocomplete');
const month:             string[]         = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dayName:           string[]         = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const weatherToIcon = new Map <string, string> ([
    ["Thunderstorm", "Thunderstorm"],
    ["Drizzle", "Rainy"],
    ["Rain", "Rainy"],
    ["Snow", "Cloudy_Snowing"],
    ["Clear", "Sunny"],
    ["Clouds", "Cloud"]
]);



interface WeatherBox {
    day_box?:     HTMLElement;
    day?:         HTMLElement;
    temperature?: HTMLElement;
    weatherText?: HTMLElement;
    weather_icon: HTMLElement;
    humidity:     HTMLElement;
    wind?:        HTMLElement;
}


type Coords = {
    lat: number;
    lon: number;
}

interface HourData {
    dt: number;
    main: {
        temp:     number;
        humidity: number;
    }
    weather: {
        id:          number;
        main:        string;
        description: string;
        icon:        string;
    } []
    clouds: {
        all: number;
    }
    wind: {
        speed: number;
    }
    dt_txt: string;
}

interface WeatherData {
    list: HourData[];
    city: {
        name: string;
        coord: Coords;
    }
}

const DEFAULT_CORDS: Coords = { lat: 49.14, lon: 28.19}
let fourDayWeather:    WeatherData;
let bigWeatherBox:     WeatherBox;
let smallWeatherBoxes: WeatherBox[] = [];
let arrayOfDates:      string[] = [];

window.onload = () => {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
}

const successCallback = (position: GeolocationPosition) => {
    let coords: Coords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };

   initAll(coords);
};

const errorCallback = (error) => {
    initAll(DEFAULT_CORDS);
};

async function initAll(coords: Coords) {
    initAutocomplete();

    let day: Date[] = [];
    for (let i = 0; i < 4; ++i) {
        day[i] = new Date();
        console.log(day[i].getDate() + i);
        day[i].setDate(day[i].getDate() + i);
    }

    bigWeatherBox = {
        temperature:  document.getElementById("temperature_now"),
        humidity:     document.getElementById("humidity_now"),
        weather_icon: document.getElementById("weather_now"),
        wind:         document.getElementById("wind_now"),
        weatherText:  document.getElementById("weatherDescription")
    }

    for (let i = 0; i < 4; ++i) {
        smallWeatherBoxes[i] = {
            day_box:      document.getElementById("day" + (i + 1)),
            day:          document.getElementById("day" + (i + 1) + "_text"),
            humidity:     document.getElementById("day" + (i + 1) + "_humidity"),
            weather_icon: document.getElementById("day" + (i + 1) + "_icon"),
        };

        arrayOfDates[i] =
            dayName[day[i].getDay()].toString() + ", " +
            month[day[i].getMonth()] + " " +
            day[i].getDate() + ", " + day[i].getFullYear();
        console.log(smallWeatherBoxes);
        smallWeatherBoxes[i].day.innerHTML = month[day[i].getMonth()]  + " " + day[i].getDate();
    }

    HTML_DATE.innerHTML = arrayOfDates[1];
    smallWeatherBoxes[0].day.innerHTML = "Today";

    fourDayWeather = await loadWeather(coords);
    changeWeather();

    clickOnBox(0);
    //TODO: add coordinates to map initialization
    initMap(coords);
    return 1
}

function changeWeather() {
    changeBigBox(0);
    for (let i = 0; i < 4; ++i) {
        smallWeatherBoxes[i].humidity.innerHTML = fourDayWeather.list[i].main.humidity + "%";
        smallWeatherBoxes[i].weather_icon.innerHTML
            = weatherToIcon.get(fourDayWeather.list[i].weather[0].main);
    }
}

function changeBigBox(num: number) {
    console.log(fourDayWeather);
    bigWeatherBox.temperature.innerHTML
        = (fourDayWeather.list[num].main.temp - 273.15).toFixed(0).toString();
    bigWeatherBox.weatherText.innerHTML
        = fourDayWeather.list[num].weather[0].main;
    bigWeatherBox.humidity.innerHTML
        = fourDayWeather.list[num].main.humidity + "%";
    bigWeatherBox.wind.innerHTML
        = fourDayWeather.list[num].wind.speed + "km/h";
    bigWeatherBox.weather_icon.innerHTML
        = weatherToIcon.get(fourDayWeather.list[num].weather[0].main);
}
async function handleChange(coords: Coords) {

    //const weatherData: WeatherData = await loadWeather(coords);
    //render(weatherData);
}

async function loadWeather(coords: Coords) {

    const URL = "https://api.openweathermap.org/data/2.5/forecast?lat="
        + coords.lat + "&lon=" + coords.lon + "&appid="
        + API_KEY_WEATHER;

    const response:  Response   = await fetch (URL);
    let weatherData: WeatherData = await response.json();
    let hourData:    HourData[] = {} as HourData[];

    hourData[0] = weatherData.list[0];
    let currentDate: number = +hourData[0].dt_txt.slice(8, 10);
    let i: number = 1;
    weatherData.list.forEach (
        hourForecast => {
            let hour: number = +hourForecast.dt_txt.slice(11, 13);
            let day:  number = +hourForecast.dt_txt.slice(8, 10);
            if (hour === 12 && day > currentDate && day < currentDate + 4 ) {
                hourData[i++] = hourForecast;
                console.log(i);
            }
        }
    )
    weatherData.list = hourData;

    if (!response.ok) return;
    return weatherData;
}

let map: google.maps.Map;
let marker: google.maps.Marker;
let autocomplete: google.maps.places.Autocomplete;

function initMap(coords: Coords): void {
    map = new google.maps.Map(document.getElementById("map") as HTMLElement);
    marker = new google.maps.Marker({ map: map });

    map.setZoom(11);
    map.setCenter({lat: coords.lat, lng: coords.lon});
}

function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(
        AUTOCOMPLETE_FORM, { types: ['(cities)']}
    );

    google.maps.event.addListener(autocomplete, 'place_changed', onPlaceChange);
}

function onPlaceChange() {
    const place = autocomplete.getPlace();
    const geocoder = new google.maps.Geocoder();
    geocoder
        .geocode({ placeId: place.place_id })
        .then(async ({results}) => {
            map.setZoom(11);
            map.setCenter(results[0].geometry.location);

            // @ts-ignore TODO This should be in @typings/googlemaps.
            marker.setPlace({
                placeId: place.place_id,
                location: results[0].geometry.location,
            });

            marker.setVisible(true);

            fourDayWeather = await loadWeather({
                lat: results[0].geometry.location.lat(),
                lon: results[0].geometry.location.lat()
            });
            changeWeather();
        });

    (AUTOCOMPLETE_FORM).value = place.name;
}

function clickOnBox(number: number) {
    for (let i = 0; i < 4; ++i) {
        let box_style = (<HTMLDivElement>smallWeatherBoxes[i].day_box).style;

        box_style.backgroundColor = "#ffffff";
        box_style.color = "#626262";
    }
    let box = (<HTMLDivElement>smallWeatherBoxes[number].day_box);
    box.style.backgroundColor = "#5696f7";
    box.style.color = "#e4eefe";

    HTML_DATE.innerHTML = arrayOfDates[number];
    changeBigBox(number);
}


