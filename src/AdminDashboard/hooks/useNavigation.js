'use client'; 
import { useRouter } from 'next/navigation'; 

export const useNavigation = () => { 
    const router = useRouter(); 
    const handleDashboardClick = () => { router.push('/'); }; 

    const handleShieldClick = () => { router.push('/admin'); }; 

    const handlePickaxeClick = () => { router.push('/service'); }; 

    const handleStickManClick = () => { router.push('/account'); }; 

    const handleFileClockClick = () => { router.push('/log'); }; 

    const handlePowerOff = () => { router.push('/login'); }; 
    
    const handleRegister = () => { router.push('/register'); };
        
    const handleRemoveAgent = () => { router.push('/start'); }; 

    return { handleDashboardClick, handleShieldClick, handlePickaxeClick, handleStickManClick, 
             handleFileClockClick, handlePowerOff, handleRegister, handleRemoveAgent, };
}
