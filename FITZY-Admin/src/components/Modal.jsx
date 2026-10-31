import React, { useEffect } from 'react';

export default function Modal({ title, children, onClose }) {
  useEffect(() => { const key = event => event.key === 'Escape' && onClose(); window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-head"><div><span className="eyebrow">FITZY ADMIN</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" aria-label="Đóng" onClick={onClose}>×</button></header>{children}</section></div>;
}
