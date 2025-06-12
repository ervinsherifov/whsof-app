import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-2 px-6 mt-auto">
      <div className="flex justify-center items-center">
        <p className="text-sm font-medium">
          © 2024 DHL Sofia Warehouse Management System
        </p>
      </div>
    </footer>
  );
};