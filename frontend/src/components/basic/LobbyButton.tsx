import React, { ReactNode } from "react";
import cx from "classnames";

interface Props {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const LobbyButton: React.FC<Props> = ({
  children,
  onClick,
  className,
}) => {
  // bg-gray-300
  const classes = cx(
    className,
    "cursor-pointer rounded-lg bg-gray-600-30 hover:bg-red-600-30 h-full w-full",
    "flex items-center justify-center text-white no-underline select-none"
  );
  return (
    <button
      className={classes}
      onClick={onClick}
      type={"button"}
    >
      {children}
    </button>
  );
};
