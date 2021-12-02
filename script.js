window.geolocation = {}
navigator.geolocation.getCurrentPosition(getNOAAData)
navigator.geolocation.getCurrentPosition(getSunTimes)
setInterval(() => {
    getNOAAData()
    getSunTimes()
}, 1800000)

const clock = {
    date: {
        text: (date) => {return date.toDateString()},
        element: document.querySelector('.clock .date')
    },
    time: {
        text: (date) => {return date.getHours() + ':' + (date.getMinutes().toString().length === 1 ? '0' + date.getMinutes() : date.getMinutes())},
        element: document.querySelector('.clock .time')
    }
}
const now = new Date()
clock.date.element.innerText = clock.date.text(now)
clock.time.element.innerText = clock.time.text(now)
setInterval(() => {
    clock.date.element.innerText = clock.date.text(now)
    clock.time.element.innerText = clock.time.text(now)
}, 1000)

const wifiButton = document.querySelector('button.wifi')
wifiButton.addEventListener('click', () => {
    document.body.classList.add('wifi-overlaid')
})
const weatherButton = document.querySelector('button.weather')
weatherButton.addEventListener('click', () => {
    document.body.classList.add('weather-overlaid')
})

const closers = document.querySelectorAll('button.close')
for (button of closers) {
    button.addEventListener('click', () => {
        document.body.classList = ''
    })
}

async function getSunTimes(location) {
    if (!window.geolocation.latitude) {
        window.geolocation.latitude = location.coords.latitude
        window.geolocation.longitude = location.coords.longitude
    }
    const data = await getResource(`https://api.sunrise-sunset.org/json?lat=${window.geolocation.latitude.toFixed(4)}&lng=${window.geolocation.longitude.toFixed(4)}&formatted=0`) 
    const sunTimes = {
        sunrise: clock.time.text(parseIsoDatetime(data.results.sunrise)),
        sunset: clock.time.text(parseIsoDatetime(data.results.sunset))
    }
    const sunriseDisplay = document.querySelector('.weather .sunrise span')
    const sunsetDisplay = document.querySelector('.weather .sunset span')
    sunriseDisplay.innerText = sunTimes.sunrise
    sunsetDisplay.innerText = sunTimes.sunset
}
async function getNOAAData(location) {
    if (!window.geolocation.latitude) {
        window.geolocation.latitude = location.coords.latitude
        window.geolocation.longitude = location.coords.longitude
    }
    const data = await getResource(`https://api.weather.gov/points/${window.geolocation.latitude.toFixed(4)},${window.geolocation.longitude.toFixed(4)}`)
    const linkedData = {
        station: {
            name: (await getResource(data.properties.observationStations)).observationStations[0],
        },
        raw: (await getResource(data.properties.forecastGridData)).properties,
        hourlyForecast: (await getResource(data.properties.forecastHourly)).properties
    }
    linkedData.station.latest = await getResource(linkedData.station.name + '/observations/latest')
    
    console.log(linkedData)
    const tempDisplay = document.querySelector('.weather .now .temp')
    tempDisplay.innerText = celToFahr(linkedData.station.latest.properties.temperature.value) + '°F'
    const statusDisplay = document.querySelector('.weather .now .status')
    statusDisplay.innerText = linkedData.station.latest.properties.textDescription
}
async function getResource(link) {
    const request = await fetch(link)
    return request.json()
}
function parseIsoDatetime(dateString) {
    const dateArray = dateString.split(/[: T-]/).map(parseFloat);
    return new Date(dateArray[0], dateArray[1] - 1, dateArray[2], dateArray[3] || 0, dateArray[4] || 0, dateArray[5] || 0, 0);
}
function celToFahr(celsius) {
    return Math.round((celsius * 1.8) + 32)
}