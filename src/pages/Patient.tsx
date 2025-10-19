import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, FileText, LogOut, Video, LayoutGrid, MessageSquare, CheckCircle, Hourglass, XCircle } from "lucide-react"; // Added icons
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OnlineConsultationTab } from "@/components/OnlineConsultationTab";
import { Database } from "@/integrations/supabase/types"; // Import Database type

const Patient = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const { toast } = useToast();

  const fetchPatientProfile = useCallback(async (userId: string) => {
    console.log("Patient.tsx: Fetching patient profile for userId:", userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Patient.tsx: Error fetching patient profile:", error);
      toast({
        title: "Erro ao carregar perfil do paciente",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      console.log("Patient.tsx: Patient profile fetched:", data);
      setPatientProfile(data);
    }
  }, [toast]);

  const fetchAppointments = useCallback(async () => {
    if (!user) {
      console.log("Patient.tsx: Skipping fetchAppointments, user is missing.");
      return;
    }
    
    console.log("Patient.tsx: Fetching appointments for patient:", user.id);
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user.id)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error("Patient.tsx: Error fetching patient appointments:", error);
      toast({
        title: "Erro ao carregar consultas",
        description: error.message,
        variant: "destructive",
      });
    } else if (appointmentsData && appointmentsData.length > 0) {
      const doctorIds = [...new Set(appointmentsData.map((a: any) => a.doctor_id))];
      console.log("Patient.tsx: Fetching doctor profiles for IDs:", doctorIds);
      const { data: doctorProfiles, error: doctorError } = await supabase
        .rpc('get_doctor_profiles_by_ids', { _ids: doctorIds });

      if (doctorError) {
        console.error("Patient.tsx: Error fetching doctor profiles for appointments:", doctorError);
        toast({
          title: "Erro ao carregar perfis de médicos",
          description: doctorError.message,
          variant: "destructive",
        });
      }
      const appointmentsWithDoctors = appointmentsData.map((apt: any) => ({
        ...apt,
        doctor_profile: doctorProfiles?.find((p: any) => p.id === apt.doctor_id)
      }));
      console.log("Patient.tsx: Appointments with doctor profiles:", appointmentsWithDoctors);
      setAppointments(appointmentsWithDoctors);
    } else {
      console.log("Patient.tsx: No appointments found for patient.");
      setAppointments([]);
    }
  }, [user, toast]);

  const fetchDoctors = useCallback(async () => {
    console.log("Patient.tsx: Attempting to fetch all public doctors using RPC 'get_doctors_public'.");
    const { data: doctorsData, error } = await supabase
      .rpc('get_doctors_public');
    
    if (error) {
      console.error("Patient.tsx: Error fetching doctors:", error);
      toast({
        title: "Erro ao carregar médicos",
        description: `Não foi possível buscar os médicos. Detalhes: ${error.message}`,
        variant: "destructive",
      });
      setDoctors([]);
    } else if (doctorsData && doctorsData.length > 0) {
      console.log("Patient.tsx: Doctors fetched successfully:", doctorsData);
      setDoctors(doctorsData);
    } else {
      console.log("Patient.tsx: No public doctors found or RPC returned empty data.");
      setDoctors([]);
      toast({
        title: "Nenhum médico disponível",
        description: "Não há médicos cadastrados ou disponíveis para agendamento no momento. Por favor, verifique o backend do Supabase (tabela 'profiles' e função RPC 'get_doctors_public').",
        variant: "default",
      });
    }
  }, [toast]);

  // Centralized auth state management for this component
  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: Session | null) => {
      console.log("Patient.tsx: Auth state change event:", event, "session:", session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        console.log("Patient.tsx: SIGNED_OUT event detected, navigating to /auth.");
        setPatientProfile(null);
        setAppointments([]); // Clear appointments on logout
        setDoctors([]); // Clear doctors on logout
        setSelectedDoctor(null); // Clear selected doctor
        setAvailableSlots([]); // Clear available slots
        navigate("/auth");
      } else if (session?.user) {
        await fetchPatientProfile(session.user.id);
        fetchDoctors();
        fetchAppointments();
      } else {
        // This else block handles initial load where no session is found, or other non-SIGNED_OUT events with no session
        console.log("Patient.tsx: No session found on initial load or other non-SIGNED_OUT event, navigating to /auth.");
        navigate("/auth");
      }
    };

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Patient.tsx: Initial getSession result:", session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        await fetchPatientProfile(session.user.id);
        fetchDoctors(); // Ensure doctors are loaded
        fetchAppointments(); // Ensure appointments are loaded
      } else {
        console.log("Patient.tsx: No session on initial load, navigating to /auth.");
        navigate("/auth"); // Redirect if no session on initial load
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      console.log("Patient.tsx: Unsubscribing from auth state changes");
      subscription.unsubscribe();
    };
  }, [navigate, fetchPatientProfile, fetchDoctors, fetchAppointments]);

  const fetchAvailableSlots = useCallback(async (doctorId: string) => {
    console.log("Patient.tsx: fetchAvailableSlots called for doctorId:", doctorId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayISO = today.toISOString();

    console.log("Patient.tsx: Calling RPC 'get_truly_available_slots' with parameters:", {
      _doctor_id: doctorId,
      _start_time_gte: startOfTodayISO,
    });

    const { data, error } = await supabase
      .rpc('get_truly_available_slots', {
        _doctor_id: doctorId,
        _start_time_gte: startOfTodayISO,
      });
    
    if (error) {
      console.error("Patient.tsx: Error fetching truly available slots:", error);
      toast({
        title: "Erro ao carregar horários",
        description: `Não foi possível buscar os horários disponíveis. Detalhes: ${error.message}`,
        variant: "destructive",
      });
    } else {
      console.log("Patient.tsx: Truly available slots data received:", data);
    }
    setAvailableSlots(data || []);
  }, [toast]);

  const bookAppointment = useCallback(async (slotId: string, startTime: string, endTime: string) => {
    if (!user || !selectedDoctor) {
      console.log("Patient.tsx: Skipping bookAppointment, user or selectedDoctor is missing.");
      return;
    }

    console.log("Patient.tsx: Attempting to book appointment:", { patient_id: user.id, doctor_id: selectedDoctor, slot_id: slotId, start_time: startTime, end_time: endTime });

    // Step 1: Atomically mark the slot as unavailable ONLY IF it's currently available
    const { data: updatedSlot, error: updateSlotError } = await supabase
      .from('availability_slots')
      .update({ is_available: false })
      .eq('id', slotId)
      .eq('is_available', true) // Crucial: only update if it's currently available
      .select(); // Select the updated row to check if any row was actually updated

    if (updateSlotError) {
      console.error("Patient.tsx: Error updating slot availability:", updateSlotError);
      toast({
        title: "Erro",
        description: "Não foi possível reservar o horário devido a um erro no sistema. Tente novamente.",
        variant: "destructive",
      });
      fetchAvailableSlots(selectedDoctor); // Refresh slots in case of a system error
      return;
    }

    if (!updatedSlot || updatedSlot.length === 0) {
      // This means the slot was already taken by another user or process
      console.warn("Patient.tsx: Attempted to book an already unavailable slot:", slotId);
      toast({
        title: "Horário Indisponível",
        description: "Este horário acabou de ser reservado por outra pessoa. Por favor, escolha outro.",
        variant: "destructive",
      });
      fetchAvailableSlots(selectedDoctor); // Refresh slots to show it's gone
      return;
    }

    // Step 2: If the slot was successfully marked as unavailable, proceed to create the appointment
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: user.id,
        doctor_id: selectedDoctor,
        slot_id: slotId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending'
      })
      .select();

    if (appointmentError) {
      console.error("Patient.tsx: Error booking appointment:", appointmentError);
      // If appointment creation fails, try to revert slot availability
      await supabase
        .from('availability_slots')
        .update({ is_available: true })
        .eq('id', slotId); // Revert only if the slot was successfully marked unavailable by *this* operation
      toast({
        title: "Erro",
        description: appointmentError.message || "Não foi possível agendar a consulta. O horário foi liberado.",
        variant: "destructive",
      });
      fetchAvailableSlots(selectedDoctor); // Refresh slots after potential revert
    } else {
      console.log("Patient.tsx: Appointment booked successfully:", appointmentData);
      toast({
        title: "Consulta Agendada!",
        description: "Sua consulta foi agendada e está aguardando a confirmação do doutor.",
      });
      
      fetchAppointments();
      fetchAvailableSlots(selectedDoctor); // Refresh available slots for the selected doctor
      setSelectedDoctor(null); // Clear selected doctor to reset the view
      setAvailableSlots([]); // Clear available slots
      setActiveTab("appointments");
    }
  }, [user, selectedDoctor, toast, fetchAppointments, fetchAvailableSlots]);

  const handleSignOut = async () => {
    console.log("Patient.tsx: Attempting to sign out.");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Patient.tsx: Error signing out:", error);
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log("Patient.tsx: Signed out successfully. Auth state change listener should handle navigation.");
      toast({
        title: "Sucesso",
        description: "Você foi desconectado(a).",
      });
      // The onAuthStateChange listener will handle navigation to /auth
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Hourglass className="h-4 w-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmada';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  // If user is null after loading, it means they are not authenticated.
  // The useEffect above should have already navigated them, but as a fallback:
  if (!user) {
    return null; // Or a loading spinner, as navigation is in progress
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Portal do Paciente</h1>
            <p className="text-muted-foreground mt-2">
              Bem-vindo(a), {patientProfile?.full_name || user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-nowrap overflow-x-auto scrollbar-hide bg-muted p-1 rounded-lg border md:flex-row md:justify-start">
            <TabsTrigger value="overview" className="px-3 py-2 text-sm whitespace-nowrap md:w-auto md:px-6 md:py-3 md:text-base">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Início
            </TabsTrigger>
            <TabsTrigger value="schedule" className="px-3 py-2 text-sm whitespace-nowrap md:w-auto md:px-6 md:py-3 md:text-base">
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </TabsTrigger>
            <TabsTrigger value="appointments" className="px-3 py-2 text-sm whitespace-nowrap md:w-auto md:px-6 md:py-3 md:text-base">
              <Clock className="h-4 w-4 mr-2" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="online-consultation" className="px-3 py-2 text-sm whitespace-nowrap md:w-auto md:px-6 md:py-3 md:text-base">
              <MessageSquare className="h-4 w-4 mr-2" />
              Consulta Online
            </TabsTrigger>
            <TabsTrigger value="documents" className="px-3 py-2 text-sm whitespace-nowrap md:w-auto md:px-6 md:py-3 md:text-base">
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
                      {doctor.full_name} {doctor.specialty && `(${doctor.specialty})`}
                    </Button>
                  ))}
                  {doctors.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum médico disponível no momento. Por favor, verifique o console para mais detalhes.
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
                        Nenhum horário disponível para este médico.
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
                <CardDescription>Visualize suas consultas agendadas e seus detalhes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg shadow-sm"
                  >
                    <div className="space-y-1 mb-2 sm:mb-0">
                      <p className="font-semibold text-lg">
                        Dr(a). {apt.doctor_profile?.full_name || 'Médico Desconhecido'}
                      </p>
                      {apt.doctor_profile?.specialty && (
                        <p className="text-sm text-muted-foreground">
                          Especialidade: {apt.doctor_profile.specialty}
                        </p>
                      )}
                      <p className="text-md">
                        <Calendar className="inline-block h-4 w-4 mr-1 text-primary" />
                        Data: {format(new Date(apt.start_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-md">
                        <Clock className="inline-block h-4 w-4 mr-1 text-primary" />
                        Horário: {format(new Date(apt.start_time), "HH:mm")} - {format(new Date(apt.end_time), "HH:mm")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(apt.status)}
                      <p className="text-md font-medium">
                        Status: {getStatusText(apt.status)}
                      </p>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma consulta agendada. Agende sua primeira consulta na aba "Agendar"!
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