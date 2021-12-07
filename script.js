
window.geolocation = {}
window.sunTimes = {}
window.NOAAData = {}
navigator.geolocation.getCurrentPosition(getNOAAData)
navigator.geolocation.getCurrentPosition(getSunTimes)
setInterval(() => {
    getNOAAData()
    getSunTimes()
}, 1800000)

const clock = {
    date: {
        text: (date) => { return date.toDateString() },
        element: document.querySelector('.clock .date')
    },
    time: {
        text: (date) => { return date.getHours() + ':' + (date.getMinutes().toString().length === 1 ? '0' + date.getMinutes() : date.getMinutes()) },
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
    document.body.classList = 'wifi-transition'
    setTimeout(() => {
        document.body.classList = 'wifi-overlaid'
    },100)
})
const weatherButton = document.querySelector('button.weather')
weatherButton.addEventListener('click', () => {
    document.body.classList = 'weather-transition'
    setTimeout(() => {
        document.body.classList = 'weather-overlaid'
    },100)
})
const forecastDayButtons = document.querySelectorAll('.weather-overlay .days button')
for (let i = 0; i < forecastDayButtons.length; i++) {
    forecastDayButtons[i].addEventListener('click', () => {
        forecastDayButtons.forEach(button => button.classList = '')
        forecastDayButtons[i].classList = 'selected'
        const days = document.querySelectorAll('.weather-overlay .hours .day')
        days.forEach(day => day.classList = 'day')
        selectedDay = document.querySelector(`.weather-overlay .hours .day:nth-child(${i + 1})`)
        selectedDay.classList.add('active')
    })
}

const wifiCloser = document.querySelector('.wifi-overlay button.close')
wifiCloser.addEventListener('click', () => {
    document.body.classList = 'wifi-transition'
    setTimeout(() => {
        document.body.classList = ''
    },100)
})

const weatherCloser = document.querySelector('.weather-overlay button.close')
weatherCloser.addEventListener('click', () => {
    document.body.classList = 'weather-transition'
    setTimeout(() => {
        document.body.classList = ''
    }, 100)
})

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
        hourlyForecast: (await getResource(response.properties.forecastHourly)).properties,
        raw: (await getResource(response.properties.forecastGridData)).properties,
        station: {
            url: (await getResource(response.properties.observationStations)).observationStations[0],
        }
    }
    linkedData.station.latest = await getResource(linkedData.station.url + '/observations/latest')
    
    /*
        Oftentimes the stations won't have temperature data and instead return null so this is error handling for that.
        if null, 
        go to next url in the stations list, 
        pull its data,
        and test for emptiness again once the loop comes around
    */
    let stationIndex = 0
    while(linkedData.station.latest.properties.temperature.value === null) {
        stationIndex++
        linkedData.station.url = (await getResource(response.properties.observationStations)).observationStations[stationIndex]
        linkedData.station.latest = await getResource(linkedData.station.url + '/observations/latest')
    }
    
    updateDisplay(linkedData)
}

function updateDisplay(linkedData) {
    const tempDisplay = document.querySelector('.weather .now .temp')
    const statusDisplay = document.querySelector('.weather .now .status')
    const overlayTempDisplay = document.querySelector('.weather-overlay .now .temp')
    const overlayStatusDisplay = document.querySelector('.weather-overlay .now .status')

    tempDisplay.innerText = celToFahr(linkedData.station.latest.properties.temperature.value) + '°'
    statusDisplay.innerText = linkedData.station.latest.properties.textDescription
    overlayTempDisplay.innerText = celToFahr(linkedData.station.latest.properties.temperature.value) + '°'
    overlayStatusDisplay.innerText = linkedData.station.latest.properties.textDescription



    let date = new Date()
    for (let i = 0; i < 7; i++) {
        const dayName = i ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date) : 'Today'
        const forecastSlice = linkedData.hourlyForecast.periods.filter(
            period => getDayOfYear(new Date(period.startTime)) === getDayOfYear(date)
        )

        let tempSum = 0
        forecastSlice.forEach(period => tempSum += period.temperature)
        const avgTemp = Math.round(tempSum / forecastSlice.length)
        const minTemp = Math.min.apply(Math, forecastSlice.map(function (period) { return period.temperature }))
        const maxTemp = Math.max.apply(Math, forecastSlice.map(function (period) { return period.temperature }))

        let dailyForecastHTML = ''
        dailyForecastHTML += `
            <div class='name'>${dayName}</div>
            <div class='temp'>${avgTemp}°</div>
            <div class='temp-range'>
                <div class='min'>${minTemp}°</div>
                <div class='max'>${maxTemp}°</div>
            </div>
        `
        const dailyForecast = document.querySelector(`.weather-overlay .days button:nth-child(${i + 1}`)
        dailyForecast.innerHTML = dailyForecastHTML
        if (i === 0 && !document.body.classList.contains('weather-overlaid')) dailyForecast.classList.add('selected')

        let hourlyForecastHTML = ''
        hourlyForecastHTML += `
            <h3 class='date'>${clock.date.text(date)}</h3>
            <div class='forecast'>
        `
        tempsList = []
        labelsList = []
        forecastSlice.forEach(period => {
            tempsList.push(period.temperature)
            labelsList.push(clock.time.text(new Date(period.startTime)))
            hourlyForecastHTML += `
                <div class='hour' data-time='${period.startTime}'>
                    <div class='time'>${clock.time.text(new Date(period.startTime))}</div>
                    <div class='temp'>${period.temperature}°</div>
                    <div class='description'>${period.shortForecast}</div>
                </div>
            `
        })
        hourlyForecastHTML += '</div>'
        const hourlyForecast = document.querySelector(`.weather-overlay .hours > .day:nth-child(${i + 1})`)
        hourlyForecast.innerHTML = hourlyForecastHTML

        const ctx = document.createElement('canvas')
        ctx.width = 748
        ctx.height = 200
        hourlyForecast.appendChild(ctx)

        const tempsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelsList,
                datasets: [{
                    fill: false,
                    label: '',
                    pointBackgroundColor: '#2196f3',
                    pointBorderColor: '#2f3441',
                    pointRadius: 5,
                    borderColor: 'white',
                    borderWidth: 1,
                    tension: 0.5,
                    data: tempsList
                }],
            },
            options: {
                responsive: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'white',
                            autoSkip: true,
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        ticks: {
                            color: 'white',
                            stepSize: 1,
                            autoSkip: true,
                            maxTicksLimit: 6,
                            callback: function (value, index, values) {
                                return + value + '°'
                            }
                        }
                    }
                },
                animation: {
                    duration: 0
                }
            }
        })

        if (i === 0 && !document.body.classList.contains('weather-overlaid')) hourlyForecast.classList.add('active')

        date.setDate(date.getDate() + 1)
    }
}
function getDayOfYear(date) {
    const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    const mn = date.getMonth()
    const dn = date.getDate()
    let dayOfYear = dayCount[mn] + dn
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
