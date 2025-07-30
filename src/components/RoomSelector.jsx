import { motion } from 'framer-motion';
import { FaDoorOpen } from 'react-icons/fa';

const RoomSelector = ({ selectedRoom, setSelectedRoom, roomIp }) => {
  return (
    <div className="w-full max-w-md mx-auto my-4">
      <div className="flex items-center justify-between p-4 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-4">
          <FaDoorOpen className="w-6 h-6 text-white/70" />
          <div>
            <h2 className="text-white font-medium">Current Room</h2>
            <p className="text-white/60 text-sm">IP: {roomIp || 'Loading...'}</p>
          </div>
        </div>
        
        <div className="flex items-center bg-black/20 rounded-xl p-1">
          {[1, 2].map((room) => (
            <motion.button
              key={room}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRoom(room)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedRoom === room
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Room {room}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomSelector;
