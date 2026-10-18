import React, { useState } from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmWord, // if required to type e.g. store name
  confirmLabel = 'Confirm Action',
  isDestructive = false,
}) {
  const [typedInput, setTypedInput] = useState('');

  const canConfirm = !confirmWord || typedInput.trim() === confirmWord.trim();

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTypedInput('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={460}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        {isDestructive && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--risk-high-bg)',
              color: 'var(--risk-high-tx)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>
        )}
        <div style={{ flex: 1, fontSize: 13, color: 'var(--txm)', lineHeight: 1.5 }}>
          {message}
        </div>
      </div>

      {confirmWord && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, marginBottom: 4 }}>
            Please type <strong style={{ color: 'var(--tx)' }}>{confirmWord}</strong> to confirm:
          </label>
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder={confirmWord}
            autoFocus
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button
          className={isDestructive ? 'btn-primary' : 'btn-dark'}
          style={isDestructive ? { backgroundColor: '#dc2626', color: 'white' } : {}}
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
