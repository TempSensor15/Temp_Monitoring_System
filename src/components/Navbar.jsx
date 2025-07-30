import { useState, useEffect } from 'react';
import { FaTemperatureHigh, FaTint, FaHome, FaBell } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Navbar = ({ activeTab, setActiveTab, hasThresholdAlert }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'home', icon: FaHome, label: 'Home' },
    { id: 'temperature', icon: FaTemperatureHigh, label: 'Temperature' },
    { id: 'humidity', icon: FaTint, label: 'Humidity' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
                  ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </motion.button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            {hasThresholdAlert && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="animate-pulse"
              >
                <FaBell className="w-5 h-5 text-red-500" />
              </motion.div>
            )}
            <div className="text-white/70 font-mono">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
