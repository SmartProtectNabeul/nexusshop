import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.82,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function PageTransition({ children, skipInitial = false }) {
  const location = useLocation();
  const isCardEntry = location.pathname.startsWith('/product/') && sessionStorage.getItem('productTransition');

  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial={skipInitial || isCardEntry ? false : 'initial'}
      animate="animate"
      exit="exit"
      style={{ flex: 1 }}
    >
      {children}
    </motion.div>
  );
}
