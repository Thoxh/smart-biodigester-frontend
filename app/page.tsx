/**
 * @fileoverview Smart Biodigester Dashboard - Main monitoring interface
 * 
 * This is the primary dashboard page for the Smart Biodigester monitoring system.
 * It displays real-time sensor data including temperature, pH, humidity, pressure,
 * and methane measurements with alarm notifications and status indicators.
 * 
 * Key Features:
 * - Real-time data updates via Supabase subscriptions
 * - Individual alarm monitoring for each temperature sensor
 * - Critical alert notifications with visual indicators
 * - Responsive design optimized for mobile and desktop
 * - Automatic polling fallback for connection reliability
 * 
 * @author Tim Siebert & Max Zboralski
 * @version 1.0.0
 * @since 2025-08-31
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

/**
 * Represents a complete sensor data record from the biodigester monitoring system.
 * 
 * This type defines the structure of sensor data as stored in the Supabase database.
 * All sensor values are nullable to handle cases where sensors may be offline,
 * malfunctioning, or not yet initialized.
 * 
 * @interface SensorData
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
 * Alarm threshold definitions for critical biodigester parameters.
 * 
 * These ranges define the optimal operating conditions for the biodigester.
 * Values outside these ranges trigger visual and system alerts to notify
 * operators of potentially problematic conditions.
 * 
 * @constant ALARM_RANGES
 */
const ALARM_RANGES = {
  /** 
   * Optimal temperature range for biodigester tank operation.
   * Below 30°C: Reduced microbial activity and gas production
   * Above 40°C: Risk of killing beneficial bacteria
   */
  tank_temperature: { min: 30, max: 40 },
  
  /** 
   * Optimal pH range for anaerobic digestion process.
   * Below 6: Too acidic, inhibits methanogenic bacteria
   * Above 8: Too alkaline, can cause ammonia toxicity
   */
  ph: { min: 6, max: 8 }
}

/**
 * Determines the alarm status for a sensor value based on defined thresholds.
 * 
 * This utility function evaluates sensor readings against optimal ranges and
 * returns a standardized status that drives UI color coding and alert logic.
 * 
 * @param value - The sensor reading to evaluate (null if sensor offline)
 * @param range - Object containing min/max threshold values
 * @returns {'unknown' | 'safe' | 'critical'} Status classification
 * 
 * @example
 * ```typescript
 * const status = getAlarmStatus(35, { min: 30, max: 40 }); // 'safe'
 * const status = getAlarmStatus(45, { min: 30, max: 40 }); // 'critical'
 * const status = getAlarmStatus(null, { min: 30, max: 40 }); // 'unknown'
 * ```
 */
function getAlarmStatus(value: number | null, range: { min: number, max: number }) {
  if (value === null || value === undefined) return 'unknown'
  if (value >= range.min && value <= range.max) return 'safe'
  return 'critical'
}

/**
 * Evaluates alarm status for tank temperature sensor 1.
 * 
 * Provides individual monitoring for the first tank temperature sensor,
 * enabling separate status tracking and alert management for each sensor.
 * This separation allows operators to identify which specific sensor
 * is experiencing issues.
 * 
 * @param temp1 - Temperature reading from sensor 1 in Celsius
 * @returns {'unknown' | 'safe' | 'critical'} Alarm status for temp1
 */
function getTemp1Alarm(temp1: number | null) {
  return getAlarmStatus(temp1, ALARM_RANGES.tank_temperature)
}

/**
 * Evaluates alarm status for tank temperature sensor 2.
 * 
 * Provides individual monitoring for the second tank temperature sensor,
 * enabling separate status tracking and alert management for each sensor.
 * This separation allows operators to identify which specific sensor
 * is experiencing issues.
 * 
 * @param temp2 - Temperature reading from sensor 2 in Celsius
 * @returns {'unknown' | 'safe' | 'critical'} Alarm status for temp2
 */
function getTemp2Alarm(temp2: number | null) {
  return getAlarmStatus(temp2, ALARM_RANGES.tank_temperature)
}

/**
 * Main dashboard component for the Smart Biodigester monitoring system.
 * 
 * This component serves as the primary interface for real-time monitoring of
 * biodigester sensor data. It provides live updates, alarm notifications,
 * and comprehensive status information for all connected sensors.
 * 
 * Features:
 * - Real-time data subscription via Supabase
 * - Automatic polling fallback for reliability
 * - Individual sensor alarm monitoring
 * - Responsive mobile-first design
 * - Critical alert notifications
 * 
 * @component
 * @returns {JSX.Element} The main dashboard interface
 */
export default function Home() {
  /** Current sensor data state - null when no data available */
  const [data, setData] = useState<SensorData | null>(null)
  
  /** Loading state indicator for initial data fetch */
  const [loading, setLoading] = useState(true)

  /**
   * Fetches the most recent sensor data record from the database.
   * 
   * This function retrieves the latest sensor reading and updates the component state.
   * It's used both for initial data loading and as a polling fallback mechanism
   * to ensure data freshness even if real-time subscriptions fail.
   * 
   * @async
   * @function fetchLatest
   * @returns {Promise<void>} Resolves when data fetch is complete
   */
  const fetchLatest = async () => {
    setLoading(true)
    const { data: rows } = await supabase
      .from('sensor_data')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
    setData(rows?.[0] ?? null)
    setLoading(false)
  }

  /**
   * Effect hook for setting up real-time data subscriptions and polling.
   * 
   * This effect establishes a robust data fetching strategy using multiple approaches:
   * 1. Initial data fetch on component mount
   * 2. Real-time subscription to database changes via Supabase
   * 3. Polling fallback every 12 seconds for reliability
   * 
   * The combination ensures data freshness even in cases of network issues,
   * subscription failures, or other connectivity problems.
   */
  useEffect(() => {
    // Initial data fetch
    fetchLatest()
    
    // Set up real-time subscription for immediate updates
    const sub = supabase
      .channel('sensor_data_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_data' },
        payload => {
          setData(payload.new as SensorData)
        }
      )
      .subscribe()

    // Polling fallback every 12 seconds for robustness
    // This ensures data updates even if real-time subscription fails
    const poll = setInterval(fetchLatest, 12000)

    // Cleanup function to prevent memory leaks
    return () => {
      sub.unsubscribe()
      clearInterval(poll)
    }
  }, [])

  if (loading && !data) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500 text-lg">Loading latest data…</div>
      </main>
    )
  }

  const temp1Alarm = getTemp1Alarm(data?.temp1 ?? null)
  const temp2Alarm = getTemp2Alarm(data?.temp2 ?? null)
  const phAlarm = getAlarmStatus(data?.ph ?? null, ALARM_RANGES.ph)

  /**
   * Formats ISO timestamp strings for user-friendly display.
   * 
   * Converts database timestamp strings into a readable format suitable
   * for display in the dashboard interface. Uses English locale formatting
   * with full date and time information including seconds for precision.
   * 
   * @param timestamp - ISO timestamp string from the database
   * @returns {string} Formatted timestamp string (e.g., "Jan 15, 2024, 02:30:45 PM")
   * 
   * @example
   * ```typescript
   * formatTimestamp('2024-01-15T14:30:45.123Z')
   * // Returns: "Jan 15, 2024, 02:30:45 PM"
   * ```
   */
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    // No timezone correction needed - time is already correct
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex justify-center">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-500 text-white p-4 md:p-6">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl md:text-2xl font-bold">
                Current Sensor Data
              </h1>
              <Link 
                href="/charts" 
                className="bg-green-500 hover:bg-green-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                📊 Charts
              </Link>
            </div>
            <p className="text-green-100 text-sm">
              Smart Biodigester Monitoring System
            </p>
          </div>
          
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Critical Alerts */}
            {(temp1Alarm === 'critical' || temp2Alarm === 'critical' || phAlarm === 'critical') && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-red-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Critical Values Detected!</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc list-inside space-y-1">
                        {temp1Alarm === 'critical' && (
                          <li>Tank temperature 1 outside optimal range (30-40°C)</li>
                        )}
                        {temp2Alarm === 'critical' && (
                          <li>Tank temperature 2 outside optimal range (30-40°C)</li>
                        )}
                        {phAlarm === 'critical' && (
                          <li>pH value outside optimal range (6-8)</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Sensor Values Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <LabelVal label="Timestamp" value={formatTimestamp(data?.timestamp ?? '')} />
              <LabelVal label="pH Value" value={format(data?.ph)} alarm={phAlarm} />
              <LabelVal label="pH Voltage [mV]" value={format(data?.ph_voltage)} />
              <LabelVal label="Temp. 1 [°C]" value={format(data?.temp1)} alarm={temp1Alarm} />
              <LabelVal label="Temp. 2 [°C]" value={format(data?.temp2)} alarm={temp2Alarm} />
              <LabelVal label="BME Temp. [°C]" value={format(data?.bme_temperature)} />
              <LabelVal label="BME Humidity [%]" value={format(data?.bme_humidity)} />
              <LabelVal label="BME Pressure [hPa]" value={format(data?.bme_pressure)} />
              <LabelVal label="BME Gas Resistance [kΩ]" value={format(data?.bme_gas_resistance)} />
              <LabelVal label="Methane [ppm]" value={format(data?.methane_ppm)} />
              <LabelVal label="Methane [%]" value={format(data?.methane_percent)} />
              <LabelVal label="Methane Temp. [°C]" value={format(data?.methane_temperature)} />
            </div>
            
            {/* Raw Data Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="font-semibold text-base mb-2 text-gray-800">Methane Raw Output</h2>
                <div className="font-mono bg-gray-100 rounded-lg p-3 text-xs break-all border">
                  {data?.methan_raw && data.methan_raw.length > 0
                    ? data.methan_raw.join(', ')
                    : '–'}
                </div>
              </div>
              
              <div>
                <h2 className="font-semibold text-base mb-2 text-gray-800">Methane Errors</h2>
                <div className="bg-gray-100 rounded-lg p-3 border min-h-[60px]">
                  <ul className="text-xs text-red-700 space-y-1">
                    {Array.isArray(data?.methane_faults) && data.methane_faults.length > 0
                      ? data.methane_faults.map((f, i) => <li key={i}>• {f}</li>)
                      : <li className="text-gray-500">No errors</li>}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* System Status */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h2 className="font-semibold text-base mb-3 text-gray-800">System Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm font-medium">Tank Temp 1:</span>
                  <span className={`text-sm font-bold ${
                    temp1Alarm === 'critical' ? 'text-red-600' : 
                    temp1Alarm === 'safe' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {temp1Alarm === 'critical' ? '⚠️ Critical' : 
                     temp1Alarm === 'safe' ? '✅ Optimal' : '❓ Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm font-medium">Tank Temp 2:</span>
                  <span className={`text-sm font-bold ${
                    temp2Alarm === 'critical' ? 'text-red-600' : 
                    temp2Alarm === 'safe' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {temp2Alarm === 'critical' ? '⚠️ Critical' : 
                     temp2Alarm === 'safe' ? '✅ Optimal' : '❓ Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm font-medium">pH Value:</span>
                  <span className={`text-sm font-bold ${
                    phAlarm === 'critical' ? 'text-red-600' : 
                    phAlarm === 'safe' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {phAlarm === 'critical' ? '⚠️ Critical' : 
                     phAlarm === 'safe' ? '✅ Optimal' : '❓ Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

/**
 * Formats sensor values for consistent display across the dashboard.
 * 
 * This utility function handles the formatting of various sensor readings,
 * ensuring consistent presentation of numeric values and proper handling
 * of null/undefined states. Uses an em dash (–) for missing values to
 * maintain visual consistency.
 * 
 * @param val - The sensor value to format (number, string, null, or undefined)
 * @returns {string} Formatted value string
 * 
 * @example
 * ```typescript
 * format(23.456)     // Returns: "23.46"
 * format(null)       // Returns: "–"
 * format(undefined)  // Returns: "–"
 * format(NaN)        // Returns: "–"
 * format("OK")       // Returns: "OK"
 * ```
 */
function format(val: number | string | null | undefined) {
  if (val === null || val === undefined || Number.isNaN(val)) return '–'
  if (typeof val === 'number') return val.toFixed(2)
  return val
}

/**
 * Reusable component for displaying labeled sensor values with alarm status.
 * 
 * This component provides a consistent visual format for sensor readings
 * throughout the dashboard. It includes automatic color coding based on
 * alarm status and responsive design for mobile compatibility.
 * 
 * Color Coding:
 * - Red (text-red-600): Critical alarm state
 * - Green (text-green-600): Safe/optimal state
 * - Gray (text-gray-900): Unknown or normal state
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.label - Display label for the sensor reading
 * @param {string | number} props.value - The formatted sensor value to display
 * @param {string} [props.alarm] - Optional alarm status ('critical', 'safe', or undefined)
 * @returns {JSX.Element} Formatted sensor value card
 * 
 * @example
 * ```tsx
 * <LabelVal 
 *   label="Tank Temperature [°C]" 
 *   value="35.2" 
 *   alarm="safe" 
 * />
 * ```
 */
function LabelVal({ label, value, alarm }: { label: string, value: string | number, alarm?: string }) {
  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <span className={`font-mono text-sm font-semibold ${
        alarm === 'critical' ? 'text-red-600' : 
        alarm === 'safe' ? 'text-green-600' : 'text-gray-900'
      }`}>
        {value}
      </span>
    </div>
  )
}
