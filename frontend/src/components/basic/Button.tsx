import React, { ReactNode } from "react";
import cx from "classnames";

interface Props {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  isPrimary?: boolean;
  isSubmit?: boolean;
  isCancel?: boolean;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<Props> = ({
  children,
  onClick,
  className,
  isPrimary,
  isSubmit,
  isCancel,
  disabled,
}) => {
  // bg-gray-300
  const classes = cx(
    className,
    "px-2 py-1 rounded w-full",
    { "bg-gray-300": !isPrimary },
    { "bg-blue-800 text-gray-100 shadow-lg": isPrimary && !isSubmit },
    { "bg-green-700 hover:bg-green-600 text-gray-100 shadow-lg": isSubmit && !disabled },
    { "bg-gray-600 text-gray-400 cursor-not-allowed": disabled },
    { "bg-red-800 text-white": isCancel }
  );
  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      type={isSubmit ? "submit" : "button"}
    >
      {children}
    </button>
  );
};
export default Button;
