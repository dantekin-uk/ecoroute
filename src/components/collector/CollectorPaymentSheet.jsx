import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

const CollectorPaymentSheet = ({
  selectedHouse,
  isSubmitting,
  showIssueMenu,
  onClose,
  onLogPayment,
  onReportIssue,
  onToggleIssueMenu,
  variant = 'mobile',
}) => {
  const isDesktop = variant === 'desktop';

  const sheetClass = isDesktop
    ? 'fixed bottom-0 left-0 right-0 md:left-auto md:right-8 md:bottom-8 md:w-[420px] md:rounded-2xl z-50'
    : 'absolute bottom-0 left-0 right-0 z-50';

  const innerClass = isDesktop
    ? 'bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700'
    : 'bg-[#131B2C] rounded-t-3xl p-6 shadow-2xl border-t border-white/10';

  const titleClass = isDesktop
    ? 'text-2xl font-black text-gray-900 dark:text-white'
    : 'text-3xl font-black text-white';

  const owesClass = isDesktop
    ? 'text-xl text-rose-600 dark:text-rose-400 font-bold'
    : 'text-xl text-rose-400 font-bold';

  return (
    <AnimatePresence>
      {selectedHouse && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`${isDesktop ? 'fixed' : 'absolute'} inset-0 bg-black/60 backdrop-blur-sm z-40`}
          />
          <motion.div
            initial={{ y: isDesktop ? 20 : '100%', opacity: isDesktop ? 0 : 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: isDesktop ? 20 : '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={sheetClass}
          >
            <div className={innerClass}>
              {!isDesktop && (
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
              )}

              <div className="mb-6 text-center">
                <h2 className={`${titleClass} mb-2`}>Door {selectedHouse.id}</h2>
                {selectedHouse.name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{selectedHouse.name}</p>
                )}
                <p className={owesClass}>Owes: Ksh {Math.abs(selectedHouse.balance).toLocaleString()}</p>
              </div>

              {!showIssueMenu ? (
                <div className="space-y-3">
                  {selectedHouse?.isProcessedToday ? (
                    <div className="text-center py-6">
                      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        This house has already been processed today.
                      </p>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onLogPayment('cash')}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-base py-4 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Log Cash Payment
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onLogPayment('mpesa')}
                        className="w-full border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-bold text-base py-4 rounded-xl transition-colors disabled:opacity-50"
                      >
                        Log M-PESA
                      </button>
                      <button
                        type="button"
                        onClick={onToggleIssueMenu}
                        className="w-full flex items-center justify-center gap-2 bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold py-4 rounded-xl"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        Report Issue
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-800 dark:hover:text-white font-semibold py-3"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedHouse?.isProcessedToday ? (
                    <div className="text-center py-6">
                      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        This house has already been processed today.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-rose-500 font-bold text-center mb-2 uppercase tracking-wider text-xs">
                        Select issue type
                      </h3>
                      {['Locked Gate', 'Tenant Refused', 'Vacant'].map((label) => (
                        <button
                          key={label}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => onReportIssue(label === 'Locked Gate' ? 'Locked Gate' : label === 'Tenant Refused' ? 'Tenant Refused' : 'Vacant')}
                          className="w-full bg-gray-100 dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 font-semibold py-3 rounded-xl"
                        >
                          {label === 'Locked Gate' ? 'Locked Gate / Inaccessible' : label === 'Tenant Refused' ? 'Tenant Refused' : 'House is Vacant'}
                        </button>
                      ))}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={onToggleIssueMenu}
                    className="w-full text-gray-500 font-semibold py-3"
                  >
                    Back to payments
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CollectorPaymentSheet;
