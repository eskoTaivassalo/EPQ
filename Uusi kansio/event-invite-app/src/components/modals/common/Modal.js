import React, { useEffect, useRef } from 'react';
import './Modals.css';

const Modal = ({ isOpen, onClose, children, className = '' }) => {
  const modalRef = useRef(null);

  // Suljetaan modal Esc-näppäimellä
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    
    // Estetään sivun scrollaus kun modal on auki
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Suljetaan modal kun klikataan taustan overlay-aluetta
  const handleBackdropClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className={`modal-container ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default Modal;