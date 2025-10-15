import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  FaHome, 
  FaTemperatureHigh, 
  FaTint, 
  FaChartBar,
  FaMoon, 
  FaSun, 
  FaBell,
  FaExclamationTriangle,
  FaTimes,
  FaDoorOpen,
  FaSpinner
} from 'react-icons/fa';
import './App.css'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Configuration
// const ROOM_IPS = {
//   1: 'http://192.168.1.160:5000',
//   2: 'http://192.168.1.161:5000'
// };
const ROOM_IPS = {
  1: 'http://room1-sensor.local:5000',
  2: 'http://192.168.1.160:5000'
};

const THRESHOLDS = {
  temperature: 29,
  humidity: 85
};

const REFRESH_INTERVAL = 30000;

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-500/90',
    warning: 'bg-yellow-500/90',
    error: 'bg-red-500/90',
    info: 'bg-blue-500/90'
  }[type];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`fixed top-20 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
        <FaTimes size={12} />
      </button>
    </motion.div>
  );
};

// Floating Navbar Component
const Navbar = ({ activeTab, setActiveTab, darkMode, setDarkMode, hasAlert }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'home', icon: FaHome, label: 'Home' },
    { id: 'temperature', icon: FaTemperatureHigh, label: 'Temperature' },
    { id: 'humidity', icon: FaTint, label: 'Humidity' },
    { id: 'analytics', icon: FaChartBar, label: 'Analytics' }
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${
        darkMode ? 'bg-slate-800/90' : 'bg-white/90'
      } backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl border ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(item.id)}
              className={`p-2 rounded-full transition-all ${
                activeTab === item.id
                  ? darkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <item.icon size={18} />
            </motion.button>
          ))}
        </div>
        
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
        
        <div className="flex items-center gap-3">
          {hasAlert && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-red-500"
            >
              <FaBell size={16} />
            </motion.div>
          )}
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${
              darkMode 
                ? 'text-yellow-400 hover:bg-slate-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
          </button>
          
          <div className={`text-xs font-mono ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

// Room Selector Component
const RoomSelector = ({ selectedRoom, setSelectedRoom, roomData, darkMode }) => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${
        darkMode ? 'bg-slate-800/50' : 'bg-white/50'
      } backdrop-blur-xl rounded-2xl p-4 border ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      } max-w-md mx-auto`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaDoorOpen className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={20} />
          <div>
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Room {selectedRoom}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              IP: {roomData[selectedRoom]?.ip || 'Loading...'}
            </p>
          </div>
        </div>
        
        <div className={`flex rounded-full p-1 ${
          darkMode ? 'bg-slate-700' : 'bg-gray-100'
        }`}>
          {[1, 2].map((room) => (
            <motion.button
              key={room}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRoom(room)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedRoom === room
                  ? darkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {room}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Sensor Card Component
const SensorCard = ({ type, value, threshold, darkMode }) => {
  const isAboveThreshold = value > threshold;
  const config = {
    temperature: {
      icon: FaTemperatureHigh,
      color: darkMode ? 'from-orange-500/20 to-red-500/20' : 'from-orange-100 to-red-100',
      textColor: darkMode ? 'text-orange-400' : 'text-orange-600',
      unit: '°C'
    },
    humidity: {
      icon: FaTint,
      color: darkMode ? 'from-blue-500/20 to-cyan-500/20' : 'from-blue-100 to-cyan-100',
      textColor: darkMode ? 'text-blue-400' : 'text-blue-600',
      unit: '%'
    }
  }[type];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${
        darkMode ? 'bg-slate-800/50' : 'bg-white/70'
      } backdrop-blur-xl rounded-2xl p-6 border ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      } bg-gradient-to-br ${config.color} ${
        isAboveThreshold 
          ? darkMode 
            ? 'ring-2 ring-red-500/50' 
            : 'ring-2 ring-red-400/50' 
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <config.icon className={config.textColor} size={24} />
        {isAboveThreshold && (
          <span className="px-2 py-1 text-xs bg-red-500/90 text-white rounded-full animate-pulse">
            Alert
          </span>
        )}
      </div>
      
      <div>
        <h3 className={`text-3xl font-bold ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {value?.toFixed(1) || '--'}{config.unit}
        </h3>
        <p className={`text-sm mt-1 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Threshold: {threshold}{config.unit}
        </p>
      </div>
    </motion.div>
  );
};

// Chart Component
const SensorChart = ({ type, data, threshold, darkMode, onTimeRangeChange, isLoading }) => {
  const [activeRange, setActiveRange] = useState('1h');

  const timeRanges = [
    { id: '1h', label: '1H' },
    { id: '12h', label: '12H' },
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' }
  ];

  const handleRangeChange = (range) => {
    setActiveRange(range);
    onTimeRangeChange(range);
  };

  const chartData = {
    labels: data.timestamps || [],
    datasets: [
      {
        label: type === 'temperature' ? 'Temperature (°C)' : 'Humidity (%)',
        data: data.values || [],
        borderColor: type === 'temperature' ? '#f97316' : '#3b82f6',
        backgroundColor: type === 'temperature' 
          ? 'rgba(249, 115, 22, 0.1)' 
          : 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 6,
      },
      {
        label: 'Threshold',
        data: Array(data.timestamps?.length || 0).fill(threshold),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: darkMode ? '#fff' : '#000',
        bodyColor: darkMode ? '#fff' : '#000',
        borderColor: darkMode ? '#475569' : '#d1d5db',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        grid: {
          color: darkMode ? '#374151' : '#e5e7eb',
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          maxRotation: 45,
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${
        darkMode ? 'bg-slate-800/50' : 'bg-white/70'
      } backdrop-blur-xl rounded-2xl p-6 border ${
        darkMode ? 'border-slate-700' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {timeRanges.map(({ id, label }) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleRangeChange(id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              activeRange === id
                ? darkMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-500 text-white'
                : darkMode
                  ? 'bg-slate-700 text-gray-400 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div className="relative h-80">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <FaSpinner className={`animate-spin ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`} size={24} />
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </motion.div>
  );
};

// Analytics Component
const Analytics = ({ data, type, darkMode }) => {
  const values = data.values || [];
  
  const stats = {
    avg: values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0,
    min: values.length ? Math.min(...values).toFixed(1) : 0,
    max: values.length ? Math.max(...values).toFixed(1) : 0,
    trend: values.length > 1 ? (values[values.length - 1] > values[0] ? 'up' : 'down') : 'stable'
  };

  const unit = type === 'temperature' ? '°C' : '%';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(stats).map(([key, value]) => (
        <motion.div
          key={key}
          whileHover={{ scale: 1.05 }}
          className={`${
            darkMode ? 'bg-slate-800/50' : 'bg-white/70'
          } backdrop-blur-xl rounded-xl p-4 border ${
            darkMode ? 'border-slate-700' : 'border-gray-200'
          }`}
        >
          <h4 className={`text-sm font-medium ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </h4>
          <p className={`text-2xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {key === 'trend' ? value : `${value}${unit}`}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

// Alert Modal Component
const AlertModal = ({ isOpen, onClose, type, value, threshold, darkMode }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`relative ${
          darkMode ? 'bg-slate-800' : 'bg-white'
        } rounded-2xl p-6 max-w-md w-full border ${
          darkMode ? 'border-slate-700' : 'border-gray-200'
        } shadow-2xl`}
      >
        <div className="flex items-center gap-4 mb-4">
          <FaExclamationTriangle className="text-red-500" size={24} />
          <h3 className={`text-lg font-semibold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Threshold Alert
          </h3>
        </div>
        
        <p className={`mb-6 ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {type} value ({value?.toFixed(1)}) has exceeded the threshold of {threshold}.
          Please check the environment conditions.
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
        >
          Acknowledge
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [roomData, setRoomData] = useState({ 1: {}, 2: {} });
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null
  });
  const [chartData, setChartData] = useState({
    temperature: { timestamps: [], values: [] },
    humidity: { timestamps: [], values: [] }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: null,
    value: null
  });
  const [toasts, setToasts] = useState([]);

  // Toast functions
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch room IP
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch(`${ROOM_IPS[selectedRoom]}/get-ip`);
        const data = await response.json();
        setRoomData(prev => ({
          ...prev,
          [selectedRoom]: { ...prev[selectedRoom], ip: data.ipAddress }
        }));
      } catch (error) {
        console.error('Failed to fetch IP:', error);
        showToast('Failed to connect to sensor', 'error');
      }
    };
    fetchIp();
  }, [selectedRoom]);

  // Fetch latest sensor data
  const fetchLatestData = useCallback(async () => {
    try {
      const response = await fetch(`${ROOM_IPS[selectedRoom]}/api/data/latest`);
      const [data] = await response.json();
      
      setSensorData({
        temperature: data.temperature,
        humidity: data.humidity
      });

      // Check thresholds
      if (data.temperature > THRESHOLDS.temperature) {
        setAlertConfig({
          isOpen: true,
          type: 'temperature',
          value: data.temperature
        });
        showToast(`Temperature alert: ${data.temperature}°C`, 'warning');
      } else if (data.humidity > THRESHOLDS.humidity) {
        setAlertConfig({
          isOpen: true,
          type: 'humidity',
          value: data.humidity
        });
        showToast(`Humidity alert: ${data.humidity}%`, 'warning');
      }
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
      showToast('Failed to fetch sensor data', 'error');
    }
  }, [selectedRoom]);

  // Fetch chart data
  const fetchChartData = useCallback(async (timeRange) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${ROOM_IPS[selectedRoom]}/api/data/${timeRange}`);
      const data = await response.json();
      
      setChartData({
        temperature: {
          timestamps: data.map(d => new Date(d.timestamp).toLocaleString()),
          values: data.map(d => d.temperature)
        },
        humidity: {
          timestamps: data.map(d => new Date(d.timestamp).toLocaleString()),
          values: data.map(d => d.humidity)
        }
      });
      showToast(`Data loaded for ${timeRange}`, 'success');
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      showToast('Failed to load chart data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoom]);

  // Auto-refresh latest data
  useEffect(() => {
    fetchLatestData();
    const interval = setInterval(fetchLatestData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLatestData]);

  // Initial chart data
  useEffect(() => {
    fetchChartData('1h');
  }, [fetchChartData]);

  const hasAlert = 
    sensorData.temperature > THRESHOLDS.temperature || 
    sensorData.humidity > THRESHOLDS.humidity;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
        : 'bg-gradient-to-br from-blue-50 to-white'
    }`}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        hasAlert={hasAlert}
      />

      <main className="container mx-auto px-4 pt-24 pb-8">
        <RoomSelector
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
          roomData={roomData}
          darkMode={darkMode}
        />

        {activeTab === 'home' && (
          <div className="mt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SensorCard
                type="temperature"
                value={sensorData.temperature}
                threshold={THRESHOLDS.temperature}
                darkMode={darkMode}
              />
              <SensorCard
                type="humidity"
                value={sensorData.humidity}
                threshold={THRESHOLDS.humidity}
                darkMode={darkMode}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SensorChart
                type="temperature"
                data={chartData.temperature}
                threshold={THRESHOLDS.temperature}
                darkMode={darkMode}
                isLoading={isLoading}
                onTimeRangeChange={fetchChartData}
              />
              <SensorChart
                type="humidity"
                data={chartData.humidity}
                threshold={THRESHOLDS.humidity}
                darkMode={darkMode}
                isLoading={isLoading}
                onTimeRangeChange={fetchChartData}
              />
            </div>
          </div>
        )}

        {activeTab === 'temperature' && (
          <div className="mt-8 space-y-6">
            <SensorCard
              type="temperature"
              value={sensorData.temperature}
              threshold={THRESHOLDS.temperature}
              darkMode={darkMode}
            />
            <SensorChart
              type="temperature"
              data={chartData.temperature}
              threshold={THRESHOLDS.temperature}
              darkMode={darkMode}
              isLoading={isLoading}
              onTimeRangeChange={fetchChartData}
            />
          </div>
        )}

        {activeTab === 'humidity' && (
          <div className="mt-8 space-y-6">
            <SensorCard
              type="humidity"
              value={sensorData.humidity}
              threshold={THRESHOLDS.humidity}
              darkMode={darkMode}
            />
            <SensorChart
              type="humidity"
              data={chartData.humidity}
              threshold={THRESHOLDS.humidity}
              darkMode={darkMode}
              isLoading={isLoading}
              onTimeRangeChange={fetchChartData}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Temperature Analytics
              </h2>
              <Analytics 
                data={chartData.temperature} 
                type="temperature" 
                darkMode={darkMode} 
              />
            </div>
            
            <div>
              <h2 className={`text-2xl font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Humidity Analytics
              </h2>
              <Analytics 
                data={chartData.humidity} 
                type="humidity" 
                darkMode={darkMode} 
              />
            </div>
          </div>
        )}

        <AlertModal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          type={alertConfig.type}
          value={alertConfig.value}
          threshold={THRESHOLDS[alertConfig.type]}
          darkMode={darkMode}
        />

        {/* Toast Container */}
        <div className="fixed top-20 right-4 z-40 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className={`text-center py-4 ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <p className="text-sm">Environmental Monitoring Dashboard</p>
      </footer>
    </div>
  );
}

export default App;