window.geolocation = {}
window.sunTimes = {}
window.NOAAData = {}
// navigator.geolocation.getCurrentPosition(getNOAAData)
// navigator.geolocation.getCurrentPosition(getSunTimes)
// setInterval(() => {
//     getNOAAData()
//     getSunTimes()
// }, 1800000)

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
    const now = new Date()
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
const forecastDayButtons = document.querySelectorAll('.weather-overlay .days button')
for (let i=0; i<forecastDayButtons.length; i++) {
    forecastDayButtons[i].addEventListener('click', () => {
        forecastDayButtons.forEach(button => button.classList = '')
        forecastDayButtons[i].classList = 'selected'

        const days = document.querySelectorAll('.weather-overlay .hours .day')
        days.forEach(day => day.classList = 'day')
        selectedDay = document.querySelector(`.weather-overlay .hours .day:nth-child(${i+1})`)
        selectedDay.classList.add('active')
    })
}

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
    const response = await getResource(`https://api.sunrise-sunset.org/json?lat=${window.geolocation.latitude.toFixed(4)}&lng=${window.geolocation.longitude.toFixed(4)}&formatted=0`) 
    const sunTimes = {
        sunrise: clock.time.text(parseIsoDatetime(response.results.sunrise)),
        sunset: clock.time.text(parseIsoDatetime(response.results.sunset))
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
    const response = await getResource(`https://api.weather.gov/points/${window.geolocation.latitude.toFixed(4)},${window.geolocation.longitude.toFixed(4)}`)
    const linkedData = {
        station: {
            url: (await getResource(response.properties.observationStations)).observationStations[0],
        },
        raw: (await getResource(response.properties.forecastGridData)).properties,
        hourlyForecast: (await getResource(response.properties.forecastHourly)).properties
    }
    linkedData.station.latest = await getResource(linkedData.station.url + '/observations/latest')
    
    console.log(linkedData)
    
    const tempDisplay = document.querySelector('.weather .now .temp')
    const statusDisplay = document.querySelector('.weather .now .status')
    const overlayTempDisplay = document.querySelector('.weather-overlay .now .temp')
    const overlayStatusDisplay = document.querySelector('.weather-overlay .now .status')

    tempDisplay.innerText = celToFahr(linkedData.station.latest.properties.temperature.value) + '°F'
    statusDisplay.innerText = linkedData.station.latest.properties.textDescription
    overlayTempDisplay.innerText = celToFahr(linkedData.station.latest.properties.temperature.value) + '°F'
    overlayStatusDisplay.innerText = linkedData.station.latest.properties.textDescription

    let date = new Date()
    for (let i=0; i<7; i++) {
        const dayName = i ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date) : 'Today'
        const forecastSlice = linkedData.hourlyForecast.periods.filter(
            period => getDayOfYear(new Date(period.startTime)) === getDayOfYear(date)
        )
        let tempSum = 0
        forecastSlice.forEach(period => tempSum += period.temperature)
        const avgTemp = Math.round(tempSum/forecastSlice.length)
        const minTemp = Math.min.apply(Math, forecastSlice.map(function (period) { return period.temperature }))
        const maxTemp = Math.max.apply(Math, forecastSlice.map(function (period) { return period.temperature }))

        let dailyForecastHTML = ''
        dailyForecastHTML += `
            <div class='name'>${dayName}</div>
            <div class='temp'>${avgTemp}°F</div>
            <div class='temp-range'>
                <span class='min'>${minTemp}°F</span>
                <span class='max'>${maxTemp}°F</span>
            </div>
        `
        const dailyForecast = document.querySelector(`.weather-overlay .days button:nth-child(${i+1}`)
        dailyForecast.innerHTML = dailyForecastHTML
        
        let hourlyForecastHTML = ''
        forecastSlice.forEach(period => {
            hourlyForecastHTML += `
                <div class='hour' data-time='${period.startTime}'>
                    <div class='time'>${clock.time.text(new Date(period.startTime))}</div>
                    <div class='temp'>${period.temperature}°</div>
                    <div class='description'>${period.shortForecast}</div>
                </div>
            `
        })
        const hourlyForecast = document.querySelector(`.weather-overlay .hours > div:nth-child(${i+1})`)
        hourlyForecast.innerHTML = hourlyForecastHTML

        date.setDate(date.getDate() + 1)
    }
    
}
function getDayOfYear(date) {
    const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    const mn = date.getMonth()
    const dn = date.getDate()
    const dayOfYear = dayCount[mn] + dn
    if (mn > 1 && isLeapYear(date)) dayOfYear++
    return dayOfYear
}
function isLeapYear(date) {
    const year = date.getFullYear()
    if ((year & 3) != 0) return false
    return ((year % 100) != 0 || (year % 400) == 0)
}
async function getResource(link) {
    const request = await fetch(link)
    return request.json()
}
function parseIsoDatetime(dateString) {
    return new Date(dateString)
}
function celToFahr(celsius) {
    return Math.round((celsius * 1.8) + 32)
}
