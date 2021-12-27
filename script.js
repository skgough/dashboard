'use strict'

Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
})
const video = document.querySelector('.vibe-overlay video')

window.geolocation = {}
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
const vibeButton = document.querySelector('button.vibe') 
vibeButton.addEventListener('click', () => {
    document.body.classList = 'vibe-transition'
    setTimeout(() => {
        document.body.classList = 'vibing-overlaid'
    },100)
    if (lastClick != 0) video.play()
})
const forecastDayButtons = document.querySelectorAll('.weather-overlay .days button')
for (let i = 0; i < forecastDayButtons.length; i++) {
    forecastDayButtons[i].addEventListener('click', () => {
        forecastDayButtons.forEach(button => button.classList.remove('selected'))
        forecastDayButtons[i].classList.add('selected')
        const days = document.querySelectorAll('.weather-overlay .hours .day')
        days.forEach(day => day.classList = 'day')
        const selectedDay = document.querySelector(`.weather-overlay .hours .day:nth-child(${i + 1})`)
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

const vibeGuider = document.querySelector('.vibe-overlay .controls button')
const BPMDisplay = document.querySelector('.vibe-overlay .controls span')
const initialBPM = 120
let BPMList = [initialBPM]
let lastClick = 0
vibeGuider.addEventListener('touchstart', (e) => {
    e.preventDefault()
    if (lastClick == 0) {
        lastClick = performance.now()
        BPMDisplay.innerText = 120
    } else {
        const currentClick = performance.now()
        const timeInterval = currentClick - lastClick
        lastClick = currentClick
        if (timeInterval < 3000) {
            if (BPMList.length >= 10) BPMList.shift()
            BPMList.push(1000/timeInterval * 60)
            const avgBPM =  avg(BPMList)
            BPMDisplay.innerText = (avgBPM < 300) ? Math.round(avgBPM) : '???'
            video.playbackRate = avgBPM/initialBPM
        }
    }
    if (!video.playing) video.play()
    vibeGuider.style = 'transform: scale(.9)'
    setTimeout(() => {
        vibeGuider.style = 'transform: scale(1)'
    }, 50)
})

const vibeCloser = document.querySelector('.vibe-overlay button.close')
vibeCloser.addEventListener('click', () => {
    document.body.classList = 'vibe-transition'
    setTimeout(() => {
        document.body.classList = ''
        ceaseVibing()
    },100)
})
function ceaseVibing() {
    video.pause()
    video.currentTime = 0
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
        hourlyForecast: (await getResource(response.properties.forecastHourly)).properties,
        raw: (await getResource(response.properties.forecastGridData)).properties,
        station: {
            list: (await getResource(response.properties.observationStations)).observationStations
        }
    }
    linkedData.station.latest = await getResource(linkedData.station.list[0] + '/observations/latest')
    
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
        linkedData.station.latest = await getResource(linkedData.station.list[stationIndex] + '/observations/latest')
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

    const tempsCanvas = document.createElement('canvas')
    tempsCanvas.width = 748
    tempsCanvas.height = 200
    const tempsChart = new Chart(tempsCanvas, tempsChartConfig)

    document.querySelectorAll('.weather-overlay .days button').forEach(button => button.classList = '')

    let date = new Date()
    for (let i = 0; i < 7; i++) {
        const dayName = i ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date) : 'Today'
        const forecastSlice = linkedData.hourlyForecast.periods.filter(
            period => getDayOfYear(new Date(period.startTime)) === getDayOfYear(date)
        )
        if (forecastSlice.length < 1) break

        const groupedConditions = []
        for (let i = 0; i< forecastSlice.length; i++) {
            if (i === 0) {
                groupedConditions.push({
                    condition: forecastSlice[i].shortForecast,
                    periods: [forecastSlice[i]]
                })
            } else {
                const previousGroup = groupedConditions[groupedConditions.length-1]
                if (forecastSlice[i].shortForecast === previousGroup.condition) {
                    previousGroup.periods.push(forecastSlice[i])
                } else {
                    groupedConditions.push({
                        condition: forecastSlice[i].shortForecast,
                        periods: [forecastSlice[i]],
                    })
                }
            }
        }

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
        dailyForecast.classList.add('populated')

        let tempsList = []
        let labelsList = []
        forecastSlice.forEach(period => {
            tempsList.push(period.temperature)
            labelsList.push(clock.time.text(new Date(period.startTime)))
        })

        let hourlyForecastHTML = `
            <h3 class='date'>${clock.date.text(date)}</h3>
            <div class='forecast'>
        `
        groupedConditions.forEach(group => {
            hourlyForecastHTML += `
                <div class='group'
                    data-start-time=${clock.time.text(new Date(group.periods[0].startTime))}
                    data-end-time=${clock.time.text(new Date(group.periods[group.periods.length - 1].endTime))} 
                    style='flex-grow: ${group.periods.length}'>
                    ${group.condition}
                </div>
            `
        })
        hourlyForecastHTML += '</div>'

        tempsChart.data.datasets[0].data = tempsList
        tempsChart.data.labels = labelsList
        tempsChart.update()
        const chartImgSrc = tempsCanvas.toDataURL()
        hourlyForecastHTML += `<img class='chart' src=${chartImgSrc}>`

        const hourlyForecast = document.querySelector(`.weather-overlay .hours > .day:nth-child(${i + 1})`)
        hourlyForecast.innerHTML = hourlyForecastHTML

        if (i === 0 && !document.body.classList.contains('weather-overlaid')) hourlyForecast.classList.add('active')
        date.setDate(date.getDate() + 1)
    }
    tempsChart.destroy()
    tempsCanvas.remove()
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
function avg(array) {
    return array.reduce((a, b) => a + b) / array.length
}