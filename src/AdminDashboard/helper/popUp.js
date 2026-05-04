import toast, { Toaster } from 'react-hot-toast';

export const RenderToast = () => {
return (
    <Toaster
        position="top-right"
        containerStyle={{
            top: '50%',
            right: '3%',
            transform: 'translateY(-50%)', 
        }}
        toastOptions={{
            duration: 1000, 
            style: {
            background: '#0A0A0A',     
            color: '#E0E0E0',          
            border: '1px solid #2A2A2A',
            fontSize: '16px',
            fontFamily: 'monospace',
            },
            success: {
            iconTheme: {
                primary: '#22c55e',
                secondary: '#0A0A0A',
            },
            },
            error: {
            iconTheme: {
                primary: '#ef4444',
                secondary: '#0A0A0A',
            },
            },
        }}
    />)
}