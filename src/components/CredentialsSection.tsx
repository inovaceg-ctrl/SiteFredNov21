import React from 'react';
import { Card, CardContent } from "@/components/ui/card"; // Importando Card e CardContent
import { Award } from "lucide-react"; // Importando o ícone Award

const CredentialsSection = () => {
  const credentialText = "Reconhecido 5 vezes em premiações como melhor terapeuta em São Paulo. mãos e Mentes Brilhantes. Profissional do ano destaque de 2023. Premio raimundo nonato , personalidades 2023, 2024 e 2025.";

  return (
    <section id="credentials" className="py-8 px-4 bg-white shadow-sm rounded-lg">
      <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Credenciais e Reconhecimentos</h3>
      <div className="flex items-center justify-center text-center">
        <Card className="w-full max-w-2xl bg-blue-50 border-blue-100 shadow-md">
          <CardContent className="p-6 flex flex-col items-center">
            <Award size={32} className="text-blue-500 mb-4" />
            <p className="font-semibold text-xl text-slate-900 mb-2">
              {credentialText}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CredentialsSection;