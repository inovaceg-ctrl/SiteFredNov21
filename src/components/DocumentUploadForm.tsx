import React, { useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { Database } from '../integrations/supabase/types';

interface DocumentUploadFormProps {
  patientId: string;
  doctorId: string; // O ID do doutor para quem o documento será enviado
  onUploadSuccess?: () => void;
}

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({ patientId, doctorId, onUploadSuccess }) => {
  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!session?.user.id) {
      setError('Usuário não autenticado.');
      return;
    }
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo para enviar.');
      return;
    }
    if (!doctorId) {
      setError('Não foi possível identificar o doutor associado. Por favor, tente novamente mais tarde.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const fileExtension = selectedFile.name.split('.').pop();
    const filePath = `${patientId}/${doctorId}/${Date.now()}.${fileExtension}`; // patientId/doctorId/timestamp.ext

    try {
      // 1. Upload do arquivo para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('patient_documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Obter a URL pública do arquivo (ou caminho para acesso via RLS)
      // Para arquivos privados com RLS, não usamos getPublicUrl diretamente para acesso.
      // A URL será construída no backend ou acessada via download assinado.
      // Por enquanto, armazenamos o caminho.

      // 3. Inserir metadados do documento no banco de dados
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          file_name: selectedFile.name,
          file_path: filePath, // Armazena o caminho completo no storage
          description: description,
          uploaded_at: new Date().toISOString(),
          file_type: selectedFile.type,
          file_size: selectedFile.size,
        });

      if (dbError) {
        // Se a inserção no DB falhar, tentar remover o arquivo do storage para evitar lixo
        await supabase.storage.from('patient_documents').remove([filePath]);
        throw dbError;
      }

      setSuccess('Documento enviado com sucesso!');
      setSelectedFile(null);
      setDescription('');
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      console.error('Erro ao enviar documento:', err);
      setError(`Erro ao enviar documento: ${err.message || err.error_description || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">Enviar Novo Documento</h3>
      <div className="mb-4">
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
          Selecionar Arquivo
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600">Arquivo selecionado: {selectedFile.name}</p>
        )}
      </div>
      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Descrição (opcional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Adicione uma breve descrição do documento..."
        ></textarea>
      </div>
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading || !doctorId}
        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
          ${!selectedFile || uploading || !doctorId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
      >
        {uploading ? 'Enviando...' : 'Enviar Documento'}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
    </div>
  );
};

export default DocumentUploadForm;
```
</dyad-write-file>

---

### **Passo 2: Integrar o `DocumentUploadForm` na página `PatientDocumentsPage.tsx`**

Precisaremos buscar o `doctorId` associado ao paciente logado para que o formulário saiba para qual doutor o documento deve ser enviado. Para simplificar, vamos assumir que o paciente tem um `doctor_id` associado em seu perfil ou que podemos obtê-lo de alguma forma (por exemplo, da primeira consulta agendada).

Por enquanto, vamos adicionar um `useState` para `patientDoctorId` e um `useEffect` para simular a busca desse ID. **Você precisará substituir esta lógica pela forma real de obter o ID do doutor associado ao paciente.**

<dyad-edit-file path="src/pages/PatientDocumentsPage.tsx" description="Adicionando o formulário de upload de documentos e listagem">
```tsx
import React, { useState, useEffect } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { Database } from '../integrations/supabase/types';
import DocumentUploadForm from '../components/DocumentUploadForm'; // Importar o novo componente

type Document = Database['public']['Tables']['documents']['Row'];

const PatientDocumentsPage: React.FC = () => {
  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [patientDoctorId, setPatientDoctorId] = useState<string | null>(null); // Estado para o ID do doutor

  const fetchDocuments = async () => {
    if (!session?.user.id) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('patient_id', session.user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar documentos:', error);
      setError('Erro ao carregar documentos.');
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  // Função para buscar o ID do doutor associado ao paciente
  // ESTA É UMA LÓGICA DE EXEMPLO. VOCÊ PRECISA SUBSTITUÍ-LA PELA LÓGICA REAL DO SEU APP.
  const fetchPatientDoctorId = async () => {
    if (!session?.user.id) return;

    // Exemplo: buscar o doutor da primeira consulta agendada ou de um perfil de paciente
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('doctor_id')
      .eq('patient_id', session.user.id)
      .not('doctor_id', 'is', null)
      .order('start_time', { ascending: false })
      .limit(1);

    if (appointmentError) {
      console.error('Erro ao buscar doutor associado:', appointmentError);
      // Tratar erro, talvez definir um doutor padrão ou deixar o campo vazio
    } else if (appointmentData && appointmentData.length > 0) {
      setPatientDoctorId(appointmentData[0].doctor_id);
    } else {
      // Se não houver consultas, talvez buscar de um perfil de paciente ou deixar nulo
      console.warn('Nenhum doutor associado encontrado para o paciente.');
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchPatientDoctorId(); // Chamar a função para buscar o ID do doutor
  }, [session]);

  const handleUploadSuccess = () => {
    fetchDocuments(); // Recarregar a lista de documentos após um upload bem-sucedido
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    if (!session?.user.id) {
      alert('Você precisa estar logado para baixar arquivos.');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('patient_documents')
        .download(filePath);

      if (error) {
        throw error;
      }

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Erro ao baixar arquivo:', err);
      alert(`Erro ao baixar arquivo: ${err.message}`);
    }
  };

  if (!session) {
    return <div className="container mx-auto p-4">Por favor, faça login para ver seus documentos.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Meus Documentos</h2>

      {/* Formulário de Upload */}
      {patientDoctorId ? (
        <div className="mb-8">
          <DocumentUploadForm
            patientId={session.user.id}
            doctorId={patientDoctorId}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      ) : (
        <div className="mb-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
          <p>Não foi possível identificar um doutor associado para enviar documentos. Por favor, agende uma consulta ou entre em contato com o suporte.</p>
        </div>
      )}


      {/* Lista de Documentos */}
      <h3 className="text-xl font-semibold mb-4">Documentos Enviados</h3>
      {loading && <p>Carregando documentos...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && documents.length === 0 && !error && (
        <p>Nenhum documento encontrado.</p>
      )}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border p-4 rounded-lg shadow-sm bg-white">
              <p className="font-semibold text-lg">{doc.file_name}</p>
              {doc.description && <p className="text-gray-600 text-sm mt-1">{doc.description}</p>}
              <p className="text-gray-500 text-xs mt-2">
                Enviado em: {new Date(doc.uploaded_at).toLocaleDateString()}
              </p>
              <button
                onClick={() => handleDownload(doc.file_path!, doc.file_name!)}
                className="mt-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Baixar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientDocumentsPage;
```
</dyad-edit-file>

---

### **Passos Cruciais de Configuração do Backend (MUITO IMPORTANTE!)**

Para que o upload e o download funcionem, você **DEVE** garantir que as configurações do Supabase estejam corretas.

1.  **Verifique a coluna `doctor_id` na tabela `documents`:**
    *   Você já relatou que a coluna `doctor_id` já existe, o que é ótimo. Certifique-se de que ela seja do tipo `UUID` e referencie `auth.users(id)`.

2.  **Habilite RLS para o bucket `patient_documents` (MANUALMENTE NO SUPABASE UI):**
    *   Vá para o painel do Supabase.
    *   Clique em "Storage" na barra lateral.
    *   Clique no bucket `patient_documents`.
    *   Certifique-se de que a opção "Enable Row Level Security (RLS)" esteja **ativada**. Se não estiver, ative-a.

3.  **Re-aplique as políticas de RLS para a tabela `documents` e o bucket `patient_documents`:**
    *   Vá para o "SQL Editor" no Supabase e execute os seguintes comandos para garantir que as políticas de segurança estejam corretas.

    <dyad-execute-sql description="Re-aplicando políticas RLS para a tabela documents">
    -- Remover políticas existentes para evitar conflitos
    DROP POLICY IF EXISTS "Patients can view their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Patients can upload documents for their doctor" ON public.documents;
    DROP POLICY IF EXISTS "Patients can update their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Patients can delete their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Doctors can view documents for their patients or appointments" ON public.documents;
    DROP POLICY IF EXISTS "Doctors can manage documents they are associated with" ON public.documents;

    -- Política para pacientes visualizarem seus próprios documentos
    CREATE POLICY "Patients can view their own documents" ON public.documents
    FOR SELECT TO authenticated USING (auth.uid() = patient_id);

    -- Política para pacientes inserirem documentos, garantindo que o patient_id seja o deles e o doctor_id seja fornecido
    CREATE POLICY "Patients can upload documents for their doctor" ON public.documents
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id AND doctor_id IS NOT NULL);

    -- Política para pacientes atualizarem seus próprios documentos
    CREATE POLICY "Patients can update their own documents" ON public.documents
    FOR UPDATE TO authenticated USING (auth.uid() = patient_id);

    -- Política para pacientes deletarem seus próprios documentos
    CREATE POLICY "Patients can delete their own documents" ON public.documents
    FOR DELETE TO authenticated USING (auth.uid() = patient_id);

    -- Política para doutores visualizarem documentos associados a eles ou a suas consultas
    CREATE POLICY "Doctors can view documents for their patients or appointments" ON public.documents
    FOR SELECT TO authenticated USING (
        (auth.uid() = doctor_id) OR
        (EXISTS (
            SELECT 1
            FROM public.appointments
            WHERE (appointments.id = documents.appointment_id AND appointments.doctor_id = auth.uid())
        ))
    );

    -- Política para doutores gerenciarem documentos que estão associados a eles (opcional, mas útil para gestão)
    CREATE POLICY "Doctors can manage documents they are associated with" ON public.documents
    FOR ALL TO authenticated USING (auth.uid() = doctor_id);
    </dyad-execute-sql>

    <dyad-execute-sql description="Re-aplicando políticas RLS para o bucket 'patient_documents' (storage.objects)">
    -- Remover políticas existentes para evitar conflitos
    DROP POLICY IF EXISTS "Allow authenticated uploads to own folder" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated read of own files" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated delete of own files" ON storage.objects;
    DROP POLICY IF EXISTS "Doctors can view patient documents in storage" ON storage.objects;

    -- Permitir que usuários autenticados façam upload de arquivos para sua própria pasta no bucket 'patient_documents'
    CREATE POLICY "Allow authenticated uploads to own folder" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
      bucket_id = 'patient_documents' AND auth.uid() = owner
    );

    -- Permitir que usuários autenticados visualizem/baixem seus próprios arquivos no bucket 'patient_documents'
    CREATE POLICY "Allow authenticated read of own files" ON storage.objects
    FOR SELECT TO authenticated USING (
      bucket_id = 'patient_documents' AND auth.uid() = owner
    );

    -- Permitir que usuários autenticados deletem seus próprios arquivos no bucket 'patient_documents'
    CREATE POLICY "Allow authenticated delete of own files" ON storage.objects
    FOR DELETE TO authenticated USING (
      bucket_id = 'patient_documents' AND auth.uid() = owner
    );

    -- Permitir que doutores visualizem arquivos de seus pacientes no bucket 'patient_documents'
    -- Esta política se conecta à tabela public.documents para verificar o doctor_id
    CREATE POLICY "Doctors can view patient documents in storage" ON storage.objects
    FOR SELECT TO authenticated USING (
      bucket_id = 'patient_documents' AND EXISTS (
        SELECT 1
        FROM public.documents
        WHERE public.documents.file_path = name AND public.documents.doctor_id = auth.uid()
      )
    );
    </dyad-execute-sql>

4.  **Gerar novamente os tipos do Supabase:**
    *   Após todas as alterações no banco de dados e RLS, é crucial atualizar os tipos. Execute este comando no terminal na raiz do seu projeto:
        ```bash
        supabase gen types typescript --project-id "fusqpjescampwoyazceu" --schema public > src/integrations/supabase/types.ts
        ```
    *   <dyad-command type="restart"></dyad-command>
        Após executar o comando, clique no botão "Restart" acima do chat para reiniciar o aplicativo.

---

**Observação sobre `patientDoctorId`:**

A lógica para `fetchPatientDoctorId` na `PatientDocumentsPage.tsx` é um **exemplo**. Ela tenta buscar o `doctor_id` da última consulta do paciente. Se o seu aplicativo tiver uma forma mais direta de associar um paciente a um doutor (por exemplo, um campo `doctor_id` na tabela `profiles` do paciente), você deve usar essa lógica. Sem um `doctorId` válido, o formulário de upload ficará desabilitado.

Após seguir todos esses passos, o Portal do Paciente deverá ter a opção de enviar arquivos, e esses arquivos serão armazenados e listados corretamente.

Me avise se tiver alguma dúvida ou encontrar algum erro!<think>The user has acknowledged the previous instructions. My next step is to integrate the `PatientDocumentsPage` component into the `Patient.tsx` file, replacing the placeholder content for the "documents" tab. I also need to ensure that the necessary Supabase client and session hooks are correctly imported and used in `PatientDocumentsPage.tsx` and `DocumentUploadForm.tsx`.

**Plan:**
1.  Modify `src/pages/Patient.tsx` to render `PatientDocumentsPage` in the "documents" tab.
2.  Ensure `src/components/DocumentUploadForm.tsx` and `src/pages/PatientDocumentsPage.tsx` have the correct imports for Supabase client and session.
3.  Provide a concise summary of the changes.
4.  Suggest a refresh.

Let's start by modifying `Patient.tsx`.</think>Ótimo! Agora que as configurações de backend estão prontas, vamos integrar a nova página de documentos no Portal do Paciente.

Vou atualizar o arquivo `src/pages/Patient.tsx` para que a guia "Documentos" renderize o componente `PatientDocumentsPage` que acabamos de criar.

<dyad-write path="src/pages/Patient.tsx" description="Integrando a página de documentos do paciente na guia 'Documentos'.">
```tsx
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
import PatientDocumentsPage from "@/components/PatientDocumentsPage"; // Importar o novo componente de documentos

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
            {user && <PatientDocumentsPage />}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Patient;