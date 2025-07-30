import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import RoomSelector from './components/RoomSelector';
import SensorCard from './components/SensorCard';
import SensorChart from './components/SensorChart';
import ThresholdAlert from './components/ThresholdAlert';
import './App.css'
// Configuration
const ROOM_IPS = {
  1: 'http://192.168.1.160:5000', // Change these to your RPi IPs
  2: 'http://192.168.1.160:5000'
};

const THRESHOLDS = {
  temperature: 29, // °C
  humidity: 70 // %
};

const REFRESH_INTERVAL = 30000; // 30 seconds

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRoom, setSelectedRoom] = useState(1);
  const [roomIp, setRoomIp] = useState('');
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

  // Fetch current room's IP
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch(`${ROOM_IPS[selectedRoom]}/get-ip`);
        const data = await response.json();
        setRoomIp(data.ipAddress);
      } catch (error) {
        console.error('Failed to fetch IP:', error);
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
      } else if (data.humidity > THRESHOLDS.humidity) {
        setAlertConfig({
          isOpen: true,
          type: 'humidity',
          value: data.humidity
        });
      }
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
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
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoom]);

  // Set up auto-refresh
  useEffect(() => {
    fetchLatestData();
    const interval = setInterval(fetchLatestData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLatestData]);

  // Initial chart data load
  useEffect(() => {
    fetchChartData('1h');
  }, [fetchChartData]);

  const hasThresholdAlert = 
    sensorData.temperature > THRESHOLDS.temperature || 
    sensorData.humidity > THRESHOLDS.humidity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasThresholdAlert={hasThresholdAlert}
      />

      <main className="container mx-auto px-4 pt-20 pb-8">
        <RoomSelector
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
          roomIp={roomIp}
        />

        {activeTab === 'home' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <SensorCard
                type="temperature"
                value={sensorData.temperature}
                threshold={THRESHOLDS.temperature}
                isAboveThreshold={sensorData.temperature > THRESHOLDS.temperature}
              />
              <SensorCard
                type="humidity"
                value={sensorData.humidity}
                threshold={THRESHOLDS.humidity}
                isAboveThreshold={sensorData.humidity > THRESHOLDS.humidity}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <SensorChart
                type="temperature"
                data={chartData.temperature}
                threshold={THRESHOLDS.temperature}
                isLoading={isLoading}
                onTimeRangeChange={fetchChartData}
              />
              <SensorChart
                type="humidity"
                data={chartData.humidity}
                threshold={THRESHOLDS.humidity}
                isLoading={isLoading}
                onTimeRangeChange={fetchChartData}
              />
            </div>
          </>
        )}

        {activeTab === 'temperature' && (
          <div className="space-y-6 mt-6">
            <SensorCard
              type="temperature"
              value={sensorData.temperature}
              threshold={THRESHOLDS.temperature}
              isAboveThreshold={sensorData.temperature > THRESHOLDS.temperature}
            />
            <SensorChart
              type="temperature"
              data={chartData.temperature}
              threshold={THRESHOLDS.temperature}
              isLoading={isLoading}
              onTimeRangeChange={fetchChartData}
            />
          </div>
        )}

        {activeTab === 'humidity' && (
          <div className="space-y-6 mt-6">
            <SensorCard
              type="humidity"
              value={sensorData.humidity}
              threshold={THRESHOLDS.humidity}
              isAboveThreshold={sensorData.humidity > THRESHOLDS.humidity}
            />
            <SensorChart
              type="humidity"
              data={chartData.humidity}
              threshold={THRESHOLDS.humidity}
              isLoading={isLoading}
              onTimeRangeChange={fetchChartData}
            />
          </div>
        )}

        <ThresholdAlert
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          type={alertConfig.type}
          value={alertConfig.value}
          threshold={THRESHOLDS[alertConfig.type]}
        />
      </main>
    </div>
  );
}

export default App;
