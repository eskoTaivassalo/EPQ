import React from 'react';
import Header from '../header/Header';
import Footer from '../footer/Footer';
import './PageContainer.css'; // Import the CSS file for styling

const PageContainer = ({ children }) => {
  return (
    <div className="page-container">
      <Header />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default PageContainer;