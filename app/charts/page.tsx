'use client'

import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ReferenceArea } from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type SensorData = {
  timestamp: string
  ph: number | null
  ph_voltage: number | null
  temp1: number | null
  temp2: number | null
  bme_temperature: number | null
  bme_humidity: number | null
  bme_pressure: number | null
  bme_gas_resistance: number | null
  methan_raw: string[] | null
  methane_ppm: number | null
  methane_percent: number | null
  methane_temperature: number | null
  methane_faults: string[] | null
}

type ChartDataPoint = {
  timestamp: string
  originalTimestamp: string
  date: string
  ph?: number
  ph_voltage?: number
  temp1?: number
  temp2?: number
  bme_temperature?: number
  bme_humidity?: number
  bme_pressure?: number
  bme_gas_resistance?: number
  methane_ppm?: number
  methane_percent?: number
  methane_temperature?: number
}

type AlarmZone = {
  min: number
  max: number
  label: string
  color: string
}

// Alarm definitions
const ALARM_ZONES = {
  tank_temperature: [
    { min: 0, max: 30, label: 'Too cold (<30°C)', color: '#3b82f6' },
    { min: 30, max: 40, label: 'Optimal (30-40°C)', color: '#22c55e' },
    { min: 40, max: 80, label: 'Too hot (>40°C)', color: '#ef4444' }
  ],
  ph: [
    { min: 0, max: 6, label: 'Too acidic (<6)', color: '#ef4444' },
    { min: 6, max: 8, label: 'Optimal (6-8)', color: '#22c55e' },
    { min: 8, max: 14, label: 'Too alkaline (>8)', color: '#ef4444' }
  ]
}

// Time range options
const TIME_RANGES = {
  '1h': { label: 'Last Hour', hours: 1 },
  '12h': { label: 'Last 12 Hours', hours: 12 },
  '1d': { label: 'Last Day', hours: 24 },
  '1w': { label: 'Last Week', hours: 24 * 7 },
  '1m': { label: 'Last Month', hours: 24 * 30 }
} as const

type TimeRangeKey = keyof typeof TIME_RANGES

export default function ChartsPage() {
  const [data, setData] = useState<SensorData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeKey>('1d')

  const fetchData = async (timeRange: TimeRangeKey) => {
    setLoading(true)
    try {
      const now = new Date()
      const hoursAgo = TIME_RANGES[timeRange].hours
      const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)

      const { data: sensorData, error } = await supabase
        .from('sensor_data')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true }) // Get chronological order

      if (error) {
        console.error('Error fetching sensor data:', error)
        return
      }

      setData(sensorData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedTimeRange)
  }, [selectedTimeRange])

  const handleTimeRangeChange = (timeRange: TimeRangeKey) => {
    setSelectedTimeRange(timeRange)
  }

  // Format timestamp for display based on time range
  const formatTimestamp = (timestamp: string, timeRange: TimeRangeKey) => {
    const date = new Date(timestamp)
    
    switch (timeRange) {
      case '1h':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      case '12h':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      case '1d':
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      case '1w':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      case '1m':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      default:
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
    }
  }

  // Transform data for charts with performance optimization
  let chartData: ChartDataPoint[] = data.map(point => ({
    timestamp: formatTimestamp(point.timestamp, selectedTimeRange),
    originalTimestamp: point.timestamp, // Keep original for tooltip
    date: new Date(point.timestamp).toLocaleDateString('en-US'),
    ph: point.ph ?? undefined,
    ph_voltage: point.ph_voltage ?? undefined,
    temp1: point.temp1 ?? undefined,
    temp2: point.temp2 ?? undefined,
    bme_temperature: point.bme_temperature ?? undefined,
    bme_humidity: point.bme_humidity ?? undefined,
    bme_pressure: point.bme_pressure ?? undefined,
    bme_gas_resistance: point.bme_gas_resistance ?? undefined,
    methane_ppm: point.methane_ppm ?? undefined,
    methane_percent: point.methane_percent ?? undefined,
    methane_temperature: point.methane_temperature ?? undefined,
  }))

  // Sample data for performance optimization (every 10th point for week/month views)
  if (selectedTimeRange === '1w' || selectedTimeRange === '1m') {
    chartData = chartData.filter((_, index) => index % 10 === 0)
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-gray-500 text-lg">Loading sensor data...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  📊 Sensor Charts
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Detailed visualization of biodigester sensor data
                </p>
              </div>
              <Link href="/">
                <Button 
                  variant="outline" 
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                  size="sm"
                >
                  ← Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Select Time Range</CardTitle>
            <CardDescription className="text-sm">
              Choose the desired time period for the charts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {Object.entries(TIME_RANGES).map(([key, range]) => (
                <Button
                  key={key}
                  variant={selectedTimeRange === key ? "default" : "outline"}
                  onClick={() => handleTimeRangeChange(key as TimeRangeKey)}
                  className={`text-xs sm:text-sm ${
                    selectedTimeRange === key ? "bg-blue-600 hover:bg-blue-700" : ""
                  }`}
                  size="sm"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {data.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-[200px] sm:h-[300px]">
              <div className="text-gray-500 text-sm sm:text-lg text-center px-4">
                No sensor data available for the selected time range
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:gap-8">
            {/* Tank Temperature Chart */}
            <SensorChart
              title="Tank Temperature"
              description="Temperature sensors in the biodigester tank"
              data={chartData}
              dataKeys={['temp1', 'temp2']}
              config={{
                temp1: {
                  label: 'Temperature Sensor 1',
                  color: '#ef4444',
                },
                temp2: {
                  label: 'Temperature Sensor 2',
                  color: '#f97316',
                },
              }}
              domain={[0, 80]}
              alarmZones={ALARM_ZONES.tank_temperature}
              timeRange={selectedTimeRange}
            />

            {/* pH Chart */}
            <SensorChart
              title="pH Value"
              description="Acidity level in the biodigester"
              data={chartData}
              dataKeys={['ph']}
              config={{
                ph: {
                  label: 'pH Value',
                  color: '#8b5cf6',
                },
              }}
              domain={[0, 14]}
              alarmZones={ALARM_ZONES.ph}
              timeRange={selectedTimeRange}
            />

            {/* Gas Temperature Chart */}
            <SensorChart
              title="Gas Temperature"
              description="Temperature of the gas output"
              data={chartData}
              dataKeys={['bme_temperature']}
              config={{
                bme_temperature: {
                  label: 'Gas Temperature',
                  color: '#06b6d4',
                },
              }}
              timeRange={selectedTimeRange}
            />

            {/* Humidity Chart */}
            <SensorChart
              title="Humidity"
              description="Humidity level in the gas chamber"
              data={chartData}
              dataKeys={['bme_humidity']}
              config={{
                bme_humidity: {
                  label: 'Humidity (%)',
                  color: '#10b981',
                },
              }}
              domain={[0, 100]}
              timeRange={selectedTimeRange}
            />

            {/* Pressure Chart */}
            <SensorChart
              title="Pressure"
              description="Gas pressure in the biodigester"
              data={chartData}
              dataKeys={['bme_pressure']}
              config={{
                bme_pressure: {
                  label: 'Pressure (hPa)',
                  color: '#f59e0b',
                },
              }}
              autoScale={true}
              timeRange={selectedTimeRange}
            />

            {/* Gas Resistance Chart */}
            <SensorChart
              title="Gas Resistance"
              description="Gas sensor resistance value"
              data={chartData}
              dataKeys={['bme_gas_resistance']}
              config={{
                bme_gas_resistance: {
                  label: 'Gas Resistance (Ω)',
                  color: '#84cc16',
                },
              }}
              autoScale={true}
              timeRange={selectedTimeRange}
            />

            {/* Methane Charts */}
            <SensorChart
              title="Methane Concentration (PPM)"
              description="Methane concentration in parts per million"
              data={chartData}
              dataKeys={['methane_ppm']}
              config={{
                methane_ppm: {
                  label: 'Methane (PPM)',
                  color: '#ec4899',
                },
              }}
              autoScale={true}
              timeRange={selectedTimeRange}
            />

            <SensorChart
              title="Methane Percentage"
              description="Methane concentration as percentage"
              data={chartData}
              dataKeys={['methane_percent']}
              config={{
                methane_percent: {
                  label: 'Methane (%)',
                  color: '#8b5cf6',
                },
              }}
              domain={[0, 100]}
              timeRange={selectedTimeRange}
            />

            <SensorChart
              title="Methane Sensor Temperature"
              description="Temperature of the methane sensor"
              data={chartData}
              dataKeys={['methane_temperature']}
              config={{
                methane_temperature: {
                  label: 'Sensor Temperature (°C)',
                  color: '#06b6d4',
                },
              }}
              timeRange={selectedTimeRange}
            />
          </div>
        )}
      </div>
    </main>
  )
}

function SensorChart({
  title,
  description,
  data,
  dataKeys,
  config,
  domain,
  autoScale,
  alarmZones,
  timeRange,
}: {
  title: string
  description: string
  data: ChartDataPoint[]
  dataKeys: string[]
  config: ChartConfig
  domain?: [number, number]
  autoScale?: boolean
  alarmZones?: AlarmZone[]
  timeRange: TimeRangeKey
}) {
  // Filter out data points where all values are null/undefined
  const filteredData = data.filter(point => 
    dataKeys.some(key => {
      const value = point[key as keyof ChartDataPoint]
      return value !== null && value !== undefined && !isNaN(value as number)
    })
  )

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] sm:h-[300px] text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate adaptive Y-axis ranges based on time range and data
  let yAxisDomain: [number, number] | undefined = domain
  
  if (autoScale || !domain) {
    if (filteredData.length > 0) {
      const allValues: number[] = []
      dataKeys.forEach(key => {
        filteredData.forEach(point => {
          const value = point[key as keyof ChartDataPoint] as number
          if (typeof value === 'number' && !isNaN(value)) {
            allValues.push(value)
          }
        })
      })
      
      if (allValues.length > 0) {
        const min = Math.min(...allValues)
        const max = Math.max(...allValues)
        const range = max - min
        
        // Adaptive padding based on time range
        let paddingFactor: number
        switch (timeRange) {
          case '1h':
            // Very tight scaling for hour view to show small changes
            paddingFactor = 0.05 // 5% padding
            break
          case '12h':
            // Tight scaling for 12-hour view
            paddingFactor = 0.08 // 8% padding
            break
          case '1d':
            // Moderate scaling for day view
            paddingFactor = 0.12 // 12% padding
            break
          case '1w':
            // Broader scaling for week view to show general trends
            paddingFactor = 0.20 // 20% padding
            break
          case '1m':
            // Broadest scaling for month view
            paddingFactor = 0.25 // 25% padding
            break
          default:
            paddingFactor = 0.15
        }
        
        const padding = Math.max(range * paddingFactor, 0.1) // Minimum padding of 0.1
        yAxisDomain = [min - padding, max + padding]
        
        // For very small ranges in short time periods, ensure minimum visible range
        if (timeRange === '1h' || timeRange === '12h') {
          const minRange = range < 1 ? 2 : range * 1.5
          const center = (min + max) / 2
          yAxisDomain = [center - minRange / 2, center + minRange / 2]
        }
      }
    }
  }

  // Override with fixed domain if provided (for charts with alarm zones)
  if (domain && !autoScale) {
    yAxisDomain = domain
  }

  // Determine tick gap based on time range and data length
  const getMinTickGap = () => {
    const dataLength = filteredData.length
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    
    // Increase tick gaps on mobile to prevent overcrowding
    const mobileMultiplier = isMobile ? 1.5 : 1
    
    if (timeRange === '1h' || timeRange === '12h') {
      return Math.round((dataLength > 50 ? 60 : 32) * mobileMultiplier)
    } else if (timeRange === '1d') {
      return Math.round((dataLength > 100 ? 80 : 40) * mobileMultiplier)
    } else {
      return Math.round((dataLength > 200 ? 100 : 50) * mobileMultiplier)
    }
  }

  // Adaptive Y-axis tick formatting based on time range and value range
  const formatYAxisTick = (value: number) => {
    if (typeof value !== 'number') return value
    
    // For short time ranges, show more decimal places for precision
    if (timeRange === '1h' || timeRange === '12h') {
      return value.toFixed(2)
    } else if (timeRange === '1d') {
      return value.toFixed(1)
    } else {
      // For longer ranges, show fewer decimals for cleaner look
      return value.toFixed(0)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
        <CardDescription className="text-sm">
          {description} • {filteredData.length} data points
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <ChartContainer config={config} className="h-[200px] sm:h-[300px] w-full">
          <LineChart
            accessibilityLayer
            data={filteredData}
            margin={{
              left: 8,
              right: 8,
              top: 8,
              bottom: 8,
            }}
          >
            <CartesianGrid vertical={false} />
            {alarmZones && alarmZones.map((zone, index) => (
              <ReferenceArea
                key={index}
                y1={zone.min}
                y2={zone.max}
                fill={zone.color}
                fillOpacity={0.3}
                stroke="none"
              />
            ))}
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              minTickGap={getMinTickGap()}
              fontSize={12}
              tickFormatter={(value) => {
                // Return the already formatted timestamp, but truncate on mobile if needed
                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                  // On mobile, show shorter labels for better readability
                  if (timeRange === '1w' || timeRange === '1m') {
                    return value.split(' ')[0] // Just the date part
                  }
                }
                return value
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              fontSize={12}
              tickFormatter={formatYAxisTick}
              domain={yAxisDomain}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px] sm:w-[200px] text-xs sm:text-sm"
                  labelFormatter={(value, payload) => {
                    // Use originalTimestamp from the data point for accurate time display
                    if (payload && payload.length > 0 && payload[0].payload.originalTimestamp) {
                      return new Date(payload[0].payload.originalTimestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    }
                    return new Date(value).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toFixed(2) : value,
                    config[name as keyof typeof config]?.label || name
                  ]}
                />
              }
            />
            {dataKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={config[key]?.color || '#3b82f6'}
                strokeWidth={2}
                strokeOpacity={0.8}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
