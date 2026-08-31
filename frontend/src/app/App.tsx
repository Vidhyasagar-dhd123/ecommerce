import '@styles/global.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { queryClient } from '@lib/queryClient';
import { AuthProvider } from '@app/providers/AuthProvider';
import { AppRoutes } from '@app/routes/AppRoutes';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppRoutes />
          {/* Global toast notifications — positioned top-right */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { fontSize: '0.875rem' },
            }}
          />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
