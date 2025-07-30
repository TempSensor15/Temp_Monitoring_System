import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle } from 'react-icons/fa';

const ThresholdAlert = ({ isOpen, onClose, type, value, threshold }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 backdrop-blur-sm bg-black/50"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl p-6 max-w-md w-full"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-white">Threshold Alert</h3>
              <p className="mt-2 text-white/70">
                The {type} value ({value?.toFixed(1)}) has exceeded the threshold of {threshold}.
                Please check the environment conditions.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Acknowledge
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ThresholdAlert;
