import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`rounded-xl border bg-white text-gray-950 shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardTitle: React.FC<CardProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <h3
      className={`font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

const CardDescription: React.FC<CardProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <p className={`text-sm text-gray-500 ${className}`} {...props}>
      {children}
    </p>
  );
};

const CardContent: React.FC<CardProps> = ({
  className = "",
  children,
  ...props
}) => {
  return (
    <div className={`p-6 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
