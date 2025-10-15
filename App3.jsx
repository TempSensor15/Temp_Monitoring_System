import { useState, useEffect, useMemo } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue } from 'firebase/database'
import { FaLightbulb, FaFan, FaUser, FaSignOutAlt, FaChartLine, FaMicrochip, FaBolt, FaHome, FaCog } from 'react-icons/fa'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

const MAX_DATA_POINTS = 10

function App() {
  const [activeTab, setActiveTab] = useState('sensors')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' })
  const [sensorHistory, setSensorHistory] = useState({
    temperature: [],
    humidity: [],
    timestamps: []
  })
  
  // Device usage tracking state
  const [deviceUsage, setDeviceUsage] = useState(() => {
    // Try to load from localStorage, else use default with 3 hours each
    const saved = localStorage.getItem('deviceUsage')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {}
    }
    return {
      fan: { totalHours: 3, startTime: null, isOn: false },
      Lights: [
        null,
        { totalHours: 3, startTime: null, isOn: false },
        { totalHours: 3, startTime: null, isOn: false },
        { totalHours: 3, startTime: null, isOn: false },
        { totalHours: 3, startTime: null, isOn: false }
      ]
    }
  })
  
  // Home state: support both 'Lights' and 'leds' for compatibility with backend
  const [homeState, setHomeState] = useState({
    controls: {
      fan: false,
      leds: [null, false, false, false, false],
      Lights: [null, false, false, false, false]
    },
    fan: false,
    leds: [null, false, false, false, false],
    Lights: [null, false, false, false, false],
    sensors: {
      temperature: 25.5,
      humidity: 65.2,
      ldr: false
    }
  })

  // Authentication handler
  const handleLogin = (e) => {
    e.preventDefault()
    if (loginCredentials.username === 'admin' && loginCredentials.password === '1234') {
      setIsAuthenticated(true)
      setShowLoginModal(false)
      // Note: localStorage not available in artifacts
      // localStorage.setItem('isAuthenticated', 'true')
    } else {
      alert('Invalid credentials. Please try again.')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    // localStorage.removeItem('isAuthenticated')
  }

  // Load device usage from localStorage on mount
  useEffect(() => {
    const savedUsage = localStorage.getItem('deviceUsage')
    if (savedUsage) {
      try {
        setDeviceUsage(JSON.parse(savedUsage))
      } catch (e) {
        // ignore parse errors
      }
    }
  }, [])

  // Save device usage to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('deviceUsage', JSON.stringify(deviceUsage))
  }, [deviceUsage])
  // Effect for authentication persistence (disabLight for artifacts)
  useEffect(() => {
    // const auth = localStorage.getItem('isAuthenticated')
    // if (auth) {
    //   setIsAuthenticated(true)
    // }
  }, [])

  // Device usage tracking effect
  useEffect(() => {
    const now = Date.now()
    
    setDeviceUsage(prev => {
      const newUsage = { ...prev }
      
      // Track fan usage
      const fanCurrentlyOn = homeState.fan || homeState.controls?.fan
      if (fanCurrentlyOn && !prev.fan.isOn) {
        // Fan turned on
        newUsage.fan = { ...prev.fan, startTime: now, isOn: true }
      } else if (!fanCurrentlyOn && prev.fan.isOn) {
        // Fan turned off
        const duration = (now - prev.fan.startTime) / (1000 * 60 * 60) // Convert to hours
        newUsage.fan = {
          totalHours: prev.fan.totalHours + duration,
          startTime: null,
          isOn: false
        }
      }
      
      // Track Light usage
      for (let i = 1; i <= 4; i++) {
        const LightCurrentlyOn = homeState.Lights?.[i] || homeState.controls?.Lights?.[i]
        if (LightCurrentlyOn && !prev.Lights[i].isOn) {
          // Light turned on
          newUsage.Lights[i] = { ...prev.Lights[i], startTime: now, isOn: true }
        } else if (!LightCurrentlyOn && prev.Lights[i].isOn) {
          // Light turned off
          const duration = (now - prev.Lights[i].startTime) / (1000 * 60 * 60) // Convert to hours
          newUsage.Lights[i] = {
            totalHours: prev.Lights[i].totalHours + duration,
            startTime: null,
            isOn: false
          }
        }
      }
      
      return newUsage
    })
  }, [homeState.fan, homeState.controls?.fan, homeState.Lights, homeState.controls?.Lights])

  // Energy cost calculations (robust to undefined)
  const energyCosts = useMemo(() => {
    const fanHours = deviceUsage?.fan?.totalHours || 0
    const lightsArr = Array.isArray(deviceUsage?.Lights) ? deviceUsage.Lights : [null, {totalHours:0},{totalHours:0},{totalHours:0},{totalHours:0}]
    const lightsCost = lightsArr.slice(1).reduce((total, l) => total + ((l?.totalHours || 0) * 40 / 1000) * 7.15, 0)
    const fanCost = (fanHours * 75 / 1000) * 7.15
    return {
      fan: { cost: fanCost, units: fanHours * 75 / 1000 },
      Lights: { cost: lightsCost, units: lightsArr.slice(1).reduce((total, l) => total + ((l?.totalHours || 0) * 40 / 1000), 0) },
      total: { cost: fanCost + lightsCost, units: (fanHours * 75 + lightsArr.slice(1).reduce((total, l) => total + ((l?.totalHours || 0) * 40), 0)) / 1000 }
    }
  }, [deviceUsage])

  // WebSocket and Firebase data handling
  useEffect(() => {
    let ws
    let reconnectTimeout
    let isConnected = false

    const connectWebSocket = () => {
      if (isConnected) return
      ws = new window.WebSocket('ws://192.168.1.64:5000')
      ws.onopen = () => {
        console.log('Connected to WebSocket')
        isConnected = true
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data) {
            // If backend sends 'leds', also update 'Lights' for UI compatibility
            if (data.leds && !data.Lights) {
              data.Lights = [null, data.leds[1], data.leds[2], data.leds[3], data.leds[4]]
            }
            setHomeState(prev => ({ ...prev, ...data }))
            // Update sensor history
            setSensorHistory(prev => {
              const newTimestamp = new Date().toLocaleTimeString()
              return {
                temperature: [...prev.temperature, data.sensors.temperature].slice(-MAX_DATA_POINTS),
                humidity: [...prev.humidity, data.sensors.humidity].slice(-MAX_DATA_POINTS),
                timestamps: [...prev.timestamps, newTimestamp].slice(-MAX_DATA_POINTS)
              }
            })
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnected = false
      }
      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...')
        isConnected = false
        reconnectTimeout = setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()
    
    return () => {
      isConnected = false
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 10
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 10
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 25, 40, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'normal'
        },
        bodyFont: {
          size: 13
        },
        displayColors: false
      }
    }
  }

  const temperatureData = {
    labels: sensorHistory.timestamps,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: sensorHistory.temperature,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const humidityData = {
    labels: sensorHistory.timestamps,
    datasets: [
      {
        label: 'Humidity (%)',
        data: sensorHistory.humidity,
        borderColor: 'rgba(53, 162, 235, 1)',
        backgroundColor: 'rgba(53, 162, 235, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  // Energy Card Component
  const EnergyCard = ({ title, cost, units, color }) => (
    <motion.div 
      className={`backdrop-blur-xl bg-gradient-to-r ${color} rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <h4 className="text-sm text-white/80 mb-1">{title}</h4>
      <div className="text-xl font-bold text-white">₹{cost.toFixed(2)}</div>
      <div className="text-xs text-white/60">{units.toFixed(3)} units</div>
    </motion.div>
  )

  // Navigation items
  const navItems = [
    { id: 'sensors', icon: FaHome, label: 'Home' },
    { id: 'analytics', icon: FaChartLine, label: 'Analytics' },
    { id: 'energy', icon: FaBolt, label: 'Energy' },
    { id: 'settings', icon: FaCog, label: 'Settings' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Floating Navigation Bar */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-full px-6 py-3 shadow-2xl">
          <div className="flex items-center justify-between space-x-8">
            {/* Logo */}
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <FaMicrochip className="text-cyan-400 text-xl" />
              <h1 className="text-xl font-bold text-cyan-400">SmartNest</h1>
            </motion.div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                      activeTab === item.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="text-sm" />
                    <span className="text-sm">{item.label}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* Clock and User Profile */}
            <div className="flex items-center space-x-4">
              {/* Clock */}
              <div className="hidden lg:block text-right">
                <div className="text-cyan-400 font-mono text-sm">
                  {new Date().toLocaleTimeString()}
                </div>
                <div className="text-gray-400 text-xs">
                  Bengaluru, IN
                </div>
              </div>

              {/* User Profile */}
              {isAuthenticated ? (
                <motion.button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors duration-200 border border-red-500/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSignOutAlt className="text-sm" />
                  <span className="text-sm">Logout</span>
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors duration-200 border border-cyan-500/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaUser className="text-sm" />
                  <span className="text-sm">Login</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-full px-4 py-2 shadow-2xl">
          <div className="flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`p-3 rounded-full transition-all duration-300 ${
                    activeTab === item.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-cyan-300 hover:bg-gray-700/30'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="text-lg" />
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-28 pb-24 space-y-12">
        <AnimatePresence mode="wait">
          {/* Sensor Data Section */}
          {activeTab === 'sensors' && (
            <motion.section
              key="sensors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Sensor Data</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Temperature Card */}
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Temperature  Room 3</h3>
                    <motion.span
                      key={homeState.sensors.temperature}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-mono text-white"
                    >
                      {homeState.sensors.temperature?.toFixed(1)}°C
                    </motion.span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                </motion.div>
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Temperature Room 1</h3>
                    <motion.span
                      key={homeState.sensors.temperature}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-mono text-white"
                    >
                      {homeState.sensors.temperature?.toFixed(1)}°C
                    </motion.span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                </motion.div>
                  <motion.div 
                    className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-cyan-400">Temperature  Room 2</h3>
                      <motion.span
                        key={homeState.sensors.temperature}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-3xl font-mono text-white"
                      >
                        {homeState.sensors.temperature?.toFixed(1)}°C
                      </motion.span>
                    </div>
                    <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                  </motion.div>

                {/* Humidity Card */}
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Humidity</h3>
                    <motion.span
                      key={homeState.sensors.humidity}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-mono text-white"
                    >
                      {homeState.sensors.humidity?.toFixed(1)}%
                    </motion.span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                </motion.div>
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Humidity</h3>
                    <motion.span
                      key={homeState.sensors.humidity}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-mono text-white"
                    >
                      {homeState.sensors.humidity?.toFixed(1)}%
                    </motion.span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                </motion.div>
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Humidity</h3>
                    <motion.span
                      key={homeState.sensors.humidity}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-mono text-white"
                    >
                      {homeState.sensors.humidity?.toFixed(1)}%
                    </motion.span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                </motion.div>

                {/* Light Sensor Card */}
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Room Light</h3>
                    <motion.span
                      key={homeState.sensors.ldr}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-mono text-white"
                    >
                      {homeState.sensors.ldr ? 'Dark' : 'Bright'}
                    </motion.span>
                  </div>
                  <div className="mt-2 h-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                </motion.div>
              </div>

              {/* Devices Section */}
              <div className="mt-12">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Devices</h2>
                <div className="space-y-6">
                  {/* Light Status */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((index) => {
                      const colors = {
                        1: { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500' },
                        2: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
                        3: { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500' },
                        4: { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' }
                      }
                      const isOn = homeState.Lights?.[index] || homeState.controls?.Lights?.[index]

                      return (
                        <motion.div
                          key={`Light-${index}`}
                          className={`p-6 rounded-xl flex flex-col items-center gap-3 transition-all duration-300 cursor-pointer
                            ${isOn ? `${colors[index].bg} border-2 ${colors[index].border} shadow-lg` : 'bg-gray-700/50 border border-gray-600'}
                          `}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setHomeState(prev => ({
                              ...prev,
                              Lights: prev.Lights.map((Light, i) => i === index ? !Light : Light)
                            }))
                          }}
                        >
                          <FaLightbulb className={`text-2xl ${isOn ? colors[index].text : 'text-gray-400'}`} />
                          <span className="text-sm">{['Green', 'Yellow', 'Orange', 'Red'][index - 1]} Light</span>
                          <div className="text-xs text-gray-400">
                            {deviceUsage.Lights[index]?.totalHours.toFixed(1)}h
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Fan Status */}
                  <motion.div
                    className={`p-6 rounded-xl flex items-center justify-center gap-4 transition-all duration-300 cursor-pointer
                      ${(homeState.fan || homeState.controls?.fan)
                        ? 'bg-cyan-500/20 border-2 border-cyan-500 shadow-lg'
                        : 'bg-gray-700/50 border border-gray-600'}
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setHomeState(prev => ({
                        ...prev,
                        fan: !prev.fan
                      }))
                    }}
                  >
                    <FaFan className={`text-3xl ${(homeState.fan || homeState.controls?.fan) ? 'text-cyan-400 animate-spin' : 'text-gray-400'}`} />
                    <div className="text-center">
                      <span className="text-lg block">Fan {(homeState.fan || homeState.controls?.fan) ? 'ON' : 'OFF'}</span>
                      <span className="text-xs text-gray-400">{deviceUsage.fan.totalHours.toFixed(1)}h</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.section>
          )}

          {/* Analytics Section */}
          {activeTab === 'analytics' && (
            <motion.section
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature Chart */}
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700"
                  whileHover={{ scale: 1.01 }}
                >
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">Temperature History</h3>
                  <div className="h-[300px]">
                    <Line options={chartOptions} data={temperatureData} />
                  </div>
                </motion.div>

                {/* Humidity Chart */}
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700"
                  whileHover={{ scale: 1.01 }}
                >
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">Humidity History</h3>
                  <div className="h-[300px]">
                    <Line options={chartOptions} data={humidityData} />
                  </div>
                </motion.div>
              </div>
            </motion.section>
          )}

          {/* Energy Monitor Section */}
          {activeTab === 'energy' && (
            <motion.section
              key="energy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Energy Monitor</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <EnergyCard
                  title="Fan Cost"
                  cost={energyCosts.fan.cost}
                  units={energyCosts.fan.units}
                  color="from-cyan-500/20 to-blue-500/20"
                />
                
                <EnergyCard
                  title="Lights Cost"
                  cost={energyCosts.Lights.cost}
                  units={energyCosts.Lights.units}
                  color="from-yellow-500/20 to-orange-500/20"
                />
                
                <EnergyCard
                  title="Total Cost"
                  cost={energyCosts.total.cost}
                  units={energyCosts.total.units}
                  color="from-green-500/20 to-emerald-500/20"
                />
                
                <motion.div 
                  className="backdrop-blur-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <h4 className="text-sm text-white/80 mb-1">Monthly Est.</h4>
                  <div className="text-xl font-bold text-white">₹{(energyCosts.total.cost * 30).toFixed(0)}</div>
                  <div className="text-xs text-white/60">Based on current usage</div>
                </motion.div>
              </div>
              
              <motion.div 
                className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm space-y-2 md:space-y-0">
                  <span className="text-gray-400">BESCOM Rate: ₹7.15/unit</span>
                  <span className="text-gray-400">Fan (75W) : 13.3h = 1 unit | Light (40W) : 25h = 1 unit</span>
                  <span className="text-cyan-400 flex items-center space-x-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span>Real-time tracking active</span>
                  </span>
                </div>
              </motion.div>

              {/* Device Usage Details */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Fan Usage */}
                <div className="backdrop-blur-xl bg-cyan-500/10 rounded-2xl p-6 border border-cyan-500/20">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center space-x-2">
                    <FaFan />
                    <span>Fan Usage</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Hours:</span>
                      <span className="text-white">{deviceUsage.fan.totalHours.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Power Rating:</span>
                      <span className="text-white">75W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`${homeState.fan ? 'text-green-400' : 'text-gray-400'}`}>
                        {homeState.fan ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Energy Cost:</span>
                      <span className="text-white">₹{energyCosts.fan.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Lights Usage */}
                <div className="backdrop-blur-xl bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/20">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center space-x-2">
                    <FaLightbulb />
                    <span>Lights Usage</span>
                  </h3>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((index) => {
                      const colors = ['Green', 'Yellow', 'Orange', 'Red']
                      const textColors = ['text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400']
                      return (
                        <div key={index} className="flex justify-between items-center">
                          <span className={`${textColors[index - 1]} text-sm`}>
                            {colors[index - 1]} Light:
                          </span>
                          <div className="text-right">
                            <div className="text-white text-sm">
                              {deviceUsage.Lights[index]?.totalHours.toFixed(2)}h
                            </div>
                            <div className="text-xs text-gray-400">
                              ₹{((deviceUsage.Lights[index]?.totalHours || 0) * 40 / 1000 * 7.15).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 border-t border-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Lights Cost:</span>
                        <span className="text-white">₹{energyCosts.Lights.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.section>
          )}

          {/* Settings Section */}
          {activeTab === 'settings' && (
            <motion.section
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Device Control */}
                {/* <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700"
                  whileHover={{ scale: 1.01 }}
                >
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">Device Control</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Master Fan Control</span>
                      <motion.button
                        className={`w-12 h-6 rounded-full ${homeState.fan ? 'bg-cyan-500' : 'bg-gray-600'} relative transition-colors duration-200`}
                        onClick={() => setHomeState(prev => ({ ...prev, fan: !prev.fan }))}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200"
                          animate={{ x: homeState.fan ? 26 : 2 }}
                        />
                      </motion.button>
                    </div>
                    
                    {[1, 2, 3, 4].map((index) => {
                      const colors = ['Green', 'Yellow', 'Orange', 'Red']
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-300">{colors[index - 1]} Light</span>
                          <motion.button
                            className={`w-12 h-6 rounded-full ${homeState.Lights[index] ? 'bg-cyan-500' : 'bg-gray-600'} relative transition-colors duration-200`}
                            onClick={() => setHomeState(prev => ({
                              ...prev,
                              Lights: prev.Lights.map((Light, i) => i === index ? !Light : Light)
                            }))}
                            whileTap={{ scale: 0.95 }}
                          >
                            <motion.div
                              className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200"
                              animate={{ x: homeState.Lights[index] ? 26 : 2 }}
                            />
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </motion.div> */}

                {/* System Information */}
                <motion.div 
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700"
                  whileHover={{ scale: 1.01 }}
                >
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">System Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connection Status:</span>
                      <span className="text-green-400 flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Connected</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Update:</span>
                      <span className="text-white">{new Date().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Devices:</span>
                      <span className="text-white">5 (1 Fan + 4 Lights)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Devices:</span>
                      <span className="text-white">
                        {(homeState.fan ? 1 : 0) + (Array.isArray(homeState.Lights) ? homeState.Lights.slice(1).filter(Boolean).length : 0)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Energy Usage Reset */}
              <motion.div 
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 mt-6"
                whileHover={{ scale: 1.01 }}
              >
                <h3 className="text-xl font-semibold text-cyan-400 mb-4">Energy Usage Management</h3>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
                  <div>
                    <p className="text-gray-300">Reset energy usage tracking</p>
                    <p className="text-sm text-gray-400">This will reset all device usage hours and cost calculations</p>
                  </div>
                  <motion.button
                    className="px-6 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all energy usage data?')) {
                        setDeviceUsage({
                          fan: { totalHours: 0, startTime: null, isOn: false },
                          Lights: [
                            null,
                            { totalHours: 0, startTime: null, isOn: false },
                            { totalHours: 0, startTime: null, isOn: false },
                            { totalHours: 0, startTime: null, isOn: false },
                            { totalHours: 0, startTime: null, isOn: false }
                          ]
                        })
                      }
                    }}
                  >
                    Reset Usage Data
                  </motion.button>
                </div>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowLoginModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-700 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={loginCredentials.username}
                      onChange={(e) => setLoginCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors duration-200"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2">Password</label>
                    <input
                      type="password"
                      value={loginCredentials.password}
                      onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors duration-200"
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="text-sm text-gray-400 bg-gray-700/30 p-3 rounded-lg">
                    Demo credentials: admin / 1234
                  </div>
                  <div className="flex justify-end space-x-4">
                    <motion.button
                      type="button"
                      onClick={() => setShowLoginModal(false)}
                      className="px-6 py-2 rounded-lg bg-gray-700/50 backdrop-blur-sm text-gray-300 hover:bg-gray-600/50 transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      className="px-6 py-2 rounded-lg bg-cyan-500/80 backdrop-blur-sm text-white hover:bg-cyan-600/80 transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Login
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App