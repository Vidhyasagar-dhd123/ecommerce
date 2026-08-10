import {useAuth} from '@/features/auth/hooks/useAuth';


export const Navbar = () => {
    const { isAuthenticated, logout } = useAuth();

    const handleLogout = async () => {
        try {
            if(isAuthenticated)
                await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

  return (
    <nav className="p-4 bg-gray-800">
        <div className="flex container justify-between items-center mx-auto">
            <div className="text-xl font-bold text-white">My App</div>
            <div>
                <a href="/dashboard" className="px-3 text-gray-300 hover:text-white">Dashboard</a>
                <a href="/profile" className="px-3 text-gray-300 hover:text-white">Profile</a>
                <a href="/settings" className="px-3 text-gray-300 hover:text-white">Settings</a>
            </div>
            <div>
                {isAuthenticated ? (
                    <button onClick={handleLogout} className="px-3 text-gray-300 hover:text-white">Logout</button>
                ) : (
                    <a href="/login" className="px-3 text-gray-300 hover:text-white">Login</a>
                )}
            </div>
        </div>
    </nav>
  );
}