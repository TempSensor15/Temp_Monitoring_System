import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { FaSpinner } from 'react-icons/fa';

const timeRanges = [
  { id: '1h', label: '1 Hour' },
  { id: '12h', label: '12 Hours' },
  { id: '24h', label: '24 Hours' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
];

const SensorChart = ({ type, data, threshold, isLoading, onTimeRangeChange }) => {
  const [activeRange, setActiveRange] = useState('1h');

  const handleRangeChange = (range) => {
    setActiveRange(range);
    onTimeRangeChange(range);
  };

  const chartData = {
    labels: data?.timestamps || [],
    datasets: [
      {
        label: type === 'temperature' ? 'Temperature (°C)' : 'Humidity (%)',
        data: data?.values || [],
        borderColor: type === 'temperature' ? 'rgba(255, 99, 132, 1)' : 'rgba(53, 162, 235, 1)',
        backgroundColor: type === 'temperature' ? 'rgba(255, 99, 132, 0.2)' : 'rgba(53, 162, 235, 0.2)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: (context) => {
          const value = data?.values[context.dataIndex];
          return value > threshold ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
        },
      },
      {
        label: 'Threshold',
        data: Array(data?.timestamps?.length).fill(threshold),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
    ],
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
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 25, 40, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 14, weight: 'normal' },
        bodyFont: { size: 13 },
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 10,
        },
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 10,
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div className="w-full backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6">
      <div className="flex flex-wrap gap-2 mb-6">
        {timeRanges.map(({ id, label }) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleRangeChange(id)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeRange === id
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div className="relative h-[400px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <FaSpinner className="w-8 h-8 text-white/70 animate-spin" />
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};

export default SensorChart;
