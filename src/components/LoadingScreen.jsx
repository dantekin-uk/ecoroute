import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-950 dark:via-brand-primary-dark/20 dark:to-slate-950 flex items-center justify-center z-[9999]">
      <div className="text-center">
        <motion.img
          src="/pwa-512x512.png"
          alt="EcoRoute"
          className="w-32 h-32 mx-auto mb-6 object-contain"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="w-12 h-12 border-4 border-emerald-200 dark:border-emerald-900 border-t-emerald-600 dark:border-t-emerald-400 rounded-full mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p
          className="mt-4 text-gray-600 dark:text-gray-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Loading your dashboard...
        </motion.p>
      </div>
    </div>
  );
};

export default LoadingScreen;
