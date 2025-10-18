import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Doctor = () => {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold">Portal do Profissional</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo(a), {user?.user_metadata?.full_name || user?.email}
        </p>
      </div>
      
      {/* Rest of your component content */}
    </div>
  );
};

export default Doctor;