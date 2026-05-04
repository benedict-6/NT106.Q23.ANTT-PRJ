'use client'; 
import { useRouter } from 'next/navigation'; 

export const useNavigation = () => { 
    const router = useRouter(); 
    const handleDashboardClick = () => { router.push('/'); }; 

    const handleShieldClick = () => { router.push('/admin'); }; 

    const handlePickaxeClick = () => { router.push('/service'); }; 

    const handleStickManClick = () => { router.push('/account'); }; 

    const handleFileClockClick = () => { router.push('/log')}; 

    const handlePowerOff = () => { router.push('/login') }; 
    
    const handleRegister = () => { router.push('/register') 
}; 

return { handleDashboardClick, handleShieldClick, handlePickaxeClick, handleStickManClick, handleFileClockClick, handlePowerOff, handleRegister }; };