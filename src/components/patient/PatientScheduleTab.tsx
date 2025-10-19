import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react"; // Import Loader2

interface PatientScheduleTabProps {
  user: User;
  setActiveTab: (tab: string) => void;
  onAppointmentBooked: () => void;
}

interface DoctorProfile {
  id: string;
  full_name: string;
  specialty?: string;
}

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
}

export const PatientScheduleTab: React.FC<PatientScheduleTabProps> = ({ user, setActiveTab, onAppointmentBooked }) => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true); // New loading state for doctors
  const [loadingSlots, setLoadingSlots] = useState(false); // New loading state for slots
  const [bookingLoading, setBookingLoading] = useState<string | null>(null); // Loading state for individual slot booking
  const { toast } = useToast();

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true); // Set loading true
    const { data: doctorsData, error } = await supabase
      .rpc('get_doctors_public');
    
    if (error) {
      console.error("PatientScheduleTab: Error fetching doctors:", error);
      toast({
        title: "Erro ao carregar médicos",
        description: `Não foi possível buscar os médicos. Detalhes: ${error.message}`,
        variant: "destructive",
      });
      setDoctors([]);
    } else if (doctorsData && doctorsData.length > 0) {
      setDoctors(doctorsData);
    } else {
      setDoctors([]);
      toast({
        title: "Nenhum médico disponível",
        description: "Não há médicos cadastrados ou disponíveis para agendamento no momento.",
        variant: "default",
      });
    }
    setLoadingDoctors(false); // Set loading false
  }, [toast]);

  const fetchAvailableSlots = useCallback(async (doctorId: string) => {
    setLoadingSlots(true); // Set loading true
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayISO = today.toISOString();

    const { data, error } = await supabase
      .rpc('get_truly_available_slots', {
        _doctor_id: doctorId,
        _start_time_gte: startOfTodayISO,
      });
    
    if (error) {
      console.error("PatientScheduleTab: Error fetching truly available slots:", error);
      toast({
        title: "Erro ao carregar horários",
        description: `Não foi possível buscar os horários disponíveis. Detalhes: ${error.message}`,
        variant: "destructive",
      });
    } else {
      setAvailableSlots(data || []);
    }
    setLoadingSlots(false); // Set loading false
  }, [toast]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchAvailableSlots(selectedDoctor);

      // Setup Realtime subscription for availability slots
      const channel = supabase
        .channel(`public:availability_slots:doctor_id=eq.${selectedDoctor}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'availability_slots',
            filter: `doctor_id=eq.${selectedDoctor}`,
          },
          (payload) => {
            const updatedSlot = payload.new as AvailabilitySlot & { is_available: boolean };
            console.log("Realtime update for slot:", updatedSlot);
            // If a slot becomes unavailable, remove it from the list
            // If a slot becomes available, add it (or update if already there)
            setAvailableSlots(prevSlots => {
              if (updatedSlot.is_available) {
                // Add or update if it's now available and not already in the list
                if (!prevSlots.some(slot => slot.id === updatedSlot.id)) {
                  return [...prevSlots, updatedSlot].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                }
                return prevSlots.map(slot => slot.id === updatedSlot.id ? updatedSlot : slot);
              } else {
                // Remove if it's no longer available
                return prevSlots.filter(slot => slot.id !== updatedSlot.id);
              }
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctor, fetchAvailableSlots]);

  const bookAppointment = useCallback(async (slotId: string, startTime: string, endTime: string) => {
    if (!user || !selectedDoctor) {
      toast({
        title: "Erro",
        description: "Usuário ou médico não selecionado.",
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(slotId); // Set loading for this specific slot

    // Optimistic UI update: Immediately remove the slot from the UI
    const originalAvailableSlots = availableSlots;
    setAvailableSlots(prev => prev.filter(slot => slot.id !== slotId));

    try {
      // Step 1: Atomically mark the slot as unavailable ONLY IF it's currently available
      const { data: updatedSlot, error: updateSlotError } = await supabase
        .from('availability_slots')
        .update({ is_available: false })
        .eq('id', slotId)
        .eq('is_available', true)
        .select();

      if (updateSlotError) {
        throw updateSlotError; // Throw to be caught by the catch block
      }

      if (!updatedSlot || updatedSlot.length === 0) {
        // This means the slot was already unavailable or didn't exist
        throw new Error("Este horário acabou de ser reservado por outra pessoa. Por favor, escolha outro.");
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
        throw appointmentError; // Throw to be caught by the catch block
      }

      toast({
        title: "Consulta Agendada!",
        description: "Sua consulta foi agendada e está aguardando a confirmação do doutor.",
      });
      onAppointmentBooked(); // Notify parent to refresh appointments
      setActiveTab("appointments");
      setSelectedDoctor(null); // Clear selected doctor to reset the view
      setAvailableSlots([]); // Clear available slots
    } catch (error: any) {
      console.error("PatientScheduleTab: Error booking appointment:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível agendar a consulta. O horário foi liberado.",
        variant: "destructive",
      });

      // Revert optimistic update: Add the slot back if booking failed
      setAvailableSlots(originalAvailableSlots);

      // Attempt to revert slot availability in DB if appointment creation failed
      if (error.message !== "Este horário acabou de ser reservado por outra pessoa. Por favor, escolha outro.") {
        // Only revert if the error wasn't due to the slot already being taken
        await supabase
          .from('availability_slots')
          .update({ is_available: true })
          .eq('id', slotId);
      }
      fetchAvailableSlots(selectedDoctor); // Re-fetch to ensure consistency
    } finally {
      setBookingLoading(null); // Clear loading state
    }
  }, [user, selectedDoctor, toast, availableSlots, fetchAvailableSlots, onAppointmentBooked, setActiveTab]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Selecione um Médico</CardTitle>
          <CardDescription>Escolha o médico para ver os horários disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {loadingDoctors ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            doctors.map((doctor) => (
              <Button
                key={doctor.id}
                variant={selectedDoctor === doctor.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => {
                  setSelectedDoctor(doctor.id);
                }}
              >
                {doctor.full_name} {doctor.specialty && `(${doctor.specialty})`}
              </Button>
            ))
          )}
          {!loadingDoctors && doctors.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              Nenhum médico disponível no momento.
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
            {loadingSlots ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              availableSlots.map((slot) => (
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
                    disabled={bookingLoading === slot.id} // Disable button while booking this slot
                  >
                    {bookingLoading === slot.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Agendar"
                    )}
                  </Button>
                </div>
              ))
            )}
            {!loadingSlots && availableSlots.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Nenhum horário disponível para este médico.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};