import React from 'react';
import classNames from 'classnames';

export interface LogoProps {
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className, onClick }) => {
  const iconSize = size * 0.55; // SVG is ~55% of container size

  return (
    <div className={classNames('bg-black shrink-0 relative rd-0.5rem', className)} style={{ width: size, height: size }} onClick={onClick}>
      <svg className='absolute inset-0 m-auto' style={{ width: iconSize, height: iconSize }} viewBox='0 0 80 80' fill='none'>
        <path d='M40 20 Q38 22 25 40 Q23 42 26 42 L30 42 Q32 40 40 30 Q48 40 50 42 L54 42 Q57 42 55 40 Q42 22 40 20' fill='white' />
        <circle cx='40' cy='46' r='3' fill='white' />
        <path d='M18 50 Q40 70 62 50' stroke='white' strokeWidth='3.5' fill='none' strokeLinecap='round' />
      </svg>
    </div>
  );
};
