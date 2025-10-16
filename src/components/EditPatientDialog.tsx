import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { BRAZILIAN_STATES } from "@/lib/brazilian-states";
import { formatWhatsApp, unformatPhone } from "@/lib/format-phone";

interface EditPatientDialogProps {
  patient: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: () => void;
}

export function EditPatientDialog({ patient, open, onOpenChange, onPatientUpdated }: EditPatientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    whatsapp: "",
    street: "",
    street_number: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    birth_date: "",
  });
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [existingNotes, setExistingNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (patient && open) {
      setFormData({
        full_name: patient.full_name || "",
        phone: patient.phone || "",
        whatsapp: patient.whatsapp || "",
        street: patient.street || "",
        street_number: patient.street_number || "",
        neighborhood: patient.neighborhood || "",
        city: patient.city || "",
        state: patient.state || "",
        zip_code: patient.zip_code || "",
        birth_date: patient.birth_date ? format(new Date(patient.birth_date), "yyyy-MM-dd") : "",
      });
      fetchDoctorNotes();
      
      // Load cities if state exists
      if (patient.state) {
        fetchCities(patient.state);
      }
    }
  }, [patient, open]);

  const fetchCities = async (stateCode: string) => {
    setLoadingCities(true);
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios`
      );
      const data = await response.json();
      setCities(data.map((city: any) => city.nome).sort());
    } catch (error) {
      console.error("Error fetching cities:", error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleStateChange = (stateCode: string) => {
    setFormData({ ...formData, state: stateCode, city: "" });
    fetchCities(stateCode);
  };

  const fetchDoctorNotes = async () => {
    if (!patient) return;
    
    setLoadingNotes(true);
    const { data } = await (supabase as any)
      .from('doctor_notes')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false });
    
    setExistingNotes(data || []);
    setLoadingNotes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile
      const { data, error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: unformatPhone(formData.phone),
          whatsapp: unformatPhone(formData.whatsapp),
          street: formData.street,
          street_number: formData.street_number,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          birth_date: formData.birth_date || null,
        })
        .eq('id', patient.id)
        .select();

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      console.log('Profile updated successfully:', data);

      // Add doctor note if there's text
      if (doctorNotes.trim()) {
        const user = await supabase.auth.getUser();
        const { error: notesError } = await (supabase as any)
          .from('doctor_notes')
          .insert({
            patient_id: patient.id,
            doctor_id: user.data.user?.id,
            notes: doctorNotes.trim(),
          });

        if (notesError) {
          console.error('Notes insert error:', notesError);
          throw notesError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Dados do paciente atualizados com sucesso!",
      });

      // Call the callback to refresh patient list
      await onPatientUpdated();
      
      // Close dialog and reset notes
      onOpenChange(false);
      setDoctorNotes("");
    } catch (error: any) {
      console.error('Error updating patient:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dados do Paciente</DialogTitle>
          <DialogDescription>
            Atualize as informações do paciente e adicione observações
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatWhatsApp(e.target.value) })}
                placeholder="32-9-8409-6947"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                placeholder="32-9-8409-6947"
                maxLength={15}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Endereço</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Select value={formData.state} onValueChange={handleStateChange}>
                  <SelectTrigger id="state" className="bg-background">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Select 
                value={formData.city} 
                onValueChange={(value) => setFormData({ ...formData, city: value })}
                disabled={!formData.state || loadingCities}
              >
                <SelectTrigger id="city" className="bg-background">
                  <SelectValue placeholder={loadingCities ? "Carregando cidades..." : "Selecione a cidade"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[300px]">
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Rua/Avenida</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Nome da rua ou avenida"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="street_number">Número</Label>
                <Input
                  id="street_number"
                  value={formData.street_number}
                  onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                  placeholder="123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Nome do bairro"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Adicionar Observação Médica</Label>
            <Textarea
              id="notes"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Escreva suas observações sobre o paciente..."
              rows={4}
            />
          </div>

          {existingNotes.length > 0 && (
            <div className="space-y-2">
              <Label>Observações Anteriores</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {loadingNotes ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  existingNotes.map((note) => (
                    <div key={note.id} className="border-b pb-2 last:border-b-0">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      <p className="text-sm mt-1">{note.notes}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
