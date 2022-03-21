const tempsChartConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            fill: false,
            label: '',
            pointBackgroundColor: '#2196f3',
            pointBorderColor: '#2f3441',
            pointRadius: 5,
            borderColor: 'white',
            borderWidth: 1,
            tension: 0.5,
            data: []
        }],
    },
    plugins: [ChartDataLabels],
    options: {
        responsive: false,
        layout: {
            padding: {
                top: 20,
                right: 20,
                left: 20
            }
        },
        plugins: {
            legend: {
                display: false
            },
            datalabels: {
                color: 'white',
                anchor: 'end',
                align: 'top',
                display: function (context) {
                    if (context.dataset.data.length > 3) return !(context.dataIndex % 2)
                    else return true
                },
                formatter: function (value) {
                    return value + '°'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: 'white',
                    autoSkip: true,
                    maxTicksLimit: 8,
                    maxRotation: 0,
                    minRotation: 0
                }
            },
            y: {
                ticks: {
                    display: false
                },
                grid: {
                    display: false
                }
            }
        },
        animation: {
            duration: 0
        }
    }
}

const precipChanceChartConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            fill: false,
            label: '',
            pointBackgroundColor: '#2196f3',
            pointBorderColor: '#2f3441',
            pointRadius: 5,
            borderColor: 'white',
            borderWidth: 1,
            tension: 0.5,
            data: []
        }],
    },
    plugins: [ChartDataLabels],
    options: {
        responsive: false,
        layout: {
            padding: {
                top: 20,
                right: 20,
                left: 20
            }
        },
        plugins: {
            legend: {
                display: false
            },
            datalabels: {
                color: 'white',
                anchor: 'end',
                align: 'top',
                display: function (context) {
                    if (context.dataset.data.length > 3) return !(context.dataIndex % 2)
                    else return true
                },
                formatter: function (value) {
                    return value + '%'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: 'white',
                    autoSkip: true,
                    maxTicksLimit: 8,
                    maxRotation: 0,
                    minRotation: 0
                }
            },
            y: {
                ticks: {
                    display: false
                },
                grid: {
                    display: false
                }
            }
        },
        animation: {
            duration: 0
        }
    }
}