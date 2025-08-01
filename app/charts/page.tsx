/**
 * @fileoverview Charts Page - Advanced sensor data visualization and analysis
 * 
 * This page provides comprehensive charting capabilities for the Smart Biodigester
 * monitoring system. It offers interactive time-series visualizations with multiple
 * time ranges, adaptive scaling, alarm zones, and mobile-responsive design.
 * 
 * Key Features:
 * - Interactive time-series charts for all sensor parameters
 * - Multiple time range selections (1h, 12h, 1d, 1w, 1m, custom)
 * - Adaptive Y-axis scaling based on time range and data variance
 * - Visual alarm zones with color-coded optimal ranges
 * - Mobile-responsive design with touch-friendly controls
 * - Real-time data fetching from Supabase
 * - Performance-optimized data sampling for large datasets
 * - Enhanced tooltips with precise timestamp information
 * 
 * Technical Implementation:
 * - Uses Recharts library for high-performance charting
 * - Implements data sampling for week/month views
 * - Mobile-first responsive design approach
 * - TypeScript for type safety and better developer experience
 * 
 * @author Tim Siebert & Max Zboralski
 * @version 2.0.0
 * @since 2025-08-31
 */

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

/**
 * Raw sensor data structure as stored in the Supabase database.
 * 
 * This type mirrors the database schema for sensor readings and includes
 * all available sensor parameters. Used for data fetching and initial
 * processing before transformation into chart-ready format.
 * 
 * @interface SensorData
 * @see ChartDataPoint for the processed chart data structure
 */
type SensorData = {
  /** ISO timestamp when the sensor reading was recorded */
  timestamp: string
  
  /** pH value of the biodigester contents (optimal range: 6-8) */
  ph: number | null
  
  /** Raw voltage reading from the pH sensor for diagnostics */
  ph_voltage: number | null
  
  /** Temperature reading from tank sensor 1 in Celsius (optimal: 30-40°C) */
  temp1: number | null
  
  /** Temperature reading from tank sensor 2 in Celsius (optimal: 30-40°C) */
  temp2: number | null
  
  /** Ambient temperature from BME280 sensor in Celsius */
  bme_temperature: number | null
  
  /** Relative humidity percentage from BME280 sensor */
  bme_humidity: number | null
  
  /** Atmospheric pressure in hPa from BME280 sensor */
  bme_pressure: number | null
  
  /** Gas resistance reading from BME280 sensor for air quality */
  bme_gas_resistance: number | null
  
  /** Raw methane sensor output data for debugging purposes */
  methan_raw: string[] | null
  
  /** Processed methane concentration in parts per million (ppm) */
  methane_ppm: number | null
  
  /** Methane concentration as percentage of total gas volume */
  methane_percent: number | null
  
  /** Temperature reading from the methane sensor in Celsius */
  methane_temperature: number | null
  
  /** Array of fault messages from the methane sensor system */
  methane_faults: string[] | null
}

/**
 * Processed data structure optimized for chart rendering and display.
 * 
 * This type represents sensor data after processing and formatting for
 * visualization. It includes multiple timestamp formats for different
 * display contexts and optional sensor values for flexible chart rendering.
 * 
 * @interface ChartDataPoint
 * @see SensorData for the raw database structure
 */
type ChartDataPoint = {
  /** Formatted timestamp string for chart X-axis display */
  timestamp: string
  
  /** Original ISO timestamp preserved for accurate tooltip display */
  originalTimestamp: string
  
  /** Human-readable date string for chart labeling */
  date: string
  
  /** pH value (optional for charts that don't include pH data) */
  ph?: number
  
  /** pH sensor voltage (optional, used in diagnostic charts) */
  ph_voltage?: number
  
  /** Tank temperature sensor 1 reading in Celsius */
  temp1?: number
  
  /** Tank temperature sensor 2 reading in Celsius */
  temp2?: number
  
  /** BME280 ambient temperature in Celsius */
  bme_temperature?: number
  
  /** BME280 relative humidity percentage */
  bme_humidity?: number
  
  /** BME280 atmospheric pressure in hPa */
  bme_pressure?: number
  
  /** BME280 gas resistance for air quality monitoring */
  bme_gas_resistance?: number
  
  /** Methane concentration in parts per million */
  methane_ppm?: number
  
  /** Methane concentration as percentage */
  methane_percent?: number
  
  /** Methane sensor temperature reading */
  methane_temperature?: number
}

/**
 * Configuration for visual alarm zones displayed on charts.
 * 
 * Alarm zones provide visual context for sensor readings by highlighting
 * optimal, warning, and critical ranges directly on the chart background.
 * Each zone is rendered as a colored area with transparency.
 * 
 * @interface AlarmZone
 */
type AlarmZone = {
  /** Minimum value for this alarm zone range */
  min: number
  
  /** Maximum value for this alarm zone range */
  max: number
  
  /** Descriptive label for the alarm zone (e.g., "Optimal (30-40°C)") */
  label: string
  
  /** Hex color code for the zone background (e.g., "#22c55e") */
  color: string
}

/**
 * Visual alarm zone definitions for chart background highlighting.
 * 
 * These zones provide immediate visual context for sensor readings by
 * displaying colored background areas on charts. Each parameter has
 * multiple zones representing different operational states.
 * 
 * Color Coding:
 * - Green (#22c55e): Optimal operating range
 * - Blue (#3b82f6): Suboptimal but acceptable range
 * - Red (#ef4444): Critical range requiring attention
 * 
 * @constant ALARM_ZONES
 */
const ALARM_ZONES = {
  /** 
   * Temperature alarm zones for biodigester tank sensors.
   * Based on optimal anaerobic digestion temperature requirements.
   */
  tank_temperature: [
    { min: 0, max: 30, label: 'Too cold (<30°C)', color: '#3b82f6' },
    { min: 30, max: 40, label: 'Optimal (30-40°C)', color: '#22c55e' },
    { min: 40, max: 80, label: 'Too hot (>40°C)', color: '#ef4444' }
  ],
  /** 
   * pH alarm zones for biodigester contents.
   * Based on optimal pH range for methanogenic bacteria.
   */
  ph: [
    { min: 0, max: 6, label: 'Too acidic (<6)', color: '#ef4444' },
    { min: 6, max: 8, label: 'Optimal (6-8)', color: '#22c55e' },
    { min: 8, max: 14, label: 'Too alkaline (>8)', color: '#ef4444' }
  ]
}

/**
 * Available time range options for chart data visualization.
 * 
 * Each time range defines both the display label and the number of hours
 * of historical data to fetch and display. The ranges are optimized for
 * different analysis needs from real-time monitoring to long-term trends.
 * 
 * @constant TIME_RANGES
 */
const TIME_RANGES = {
  /** Last hour - for real-time monitoring and immediate trend analysis */
  '1h': { label: 'Last Hour', hours: 1 },
  
  /** Last 12 hours - for short-term trend analysis and shift monitoring */
  '12h': { label: 'Last 12 Hours', hours: 12 },
  
  /** Last day - for daily pattern analysis and 24-hour cycles */
  '1d': { label: 'Last Day', hours: 24 },
  
  /** Last week - for weekly trends and pattern identification */
  '1w': { label: 'Last Week', hours: 24 * 7 },
  
  /** Last month - for long-term trend analysis and seasonal patterns */
  '1m': { label: 'Last Month', hours: 24 * 30 },
  
  /** Custom date range - for user-defined time periods */
  'custom': { label: 'Custom Range', hours: 0 }
} as const

/**
 * Type definition for time range selection keys.
 * 
 * Ensures type safety when working with time range selections
 * and provides autocomplete support in development.
 * 
 * @type TimeRangeKey
 */
type TimeRangeKey = keyof typeof TIME_RANGES

/**
 * Main charts page component for sensor data visualization.
 * 
 * This component provides comprehensive charting capabilities for all sensor
 * parameters with interactive time range selection, responsive design, and
 * advanced features like adaptive scaling and alarm zones.
 * 
 * State Management:
 * - Manages sensor data fetching and caching
 * - Handles time range selection and filtering
 * - Controls loading states and error handling
 * 
 * @component
 * @returns {JSX.Element} The complete charts page interface
 */
export default function ChartsPage() {
  /** Array of sensor data records for the selected time range */
  const [data, setData] = useState<SensorData[]>([])
  
  /** Loading state indicator for data fetch operations */
  const [loading, setLoading] = useState(true)
  
  /** Currently selected time range for data visualization */
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeKey>('1d')
  
  /** Start date for custom date range selection */
  const [customStartDate, setCustomStartDate] = useState<string>('')
  
  /** End date for custom date range selection */
  const [customEndDate, setCustomEndDate] = useState<string>('')

  /**
   * Fetches sensor data from Supabase for the specified time range.
   * 
   * This function calculates the appropriate start time based on the selected
   * time range and retrieves all sensor records within that period. For custom
   * ranges, it uses the user-defined start and end dates. Data is sorted by
   * timestamp in ascending order for proper chart rendering.
   * 
   * @async
   * @function fetchData
   * @param {TimeRangeKey} timeRange - The time range key to fetch data for
   * @returns {Promise<void>} Resolves when data fetch is complete
   */
  const fetchData = async (timeRange: TimeRangeKey) => {
    setLoading(true)
    try {
      let startTime: Date
      let endTime: Date
      
      if (timeRange === 'custom') {
        // Use custom date range if selected
        if (!customStartDate || !customEndDate) {
          console.error('Custom date range requires both start and end dates')
          setLoading(false)
          return
        }
        startTime = new Date(customStartDate)
        endTime = new Date(customEndDate)
        
        // Ensure end date is after start date
        if (endTime <= startTime) {
          console.error('End date must be after start date')
          setLoading(false)
          return
        }
      } else {
        // Use predefined time range
        const now = new Date()
        startTime = new Date(now.getTime() - TIME_RANGES[timeRange].hours * 60 * 60 * 1000)
        endTime = now
      }
      
      const { data: sensorData, error } = await supabase
        .from('sensor_data')
        .select('*')
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .order('timestamp', { ascending: true })
      
      if (error) {
        console.error('Error fetching data:', error)
        return
      }
      
      setData(sensorData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial data fetch on component mount only
  useEffect(() => {
    fetchData(selectedTimeRange)
  }, [])

  /**
   * Handles time range selection changes from the UI.
   * 
   * Updates the selected time range state without automatically fetching data.
   * For custom ranges, it sets default dates if none are selected. Data fetching
   * is triggered manually via the confirmation button.
   * 
   * @param {TimeRangeKey} timeRange - The newly selected time range
   * 
   * @example
   * ```typescript
   * handleTimeRangeChange('1w') // Updates time range to last week
   * handleTimeRangeChange('custom') // Switches to custom date range
   * ```
   */
  const handleTimeRangeChange = (timeRange: TimeRangeKey) => {
    setSelectedTimeRange(timeRange)
    
    // Set default dates for custom range if none are selected
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      setCustomStartDate(weekAgo.toISOString().split('T')[0])
      setCustomEndDate(now.toISOString().split('T')[0])
    }
  }
  
  /**
   * Handles the confirmation button click to fetch data for the selected time range.
   * 
   * This function is called when the user clicks the "Load Data" button to
   * fetch sensor data for the currently selected time range and date parameters.
   */
  const handleLoadData = () => {
    fetchData(selectedTimeRange)
  }
  
  /**
   * Formats timestamps for chart X-axis display based on the selected time range.
   * 
   * Different time ranges require different timestamp formatting for optimal
   * readability and space utilization. Short ranges show more detail (hours/minutes)
   * while longer ranges focus on dates.
   * 
   * Formatting Strategy:
   * - 1h/12h: Time only (HH:MM) for detailed time tracking
   * - 1d: Date + time for daily patterns
   * - 1w/1m: Date only for trend analysis
   * 
   * @function formatTimestamp
   * @param {string} timestamp - ISO timestamp string to format
   * @param {TimeRangeKey} timeRange - Current time range selection
   * @returns {string} Formatted timestamp string for display
   * 
   * @example
   * ```typescript
   * formatTimestamp('2024-01-15T14:30:00Z', '1h') // "02:30 PM"
   * formatTimestamp('2024-01-15T14:30:00Z', '1d') // "Jan 15, 02:30 PM"
   * formatTimestamp('2024-01-15T14:30:00Z', '1w') // "Jan 15"
   * ```
   */
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
        return date.toLocaleString('en-US')
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
            <div className="space-y-4">
              {/* Predefined Time Range Buttons */}
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
              
              {/* Custom Date Range Selector */}
              {selectedTimeRange === 'custom' && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="start-date" className="text-sm font-medium text-gray-700">
                        Von (Start Date)
                      </label>
                      <input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="end-date" className="text-sm font-medium text-gray-700">
                        Bis (End Date)
                      </label>
                      <input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  {customStartDate && customEndDate && (
                    <div className="mt-3 text-xs text-gray-600">
                      📅 Selected range: {new Date(customStartDate).toLocaleDateString('de-DE')} - {new Date(customEndDate).toLocaleDateString('de-DE')}
                      {(() => {
                        const start = new Date(customStartDate)
                        const end = new Date(customEndDate)
                        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                        return ` (${diffDays} ${diffDays === 1 ? 'Tag' : 'Tage'})`
                      })()} 
                    </div>
                  )}
                </div>
              )}
              
              {/* Load Data Button */}
              <div className="flex justify-center pt-4 border-t">
                <Button
                  onClick={handleLoadData}
                  disabled={loading || (selectedTimeRange === 'custom' && (!customStartDate || !customEndDate))}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-medium"
                  size="sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>📊 Load Data</>
                  )}
                </Button>
              </div>
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

/**
 * Advanced sensor chart component with adaptive scaling and mobile optimization.
 * 
 * This component renders interactive time-series charts for sensor data with
 * comprehensive features including alarm zones, adaptive Y-axis scaling,
 * mobile-responsive design, and performance optimizations.
 * 
 * Key Features:
 * - Adaptive Y-axis scaling based on time range and data variance
 * - Visual alarm zones with color-coded backgrounds
 * - Mobile-responsive tick spacing and font sizes
 * - Performance-optimized data filtering and sampling
 * - Enhanced tooltips with precise timestamp information
 * - Automatic null/undefined value handling
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.title - Chart title displayed in the card header
 * @param {string} props.description - Chart description for context
 * @param {ChartDataPoint[]} props.data - Array of processed chart data points
 * @param {string[]} props.dataKeys - Array of data keys to plot as lines
 * @param {ChartConfig} props.config - Recharts configuration for styling
 * @param {[number, number]} [props.domain] - Fixed Y-axis domain range
 * @param {boolean} [props.autoScale] - Enable adaptive Y-axis scaling
 * @param {AlarmZone[]} [props.alarmZones] - Alarm zones for background highlighting
 * @param {TimeRangeKey} props.timeRange - Current time range selection
 * @returns {JSX.Element} Rendered sensor chart component
 * 
 * @example
 * ```tsx
 * <SensorChart
 *   title="Tank Temperature"
 *   description="Temperature readings from tank sensors"
 *   data={chartData}
 *   dataKeys={['temp1', 'temp2']}
 *   config={tempConfig}
 *   alarmZones={ALARM_ZONES.tank_temperature}
 *   timeRange="1d"
 *   autoScale={true}
 * />
 * ```
 */
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
