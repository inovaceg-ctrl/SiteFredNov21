import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar, Clock, Users, FileText, Video, MessageSquare, Settings, LogOut, User, Bell, ChevronRight, Plus, Search, Filter, MoreHorizontal, Phone, Mail, MapPin, Star, TrendingUp, Activity, Heart, Brain, Eye, Tooth, Baby } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  video_room_id?: string;
}

interface Patient {
  id: string;
  full_name: string;
  email: string;
  whatsapp?: string;
  date_of_birth?: string;
  state?: string;
  city?: string;
  street?: string;
  street_number?: string;
  neighborhood?: string;
  zip_code?: string;
  created_at: string;
}

interface DoctorNote {
  id: string;
  doctor_id: string;
  patient_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
}

const Doctor = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorNotes, setDoctorNotes] = useState<DoctorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch appointments using the function
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .rpc('get_appointments_for_doctor');

        if (appointmentsError) throw appointmentsError;
        setAppointments(appointmentsData || []);

        // Fetch patients using the function
        const { data: patientsData, error: patientsError } = await supabase
          .rpc('get_patients_for_doctor');

        if (patientsError) throw patientsError;
        setPatients(patientsData || []);

        // Fetch doctor notes
        const { data: notesData, error: notesError } = await supabase
          .from('doctor_notes')
          .select(`
            *,
            profiles!doctor_notes_patient_id_fkey (
              full_name
            )
          `)
          .eq('doctor_id', user.id);

        if (notesError) throw notesError;
        
        const notesWithPatientNames = notesData?.map(note => ({
          ...note,
          patient_name: note.profiles?.full_name
        })) || [];
        
        setDoctorNotes(notesWithPatientNames);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast.error('Erro ao sair');
    }
  };

  const handleStartVideoCall = async (appointment: Appointment) => {
    try {
      if (!appointment.video_room_id) {
        toast.error('Sala de vídeo não disponível');
        return;
      }
      navigate(`/video/${appointment.video_room_id}`);
    } catch (error) {
      toast.error('Erro ao iniciar chamada de vídeo');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const todayAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.start_time);
    return aptDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(apt => {
    return new Date(apt.start_time) > new Date() && apt.status === 'scheduled';
  });

  const getSpecialtyIcon = (specialty?: string) => {
    switch (specialty?.toLowerCase()) {
      case 'cardiologista': return <Heart className="h-5 w-5" />;
      case 'neurologista': return <Brain className="h-5 w-5" />;
      case 'oftalmologista': return <Eye className="h-5 w-5" />;
      case 'dentista': return <Tooth className="h-5 w-5" />;
      case 'pediatra': return <Baby className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getSpecialtyColor = (specialty?: string) => {
    switch (specialty?.toLowerCase()) {
      case 'cardiologista': return 'text-red-600 bg-red-50';
      case 'neurologista': return 'text-purple-600 bg-purple-50';
      case 'oftalmologista': return 'text-blue-600 bg-blue-50';
      case 'dentista': return 'text-green-600 bg-green-50';
      case 'pediatra': return 'text-pink-600 bg-pink-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">MediConnect</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <h1 className="text-3xl font-bold">Portal do Profissional</h1>
            <p className="text-blue-100 mt-2">
              Bem-vindo(a), {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consultas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Próximas Consultas</p>
                  <p className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Pacientes</p>
                  <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Anotações</p>
                  <p className="text-2xl font-bold text-gray-900">{doctorNotes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="appointments">Consultas</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="notes">Anotações</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Consultas de Hoje
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {todayAppointments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma consulta para hoje</p>
                  ) : (
                    <div className="space-y-3">
                      {todayAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{appointment.patient_name}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(appointment.start_time), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {appointment.video_room_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartVideoCall(appointment)}
                              >
                                <Video className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Patients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Pacientes Recentes
                  </CardTitle>
                  <CardDescription>Últimos pacientes atendidos</CardDescription>
                </CardHeader>
                <CardContent>
                  {patients.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum paciente encontrado</p>
                  ) : (
                    <div className="space-y-3">
                      {patients.slice(0, 5).map((patient) => (
                        <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{patient.full_name}</p>
                              <p className="text-sm text-gray-500">{patient.email}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Todas as Consultas
                    </CardTitle>
                    <CardDescription>Gerencie todas as suas consultas</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="scheduled">Agendadas</option>
                      <option value="completed">Concluídas</option>
                      <option value="cancelled">Canceladas</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAppointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma consulta encontrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Paciente</th>
                          <th className="text-left py-3 px-4">Data</th>
                          <th className="text-left py-3 px-4">Horário</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments.map((appointment) => (
                          <tr key={appointment.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{appointment.patient_name}</p>
                                  <p className="text-sm text-gray-500">{appointment.patient_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {format(new Date(appointment.start_time), 'dd/MM/yyyy')}
                            </td>
                            <td className="py-3 px-4">
                              {format(new Date(appointment.start_time), 'HH:mm')}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {appointment.status === 'completed' ? 'Concluída' :
                                 appointment.status === 'cancelled' ? 'Cancelada' :
                                 'Agendada'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                {appointment.video_room_id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStartVideoCall(appointment)}
                                  >
                                    <Video className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Meus Pacientes
                    </CardTitle>
                    <CardDescription>Lista completa de pacientes</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar paciente..."
                      className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum paciente encontrado</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patients
                      .filter(patient => 
                        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        patient.email.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((patient) => (
                      <Card key={patient.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{patient.full_name}</h3>
                                <p className="text-sm text-gray-500">{patient.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            {patient.whatsapp && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                {patient.whatsapp}
                              </div>
                            )}
                            {patient.city && patient.state && (
                              <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-2" />
                                {patient.city}, {patient.state}
                              </div>
                            )}
                            {patient.date_of_birth && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                {format(new Date(patient.date_of_birth), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex space-x-2">
                            <Button size="sm" variant="outline" className="flex-1">
                              <FileText className="h-4 w-4 mr-2" />
                              Prontuário
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Mensagem
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Minhas Anotações
                    </CardTitle>
                    <CardDescription>Anotações sobre pacientes</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Anotação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {doctorNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma anotação encontrada</p>
                ) : (
                  <div className="space-y-4">
                    {doctorNotes.map((note) => (
                      <Card key={note.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{note.patient_name}</span>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                </span>
                              </div>
                              <p className="text-gray-700 whitespace-pre-wrap">{note.notes}</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Doctor;