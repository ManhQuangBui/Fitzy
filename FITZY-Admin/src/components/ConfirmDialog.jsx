import React from 'react';
import Modal from './Modal';
export default function ConfirmDialog({ title = 'Xác nhận thao tác', message, onCancel, onConfirm, busy }) { return <Modal title={title} onClose={onCancel}><p className="dialog-copy">{message}</p><div className="form-actions"><button className="button secondary" onClick={onCancel}>Quay lại</button><button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button></div></Modal>; }
