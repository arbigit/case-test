import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const NotificationTypes = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info'
};

const NotificationStyles = {
    [NotificationTypes.SUCCESS]: {
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-800',
        icon: CheckCircle
    },
    [NotificationTypes.ERROR]: {
        bg: 'bg-red-100',
        border: 'border-red-500',
        text: 'text-red-800',
        icon: AlertCircle
    },
    [NotificationTypes.INFO]: {
        bg: 'bg-blue-100',
        border: 'border-blue-500',
        text: 'text-blue-800',
        icon: Info
    }
};

export const Notification = ({
    message,
    type = NotificationTypes.INFO,
    onClose,
    navigateTo = null,
    autoClose = true
}) => {
    const navigate = useNavigate();
    const style = NotificationStyles[type];

    React.useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [autoClose, onClose]);

    const handleClick = () => {
        if (navigateTo) {
            navigate(navigateTo);
        }
        onClose();
    };

    return (
        <div
            className={`fixed top-4 right-4 flex items-center p-4 mb-4 rounded-lg border ${style.bg} ${style.border} cursor-pointer transform transition-transform duration-200 hover:scale-105 z-50`}
            role="alert"
            onClick={handleClick}
        >
            <style.icon className={`w-5 h-5 ${style.text} mr-2`} />
            <div className={`ml-3 text-sm font-medium ${style.text}`}>
                {message}
            </div>
            <button
                type="button"
                className={`ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-gray-400 p-1.5 inline-flex h-8 w-8 ${style.bg} ${style.text} hover:bg-opacity-75`}
                aria-label="Close"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
}; 