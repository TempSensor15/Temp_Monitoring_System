import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
  FaSpinner,
  FaDownload,
  FaCog,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaSave,
  FaArrowUp,
  FaArrowDown,
  FaMinus
} from 'react-icons/fa';
import './App.css';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler, ArcElement);

// Configuration
const DEFAULT_ROOM_IPS = {
  1: 'http://192.168.1.160:5000',
  2: 'http://192.168.1.161:5000'
};

const DEFAULT_THRESHOLDS = {
  temperature: 29,
  humidity: 85
};

const REFRESH_INTERVAL = 30000;

// Utility functions
const getStoredValue = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredValue = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// CSV Download function
const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data available to download');
    return;
  }

  const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => `${row.timestamp},${row.temperature},${row.humidity}`)
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-emerald-500/95',
    warning: 'bg-amber-500/95',
    error: 'bg-rose-500/95',
    info: 'bg-blue-500/95'
  }[type];

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className={`fixed top-20 right-4 z-50 ${bgColor} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-sm`}
    >
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-lg p-1.5 transition-colors">
        <FaTimes size={12} />
      </button>
    </motion.div>
  );
};

// Settings Modal Component
const SettingsModal = ({ isOpen, onClose, settings, onSave, darkMode }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`relative ${
          darkMode ? 'bg-slate-800/95' : 'bg-white/95'
        } backdrop-blur-xl rounded-2xl p-8 max-w-2xl w-full border ${
          darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
        } shadow-2xl max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FaCog className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Thresholds Section */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Alert Thresholds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={localSettings.thresholds.temperature}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    thresholds: { ...localSettings.thresholds, temperature: parseFloat(e.target.value) }
                  })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-slate-700/50 border-slate-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Humidity (%)
                </label>
                <input
                  type="number"
                  value={localSettings.thresholds.humidity}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    thresholds: { ...localSettings.thresholds, humidity: parseFloat(e.target.value) }
                  })}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-slate-700/50 border-slate-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
              </div>
            </div>
          </div>

          {/* Room IPs Section */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Room IP Addresses
            </h3>
            <div className="space-y-4">
              {[1, 2].map((room) => (
                <div key={room}>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Room {room} IP Address
                  </label>
                  <input
                    type="text"
                    value={localSettings.roomIps[room]}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      roomIps: { ...localSettings.roomIps, [room]: e.target.value }
                    })}
                    placeholder="http://192.168.1.xxx:5000"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      darkMode 
                        ? 'bg-slate-700/50 border-slate-600 text-white placeholder-gray-500' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <FaSave size={16} />
            Save Changes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Floating Navbar Component
const Navbar = ({ activeTab, setActiveTab, darkMode, setDarkMode, hasAlert, onSettingsClick }) => {
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
        darkMode ? 'bg-slate-800/95' : 'bg-white/95'
      } backdrop-blur-2xl rounded-full px-6 py-3 shadow-2xl border ${
        darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 ${
                activeTab === item.id
                  ? darkMode 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <item.icon size={16} />
              <span className="text-sm font-medium hidden md:inline">{item.label}</span>
            </motion.button>
          ))}
        </div>
        
        <div className={`w-px h-8 ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
        
        <div className="flex items-center gap-3">
          {hasAlert && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-rose-500"
            >
              <FaBell size={16} />
            </motion.div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className={`p-2 rounded-full transition-colors ${
              darkMode 
                ? 'text-gray-400 hover:bg-slate-700 hover:text-white' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <FaCog size={16} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${
              darkMode 
                ? 'text-amber-400 hover:bg-slate-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
          </motion.button>
          
          <div className={`text-xs font-mono px-3 py-1 rounded-full ${
            darkMode ? 'text-gray-400 bg-slate-700/50' : 'text-gray-600 bg-gray-100'
          }`}>
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

// Room Selector with Status Component
const RoomSelector = ({ selectedRoom, setSelectedRoom, roomData, darkMode, connectionStatus }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <FaCheckCircle className="text-emerald-500" size={20} />;
      case 'error':
        return <FaTimesCircle className="text-rose-500" size={20} />;
      case 'warning':
        return <FaExclamationCircle className="text-amber-500" size={20} />;
      default:
        return <FaSpinner className="text-gray-400 animate-spin" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Failed';
      case 'warning':
        return 'Check IP Address';
      default:
        return 'Connecting...';
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${
        darkMode ? 'bg-slate-800/50' : 'bg-white/70'
      } backdrop-blur-xl rounded-2xl p-6 border ${
        darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
      } max-w-2xl mx-auto shadow-xl`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
          }`}>
            <FaDoorOpen className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
          </div>
          <div>
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Room {selectedRoom}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(connectionStatus[selectedRoom])}
              <p className={`text-sm font-medium ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {getStatusText(connectionStatus[selectedRoom])}
              </p>
            </div>
            <p className={`text-xs mt-1 font-mono ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {roomData[selectedRoom]?.ip || 'No IP configured'}
            </p>
          </div>
        </div>
        
        <div className={`flex rounded-full p-1.5 ${
          darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
        }`}>
          {[1, 2].map((room) => (
            <motion.button
              key={room}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRoom(room)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                selectedRoom === room
                  ? darkMode 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Room {room}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Download Button Component
const DownloadButton = ({ onDownload, selectedRange, darkMode, disabled }) => {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onDownload}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
        disabled
          ? darkMode
            ? 'bg-slate-700/50 text-gray-500 cursor-not-allowed'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : darkMode
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
      }`}
    >
      <FaDownload size={14} />
      <span className="text-sm">Download CSV ({selectedRange.toUpperCase()})</span>
    </motion.button>
  );
};

// Enhanced Sensor Card Component
const SensorCard = ({ type, value, threshold, darkMode, trend }) => {
  const isAboveThreshold = value > threshold;
  const config = {
    temperature: {
      icon: FaTemperatureHigh,
      gradient: darkMode 
        ? 'from-orange-500/20 via-red-500/20 to-pink-500/20' 
        : 'from-orange-100 via-red-100 to-pink-100',
      iconColor: darkMode ? 'text-orange-400' : 'text-orange-600',
      unit: '°C',
      name: 'Temperature'
    },
    humidity: {
      icon: FaTint,
      gradient: darkMode 
        ? 'from-blue-500/20 via-cyan-500/20 to-teal-500/20' 
        : 'from-blue-100 via-cyan-100 to-teal-100',
      iconColor: darkMode ? 'text-blue-400' : 'text-blue-600',
      unit: '%',
      name: 'Humidity'
    }
  }[type];

  const getTrendIcon = () => {
    if (trend > 0) return <FaArrowUp className="text-rose-500" />;
    if (trend < 0) return <FaArrowDown className="text-emerald-500" />;
    return <FaMinus className="text-gray-500" />;
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`${
        darkMode ? 'bg-slate-800/70' : 'bg-white/90'
      } backdrop-blur-xl rounded-3xl p-6 border ${
        darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
      } bg-gradient-to-br ${config.gradient} ${
        isAboveThreshold 
          ? darkMode 
            ? 'ring-2 ring-rose-500/50 shadow-2xl shadow-rose-500/20' 
            : 'ring-2 ring-rose-400/50 shadow-xl shadow-rose-400/20' 
          : 'shadow-xl'
      } transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${
          darkMode ? 'bg-slate-700/50' : 'bg-white/80'
        }`}>
          <config.icon className={config.iconColor} size={28} />
        </div>
        {isAboveThreshold && (
          <motion.span 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="px-3 py-1.5 text-xs bg-rose-500 text-white rounded-full font-bold shadow-lg"
          >
            ALERT
          </motion.span>
        )}
      </div>
      
      <div>
        <p className={`text-sm font-medium mb-2 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {config.name}
        </p>
        <h3 className={`text-5xl font-bold mb-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {value?.toFixed(1) || '--'}
          <span className="text-2xl ml-1">{config.unit}</span>
        </h3>
        <div className="flex items-center justify-between mt-4">
          <p className={`text-xs ${
            darkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Threshold: {threshold}{config.unit}
          </p>
          <div className="flex items-center gap-1 text-xs font-medium">
            {getTrendIcon()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Chart Component
const SensorChart = ({ type, data, threshold, darkMode, onTimeRangeChange, isLoading, onDownload }) => {
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
        pointRadius: 3,
        pointHoverRadius: 8,
        pointBackgroundColor: type === 'temperature' ? '#f97316' : '#3b82f6',
        borderWidth: 3,
      },
      {
        label: 'Threshold',
        data: Array(data.timestamps?.length || 0).fill(threshold),
        borderColor: '#ef4444',
        borderDash: [8, 4],
        fill: false,
        pointRadius: 0,
        borderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? '#fff' : '#000',
        bodyColor: darkMode ? '#fff' : '#000',
        borderColor: darkMode ? '#475569' : '#d1d5db',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        boxPadding: 4,
      }
    },
    scales: {
      y: {
        grid: {
          color: darkMode ? '#334155' : '#e5e7eb',
          drawBorder: false,
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          maxRotation: 45,
          font: {
            size: 10,
            weight: '500'
          }
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`${
        darkMode ? 'bg-slate-800/70' : 'bg-white/90'
      } backdrop-blur-xl rounded-3xl p-6 border ${
        darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
      } shadow-xl`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {timeRanges.map(({ id, label }) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRangeChange(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeRange === id
                  ? darkMode 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : darkMode
                    ? 'bg-slate-700/50 text-gray-400 hover:text-white hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              {label}
            </motion.button>
          ))}
        </div>
        <DownloadButton 
          onDownload={() => onDownload(activeRange)} 
          selectedRange={activeRange}
          darkMode={darkMode}
          disabled={isLoading || !data.values?.length}
        />
      </div>

      <div className="relative h-80">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <FaSpinner className={`animate-spin mx-auto mb-3 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`} size={32} />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading data...
              </p>
            </div>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </motion.div>
  );
};

// Advanced Analytics Component
const AdvancedAnalytics = ({ tempData, humData, darkMode }) => {
  const tempValues = tempData.values || [];
  const humValues = humData.values || [];
  
  const calculateStats = (values) => {
    if (!values.length) return { avg: 0, min: 0, max: 0, range: 0, stdDev: 0 };
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return { avg, min, max, range, stdDev };
  };

  const tempStats = calculateStats(tempValues);
  const humStats = calculateStats(humValues);

  // Distribution chart data
  const createDistribution = (values, bins = 10) => {
    if (!values.length) return { labels: [], data: [] };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    const distribution = Array(bins).fill(0);
    const labels = [];

    for (let i = 0; i < bins; i++) {
      const start = min + i * binSize;
      const end = start + binSize;
      labels.push(`${start.toFixed(1)}-${end.toFixed(1)}`);
      
      values.forEach(val => {
        if (val >= start && (i === bins - 1 ? val <= end : val < end)) {
          distribution[i]++;
        }
      });
    }

    return { labels, data: distribution };
  };

  const tempDist = createDistribution(tempValues);
  const humDist = createDistribution(humValues);

  // Comparison Doughnut Chart
  const comparisonData = {
    labels: ['Temperature Variance', 'Humidity Variance'],
    datasets: [{
      data: [tempStats.stdDev, humStats.stdDev],
      backgroundColor: [
        'rgba(249, 115, 22, 0.8)',
        'rgba(59, 130, 246, 0.8)',
      ],
      borderColor: [
        '#f97316',
        '#3b82f6',
      ],
      borderWidth: 2,
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          padding: 15,
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? '#fff' : '#000',
        bodyColor: darkMode ? '#fff' : '#000',
        borderColor: darkMode ? '#475569' : '#d1d5db',
        borderWidth: 1,
      }
    }
  };

  // Bar chart for distribution
  const createBarChart = (dist, color) => ({
    labels: dist.labels,
    datasets: [{
      label: 'Frequency',
      data: dist.data,
      backgroundColor: `${color}40`,
      borderColor: color,
      borderWidth: 2,
      borderRadius: 8,
    }]
  });

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? '#fff' : '#000',
        bodyColor: darkMode ? '#fff' : '#000',
        borderColor: darkMode ? '#475569' : '#d1d5db',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        grid: {
          color: darkMode ? '#334155' : '#e5e7eb',
          drawBorder: false,
        },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          font: { size: 11, weight: '500' }
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          maxRotation: 45,
          font: { size: 10, weight: '500' }
        }
      }
    }
  };

  const StatCard = ({ title, value, unit, icon: Icon, color }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`${
        darkMode ? 'bg-slate-800/70' : 'bg-white/90'
      } backdrop-blur-xl rounded-2xl p-5 border ${
        darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
      } shadow-lg`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={color} size={24} />
      </div>
      <h4 className={`text-xs font-medium mb-1 uppercase tracking-wide ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {title}
      </h4>
      <p className={`text-2xl font-bold ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
        <span className="text-sm ml-1 font-normal">{unit}</span>
      </p>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Statistics Grid */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Temperature Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Average" value={tempStats.avg.toFixed(1)} unit="°C" icon={FaTemperatureHigh} color="text-orange-500" />
          <StatCard title="Minimum" value={tempStats.min.toFixed(1)} unit="°C" icon={FaArrowDown} color="text-blue-500" />
          <StatCard title="Maximum" value={tempStats.max.toFixed(1)} unit="°C" icon={FaArrowUp} color="text-rose-500" />
          <StatCard title="Range" value={tempStats.range.toFixed(1)} unit="°C" icon={FaMinus} color="text-purple-500" />
          <StatCard title="Std Dev" value={tempStats.stdDev.toFixed(2)} unit="°C" icon={FaChartBar} color="text-amber-500" />
        </div>
      </div>

      <div>
        <h2 className={`text-2xl font-bold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Humidity Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Average" value={humStats.avg.toFixed(1)} unit="%" icon={FaTint} color="text-blue-500" />
          <StatCard title="Minimum" value={humStats.min.toFixed(1)} unit="%" icon={FaArrowDown} color="text-cyan-500" />
          <StatCard title="Maximum" value={humStats.max.toFixed(1)} unit="%" icon={FaArrowUp} color="text-indigo-500" />
          <StatCard title="Range" value={humStats.range.toFixed(1)} unit="%" icon={FaMinus} color="text-teal-500" />
          <StatCard title="Std Dev" value={humStats.stdDev.toFixed(2)} unit="%" icon={FaChartBar} color="text-sky-500" />
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${
            darkMode ? 'bg-slate-800/70' : 'bg-white/90'
          } backdrop-blur-xl rounded-3xl p-6 border ${
            darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
          } shadow-xl`}
        >
          <h3 className={`text-lg font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Temperature Distribution
          </h3>
          <div className="h-64">
            <Bar data={createBarChart(tempDist, '#f97316')} options={barOptions} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${
            darkMode ? 'bg-slate-800/70' : 'bg-white/90'
          } backdrop-blur-xl rounded-3xl p-6 border ${
            darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
          } shadow-xl`}
        >
          <h3 className={`text-lg font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Humidity Distribution
          </h3>
          <div className="h-64">
            <Bar data={createBarChart(humDist, '#3b82f6')} options={barOptions} />
          </div>
        </motion.div>
      </div>

      {/* Variance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${
            darkMode ? 'bg-slate-800/70' : 'bg-white/90'
          } backdrop-blur-xl rounded-3xl p-6 border ${
            darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
          } shadow-xl`}
        >
          <h3 className={`text-lg font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Variance Comparison
          </h3>
          <div className="h-64">
            <Doughnut data={comparisonData} options={doughnutOptions} />
          </div>
        </motion.div>

        {/* Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${
            darkMode ? 'bg-slate-800/70' : 'bg-white/90'
          } backdrop-blur-xl rounded-3xl p-6 border ${
            darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
          } shadow-xl`}
        >
          <h3 className={`text-lg font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Key Insights
          </h3>
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${
              darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <FaTemperatureHigh className="text-orange-500" />
                <h4 className={`font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Temperature Stability
                </h4>
              </div>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {tempStats.stdDev < 1 
                  ? 'Very stable with minimal fluctuations'
                  : tempStats.stdDev < 2 
                    ? 'Moderate variations observed'
                    : 'High variability detected - consider environmental control'}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${
              darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <FaTint className="text-blue-500" />
                <h4 className={`font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Humidity Stability
                </h4>
              </div>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {humStats.stdDev < 3 
                  ? 'Excellent humidity control maintained'
                  : humStats.stdDev < 5 
                    ? 'Acceptable humidity variations'
                    : 'High humidity fluctuations - review ventilation'}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${
              darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <FaChartBar className="text-purple-500" />
                <h4 className={`font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Overall Assessment
                </h4>
              </div>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {tempStats.avg < 25 && humStats.avg < 60
                  ? 'Optimal environmental conditions maintained'
                  : tempStats.avg > 28 || humStats.avg > 70
                    ? 'Conditions approaching threshold limits'
                    : 'Acceptable environmental parameters'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
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
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className={`relative ${
          darkMode ? 'bg-slate-800/95' : 'bg-white/95'
        } backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border ${
          darkMode ? 'border-slate-700/50' : 'border-gray-200/50'
        } shadow-2xl`}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-rose-500/20 rounded-2xl">
            <FaExclamationTriangle className="text-rose-500" size={28} />
          </div>
          <h3 className={`text-xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Threshold Alert
          </h3>
        </div>
        
        <p className={`mb-6 leading-relaxed ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          The {type} value of <span className="font-bold">{value?.toFixed(1)}</span> has exceeded 
          the configured threshold of <span className="font-bold">{threshold}</span>.
          Please check the environmental conditions immediately.
        </p>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/30"
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
    getStoredValue('darkMode', window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [settings, setSettings] = useState(() => ({
    roomIps: getStoredValue('roomIps', DEFAULT_ROOM_IPS),
    thresholds: getStoredValue('thresholds', DEFAULT_THRESHOLDS)
  }));
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ 1: 'loading', 2: 'loading' });
  const [roomData, setRoomData] = useState({ 1: {}, 2: {} });
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null
  });
  const [chartData, setChartData] = useState({
    temperature: { timestamps: [], values: [] },
    humidity: { timestamps: [], values: [] }
  });
  const [fullChartData, setFullChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: null,
    value: null
  });
  const [toasts, setToasts] = useState([]);

  // Save dark mode preference
  useEffect(() => {
    setStoredValue('darkMode', darkMode);
  }, [darkMode]);

  // Toast functions
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Handle settings save
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setStoredValue('roomIps', newSettings.roomIps);
    setStoredValue('thresholds', newSettings.thresholds);
    showToast('Settings saved successfully', 'success');
    
    // Reset connection status to retry with new IPs
    setConnectionStatus({ 1: 'loading', 2: 'loading' });
  };

  // Check connection status
  const checkConnection = useCallback(async (room) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${settings.roomIps[room]}/get-ip`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setRoomData(prev => ({
          ...prev,
          [room]: { ...prev[room], ip: data.ipAddress }
        }));
        setConnectionStatus(prev => ({ ...prev, [room]: 'connected' }));
        return true;
      } else {
        setConnectionStatus(prev => ({ ...prev, [room]: 'error' }));
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setConnectionStatus(prev => ({ ...prev, [room]: 'warning' }));
      } else {
        setConnectionStatus(prev => ({ ...prev, [room]: 'error' }));
      }
      return false;
    }
  }, [settings.roomIps]);

  // Check connection on room change and settings update
  useEffect(() => {
    checkConnection(selectedRoom);
  }, [selectedRoom, checkConnection]);

  // Fetch latest sensor data
  const fetchLatestData = useCallback(async () => {
    if (connectionStatus[selectedRoom] !== 'connected') return;
    
    try {
      const response = await fetch(`${settings.roomIps[selectedRoom]}/api/data/1h`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      if (data.length === 0) return;
      
      const latest = data[data.length - 1];
      
      setSensorData({
        temperature: latest.temperature,
        humidity: latest.humidity
      });

      // Check thresholds
      if (latest.temperature > settings.thresholds.temperature) {
        setAlertConfig({
          isOpen: true,
          type: 'temperature',
          value: latest.temperature
        });
        showToast(`Temperature alert: ${latest.temperature.toFixed(1)}°C`, 'warning');
      } else if (latest.humidity > settings.thresholds.humidity) {
        setAlertConfig({
          isOpen: true,
          type: 'humidity',
          value: latest.humidity
        });
        showToast(`Humidity alert: ${latest.humidity.toFixed(1)}%`, 'warning');
      }
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
    }
  }, [selectedRoom, connectionStatus, settings]);

  // Fetch chart data
  const fetchChartData = useCallback(async (timeRange) => {
    if (connectionStatus[selectedRoom] !== 'connected') {
      showToast('Cannot fetch data - device not connected', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${settings.roomIps[selectedRoom]}/api/data/${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      
      setFullChartData(data);
      setChartData({
        temperature: {
          timestamps: data.map(d => new Date(d.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })),
          values: data.map(d => d.temperature)
        },
        humidity: {
          timestamps: data.map(d => new Date(d.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })),
          values: data.map(d => d.humidity)
        }
      });
      showToast(`Data loaded for ${timeRange.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      showToast('Failed to load chart data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoom, connectionStatus, settings.roomIps]);

  // Download CSV function
  const handleDownloadCSV = useCallback(async (timeRange) => {
    if (connectionStatus[selectedRoom] !== 'connected') {
      showToast('Cannot download - device not connected', 'error');
      return;
    }

    try {
      const response = await fetch(`${settings.roomIps[selectedRoom]}/api/data/${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      const filename = `room${selectedRoom}_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(data, filename);
      showToast(`Downloaded ${filename}`, 'success');
    } catch (error) {
      console.error('Failed to download CSV:', error);
      showToast('Failed to download CSV', 'error');
    }
  }, [selectedRoom, connectionStatus, settings.roomIps]);

  // Auto-refresh latest data
  useEffect(() => {
    fetchLatestData();
    const interval = setInterval(fetchLatestData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLatestData]);

  // Initial chart data
  useEffect(() => {
    if (connectionStatus[selectedRoom] === 'connected') {
      fetchChartData('1h');
    }
  }, [selectedRoom, connectionStatus, fetchChartData]);

  const hasAlert = 
    sensorData.temperature > settings.thresholds.temperature || 
    sensorData.humidity > settings.thresholds.humidity;

  const calculateTrend = (values) => {
    if (!values || values.length < 2) return 0;
    const recent = values.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    return values[values.length - 1] - avg;
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        hasAlert={hasAlert}
        onSettingsClick={() => setShowSettings(true)}
      />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <RoomSelector
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
          roomData={roomData}
          darkMode={darkMode}
          connectionStatus={connectionStatus}
        />

        {activeTab === 'home' && (
          <div className="mt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SensorCard
                type="temperature"
                value={sensorData.temperature}
                threshold={settings.thresholds.temperature}
                darkMode={darkMode}
                trend={calculateTrend(chartData.temperature.values)}
              />
              <SensorCard
                type="humidity"
                value={sensorData.humidity}
                threshold={settings.thresholds.humidity}
                darkMode={darkMode}
                trend={calculateTrend(chartData.humidity.values)}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SensorChart
                type="temperature"
                data={chartData.temperature}
                threshold={settings.thresholds.temperature}
                darkMode={darkMode}
                isLoading={isLoading}
                onTimeRangeChange={fetchChartData}
                onDownload={handleDownloadCSV}
              />
              <SensorChart
                type="humidity"
                data={chartData.humidity}
                threshold={settings.thresholds.humidity}
                darkMode={darkMode}
                isLoading={isLoading}
                onTimeRangeChange={fetchChartData}
                onDownload={handleDownloadCSV}
              />
            </div>
          </div>
        )}

        {activeTab === 'temperature' && (
          <div className="mt-8 space-y-6">
            <SensorCard
              type="temperature"
              value={sensorData.temperature}
              threshold={settings.thresholds.temperature}
              darkMode={darkMode}
              trend={calculateTrend(chartData.temperature.values)}
            />
            <SensorChart
              type="temperature"
              data={chartData.temperature}
              threshold={settings.thresholds.temperature}
              darkMode={darkMode}
              isLoading={isLoading}
              onTimeRangeChange={fetchChartData}
              onDownload={handleDownloadCSV}
            />
          </div>
        )}

        {activeTab === 'humidity' && (
          <div className="mt-8 space-y-6">
            <SensorCard
              type="humidity"
              value={sensorData.humidity}
              threshold={settings.thresholds.humidity}
              darkMode={darkMode}
              trend={calculateTrend(chartData.humidity.values)}
            />
            <SensorChart
              type="humidity"
              data={chartData.humidity}
              threshold={settings.thresholds.humidity}
              darkMode={darkMode}
              isLoading={isLoading}
              onTimeRangeChange={fetchChartData}
              onDownload={handleDownloadCSV}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="mt-8">
            <AdvancedAnalytics 
              tempData={chartData.temperature}
              humData={chartData.humidity}
              darkMode={darkMode}
            />
          </div>
        )}

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={handleSaveSettings}
          darkMode={darkMode}
        />

        <AlertModal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          type={alertConfig.type}
          value={alertConfig.value}
          threshold={settings.thresholds[alertConfig.type]}
          darkMode={darkMode}
        />

        {/* Toast Container */}
        <div className="fixed top-20 right-4 z-40 space-y-2">
          <AnimatePresence>
            {toasts.map((toast) => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className={`text-center py-6 ${
        darkMode ? 'text-gray-500' : 'text-gray-600'
      }`}>
        <p className="text-sm font-medium">Environmental Monitoring Dashboard</p>
        <p className="text-xs mt-1">Real-time sensor data visualization</p>
      </footer>
    </div>
  );
}

export default App;