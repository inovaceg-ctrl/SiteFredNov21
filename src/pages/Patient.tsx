import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, FileText, LogOut, Video, LayoutGrid, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OnlineConsultationTab } from "@/components/OnlineConsultationTab";

const Patient = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [patientProfile, setPatientProfile] = useState<any>(null); // Novo estado para o perfil do paciente
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          fetchPatientProfile(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchPatientProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPatientProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setPatientProfile(data);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchDoctors();
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    
    const { data: appointmentsData } = await (supabase as any)
      .from('appointments')
      .select('*')
      .eq('patient_id', user.id)
      .order('start_time', { ascending: true });
    
    if (appointmentsData && appointmentsData.length > 0) {
      const doctorIds = [...new Set(appointmentsData.map((a: any) => a.doctor_id))];
      const { data: doctorProfiles } = await (supabase as any)
        .rpc('get_doctor_profiles_by_ids', { _ids: doctorIds });
      const appointmentsWithDoctors = appointmentsData.map((apt: any) => ({
        ...apt,
        doctor_profile: doctorProfiles?.find((p: any) => p.id === apt.doctor_id)
      }));
      setAppointments(appointmentsWithDoctors);
    } else {
      setAppointments([]);
    }
  };

  const fetchDoctors = async () => {
    const { data: doctorsData } = await (supabase as any)
      .rpc('get_doctors_public');
    setDoctors(doctorsData || []);
  };

  const fetchAvailableSlots = async (doctorId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { data } = await (supabase as any)
      .from('availability_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_available', true)
      .gte('start_time', tomorrow.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true })
      .limit(10);
    
    setAvailableSlots(data || []);
  };

  const bookAppointment = async (slotId: string, startTime: string, endTime: string) => {
    if (!user || !selectedDoctor) return;

    const { error } = await (supabase as any)
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: selectedDoctor,
        slot_id: slotId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending'
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível agendar a consulta",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Consulta agendada com sucesso!",
      });
      fetchAppointments();
      setSelectedDoctor(null);
      setAvailableSlots([]);
      setActiveTab("appointments");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Portal do Paciente</h1>
            <p className="text-muted-foreground mt-2">
              {/* Agora usamos o nome do perfil do paciente */}
              Bem-vindo(a), {patientProfile?.full_name || user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-col gap-2 w-full md:flex-row md:flex-nowrap md:justify-start">
            <TabsTrigger value="overview" className="w-full px-3 py-2 text-sm whitespace-nowrap md:px-6 md:py-3 md:text-base">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Início
            </TabsTrigger>
            <TabsTrigger value="schedule" className="w-full px-3 py-2 text-sm whitespace-nowrap md:px-6 md:py-3 md:text-base">
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </TabsTrigger>
            <TabsTrigger value="appointments" className="w-full px-3 py-2 text-sm whitespace-nowrap md:px-6 md:py-3 md:text-base">
              <Clock className="h-4 w-4 mr-2" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="online-consultation" className="w-full px-3 py-2 text-sm whitespace-nowrap md:px-6 md:py-3 md:text-base">
              <MessageSquare className="h-4 w-4 mr-2" />
              Consulta Online
            </TabsTrigger>
            <TabsTrigger value="documents" className="w-full px-3 py-2 text-sm whitespace-nowrap md:px-6 md:py-3 md:text-base">
              <FileText className="h-4 w-4 mr-2" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("schedule")}>
                <CardHeader>
                  <Calendar className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Agendar Consulta</CardTitle>
                  <CardDescription>
                    Veja os horários disponíveis e agende sua consulta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Agendar Agora</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("appointments")}>
                <CardHeader>
                  <Clock className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Minhas Consultas</CardTitle>
                  <CardDescription>
                    Veja suas consultas agendadas e histórico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Ver Consultas</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("online-consultation")}>
                <CardHeader>
                  <Video className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Consulta Online</CardTitle>
                  <CardDescription>
                    Inicie uma consulta por vídeo chamada ou chat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Iniciar Consulta</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("documents")}>
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Meus Documentos</CardTitle>
                  <CardDescription>
                    Upload e visualização de exames e documentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Ver Documentos</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Prontuário</CardTitle>
                  <CardDescription>
                    Acesse seu histórico médico e prontuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Ver Prontuário</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selecione um Médico</CardTitle>
                  <CardDescription>Escolha o médico para ver os horários disponíveis</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {doctors.map((doctor) => (
                    <Button
                      key={doctor.id}
                      variant={selectedDoctor === doctor.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedDoctor(doctor.id);
                        fetchAvailableSlots(doctor.id);
                      }}
                    >
                      {doctor.full_name}
                    </Button>
                  ))}
                  {doctors.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum médico disponível no momento
                    </p>
                  )}
                </CardContent>
              </Card>

              {selectedDoctor && (
                <Card>
                  <CardHeader>
                    <CardTitle>Horários Disponíveis</CardTitle>
                    <CardDescription>Selecione um horário para agendar</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {availableSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(slot.start_time), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(slot.start_time), "HH:mm")} - {format(new Date(slot.end_time), "HH:mm")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => bookAppointment(slot.id, slot.start_time, slot.end_time)}
                        >
                          Agendar
                        </Button>
                      </div>
                    ))}
                    {availableSlots.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum horário disponível
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Minhas Consultas</CardTitle>
                <CardDescription>Veja suas consultas agendadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        Dr(a). {apt.doctor_profile?.full_name || 'Médico'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.start_time), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-sm">
                        Status: <span className="font-medium">{apt.status === 'pending' ? 'Pendente' : apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'completed' ? 'Concluída' : 'Cancelada'}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma consulta agendada
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="online-consultation">
            {user && <OnlineConsultationTab currentUserId={user.id} />}
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Meus Documentos</CardTitle>
                <CardDescription>Exames e documentos médicos</CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Funcionalidade de documentos em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Patient;