import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 p-6 md:p-8 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default Card;