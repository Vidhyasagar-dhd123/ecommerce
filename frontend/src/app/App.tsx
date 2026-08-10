import '@styles/global.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { AppRoutes } from '@/app/routes/AppRoutes';

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
