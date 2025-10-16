import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Clock, FileText, LogOut, Users, Video, BarChart3, Loader2, Edit } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditPatientDialog } from "@/components/EditPatientDialog";
import { formatWhatsApp } from "@/lib/format-phone";

const Doctor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [slots, setSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && activeTab === "schedule" && selectedDate) {
      fetchSlots();
    }
  }, [user, selectedDate, activeTab]);

  useEffect(() => {
    if (user && activeTab === "appointments") {
      fetchAppointments();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user && activeTab === "patients") {
      fetchPatients();
    }
  }, [user, activeTab]);

  const fetchSlots = async () => {
    if (!user || !selectedDate) return;
    
    setLoadingSlots(true);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await (supabase as any)
      .from('availability_slots')
      .select('*')
      .eq('doctor_id', user.id)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (!error) {
      setSlots(data || []);
    }
    setLoadingSlots(false);
  };

  const createDefaultSlots = async () => {
    if (!user || !selectedDate) return;
    
    setLoadingSlots(true);
    const newSlots = [];
    const date = new Date(selectedDate);
    
    for (let hour = 8; hour < 18; hour++) {
      const startTime = new Date(date);
      startTime.setHours(hour, 0, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(hour + 1, 0, 0, 0);
      
      newSlots.push({
        doctor_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_available: true,
      });
    }

    const { error } = await (supabase as any)
      .from('availability_slots')
      .insert(newSlots);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar os horários",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Horários criados com sucesso!",
      });
      fetchSlots();
    }
    setLoadingSlots(false);
  };

  const toggleSlotAvailability = async (slotId: string, currentStatus: boolean) => {
    const { error } = await (supabase as any)
      .from('availability_slots')
      .update({ is_available: !currentStatus })
      .eq('id', slotId);

    if (!error) {
      fetchSlots();
    }
  };

  const fetchAppointments = async () => {
    const { data: appts } = await (supabase as any)
      .rpc('get_appointments_for_doctor');

    if (appts && appts.length > 0) {
      const withPatients = appts.map((a: any) => ({
        ...a,
        patient_profile: { id: a.patient_id, full_name: a.patient_full_name }
      }));
      setAppointments(withPatients);
    } else {
      setAppointments([]);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Status atualizado!",
      });
      fetchAppointments();
    }
  };

  const fetchPatients = async () => {
    if (!user) return;

    console.log('Fetching patients...');
    const { data: patientsData, error } = await (supabase as any)
      .rpc('get_patients_for_doctor');

    if (error) {
      console.error('Error fetching patients:', error);
    } else {
      console.log('Patients fetched:', patientsData);
      setPatients(patientsData || []);
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
            <h1 className="text-3xl font-bold">Portal do Médico</h1>
            <p className="text-muted-foreground mt-2">
              Bem-vindo(a), Dr(a). {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Clock className="h-4 w-4 mr-2" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="patients">
              <Users className="h-4 w-4 mr-2" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="records">
              <FileText className="h-4 w-4 mr-2" />
              Prontuários
            </TabsTrigger>
            <TabsTrigger value="telemedicine">
              <Video className="h-4 w-4 mr-2" />
              Telemedicina
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("schedule")}>
                <CardHeader>
                  <CalendarIcon className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Gerenciar Agenda</CardTitle>
                  <CardDescription>
                    Configure seus horários disponíveis para consultas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Configurar Horários</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("appointments")}>
                <CardHeader>
                  <Clock className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Consultas Agendadas</CardTitle>
                  <CardDescription>
                    Veja e gerencie suas consultas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Ver Agenda</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("patients")}>
                <CardHeader>
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Meus Pacientes</CardTitle>
                  <CardDescription>
                    Acesse a lista e histórico de seus pacientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Ver Pacientes</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("telemedicine")}>
                <CardHeader>
                  <Video className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Telemedicina</CardTitle>
                  <CardDescription>
                    Inicie consultas por vídeo chamada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Iniciar Consulta</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab("records")}>
                <CardHeader>
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Prontuários</CardTitle>
                  <CardDescription>
                    Acesse e edite prontuários dos pacientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Ver Prontuários</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <BarChart3 className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Relatórios</CardTitle>
                  <CardDescription>
                    Visualize estatísticas e relatórios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">Em Breve</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Selecione uma Data</CardTitle>
                  <CardDescription>Escolha o dia para gerenciar sua agenda</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Horários para {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : ""}
                  </CardTitle>
                  <CardDescription>
                    {slots.length > 0 ? "Clique para marcar como indisponível" : "Nenhum horário cadastrado"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingSlots ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="space-y-2">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <span className="font-medium">
                            {format(new Date(slot.start_time), "HH:mm")} - {format(new Date(slot.end_time), "HH:mm")}
                          </span>
                          <Button
                            variant={slot.is_available ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleSlotAvailability(slot.id, slot.is_available)}
                          >
                            {slot.is_available ? "Disponível" : "Indisponível"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        Nenhum horário cadastrado para esta data
                      </p>
                      <Button onClick={createDefaultSlots} disabled={loadingSlots}>
                        Criar Horários Padrão (8h-18h)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Consultas Agendadas</CardTitle>
                <CardDescription>Gerencie suas consultas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma consulta agendada
                  </p>
                ) : (
                  appointments.map((apt) => (
                    <div key={apt.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">
                            {apt.patient_profile?.full_name || 'Paciente'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(apt.start_time), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={
                          apt.status === 'confirmed' ? 'default' :
                          apt.status === 'pending' ? 'secondary' :
                          apt.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {apt.status === 'pending' ? 'Pendente' : 
                           apt.status === 'confirmed' ? 'Confirmada' : 
                           apt.status === 'completed' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                      </div>
                      {apt.notes && (
                        <p className="text-sm mb-3">
                          <span className="font-medium">Observações:</span> {apt.notes}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {apt.status === 'pending' && (
                          <Button size="sm" onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}>
                            Confirmar
                          </Button>
                        )}
                        {apt.status === 'confirmed' && (
                          <Button size="sm" onClick={() => updateAppointmentStatus(apt.id, 'completed')}>
                            Concluir
                          </Button>
                        )}
                        {(apt.status === 'pending' || apt.status === 'confirmed') && (
                          <Button size="sm" variant="outline" onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle>Meus Pacientes</CardTitle>
                <CardDescription>Lista completa de pacientes com todos os dados</CardDescription>
              </CardHeader>
              <CardContent>
                {patients.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum paciente encontrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {patients.map((patient) => (
                      <div key={patient.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-lg mb-3">{patient.full_name}</p>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground min-w-[140px]">Data de Cadastro:</span>
                                <span>{patient.created_at ? format(new Date(patient.created_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}</span>
                              </div>
                              
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground min-w-[140px]">WhatsApp:</span>
                                <span>{patient.whatsapp ? formatWhatsApp(patient.whatsapp) : '-'}</span>
                              </div>
                              
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground min-w-[140px]">Endereço:</span>
                                <span>
                                  {(patient.street || patient.city || patient.state) ? (
                                    <>
                                      {[
                                        patient.street && `${patient.street}${patient.street_number ? ', ' + patient.street_number : ''}`,
                                        patient.neighborhood,
                                        patient.city,
                                        patient.state
                                      ].filter(Boolean).join(' - ')}
                                      {patient.zip_code && ` - CEP: ${patient.zip_code}`}
                                    </>
                                  ) : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setEditDialogOpen(true);
                            }}
                            className="ml-4"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>Prontuários Médicos</CardTitle>
                <CardDescription>Histórico de atendimentos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telemedicine">
            <Card>
              <CardHeader>
                <CardTitle>Telemedicina</CardTitle>
                <CardDescription>
                  Funcionalidade de videochamada em desenvolvimento
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 text-center">
                <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Em breve você poderá realizar consultas por vídeo chamada
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
      
      {selectedPatient && (
        <EditPatientDialog
          patient={selectedPatient}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onPatientUpdated={async () => {
            console.log('onPatientUpdated called');
            await fetchPatients();
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
};

export default Doctor;
