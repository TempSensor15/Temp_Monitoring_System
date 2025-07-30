import { motion } from 'framer-motion';
import { FaTemperatureHigh, FaTint } from 'react-icons/fa';

const SensorCard = ({ type, value, threshold, isAboveThreshold }) => {
  const iconProps = {
    temperature: {
      icon: FaTemperatureHigh,
      color: 'from-orange-500/20 to-red-500/20',
      borderColor: isAboveThreshold ? 'border-red-500/50' : 'border-white/10',
      unit: '°C'
    },
    humidity: {
      icon: FaTint,
      color: 'from-blue-500/20 to-cyan-500/20',
      borderColor: isAboveThreshold ? 'border-red-500/50' : 'border-white/10',
      unit: '%'
    }
  }[type];

  const Icon = iconProps.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`backdrop-blur-xl bg-gradient-to-br ${iconProps.color} rounded-2xl p-6
        ${iconProps.borderColor} border transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-8 h-8 text-white/70" />
        {isAboveThreshold && (
          <span className="px-2 py-1 text-xs bg-red-500/20 text-red-500 rounded-full animate-pulse">
            Above Threshold
          </span>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-4xl font-bold text-white">
          {value?.toFixed(1) || '--'}{iconProps.unit}
        </h3>
        <p className="text-sm text-white/60 mt-1">
          Threshold: {threshold}{iconProps.unit}
        </p>
      </div>
    </motion.div>
  );
};

export default SensorCard;
